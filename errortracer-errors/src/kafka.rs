use crate::{config::Config, db::persist_batch, model::ErrorEvent};
use anyhow::{Context, Result, bail};
use futures::StreamExt;
use rdkafka::{
    ClientConfig, Message, Offset, TopicPartitionList,
    admin::{AdminClient, AdminOptions, NewTopic, TopicReplication},
    client::DefaultClientContext,
    consumer::{CommitMode, Consumer, StreamConsumer},
    error::RDKafkaErrorCode,
    message::OwnedMessage,
    producer::{FutureProducer, FutureRecord},
    util::Timeout,
};
use sqlx::PgPool;
use std::{collections::HashMap, sync::Arc, time::Duration};
use tokio::time::{Instant, sleep};
use tokio_util::sync::CancellationToken;
use tracing::{error, info, warn};

#[derive(Clone)]
pub struct EventPublisher {
    producer: FutureProducer,
    topic: Arc<str>,
}

impl EventPublisher {
    pub fn new(config: &Config) -> Result<Self> {
        let producer = common_client(config)
            .set("message.timeout.ms", "10000")
            .set("linger.ms", "5")
            .set("batch.num.messages", "10000")
            .set("compression.type", "lz4")
            .set("acks", "all")
            .create()
            .context("failed to create Kafka producer")?;
        Ok(Self {
            producer,
            topic: Arc::from(config.kafka_topic.as_str()),
        })
    }

    pub async fn publish(&self, event: &ErrorEvent) -> Result<()> {
        let payload = serde_json::to_vec(event)?;
        self.producer
            .send(
                FutureRecord::to(&self.topic)
                    .key(&event.application_id.to_string())
                    .payload(&payload),
                Timeout::After(Duration::from_secs(10)),
            )
            .await
            .map_err(|(error, _)| error)
            .context("failed to publish error event")?;
        Ok(())
    }
}

pub async fn provision_topic(config: &Config) -> Result<()> {
    let admin: AdminClient<DefaultClientContext> = common_client(config)
        .create()
        .context("failed to create Kafka admin client")?;
    let metadata = admin
        .inner()
        .fetch_metadata(None, Timeout::After(Duration::from_secs(10)))?;
    if metadata
        .topics()
        .iter()
        .any(|topic| topic.name() == config.kafka_topic)
    {
        wait_for_leaders(&admin, config).await?;
        return Ok(());
    }

    let topic = NewTopic::new(
        &config.kafka_topic,
        config.kafka_partitions,
        TopicReplication::Fixed(config.kafka_replication_factor),
    );
    let results = admin
        .create_topics(
            &[topic],
            &AdminOptions::new().operation_timeout(Some(Duration::from_secs(10))),
        )
        .await?;
    for result in results {
        if let Err((name, code)) = result
            && code != RDKafkaErrorCode::TopicAlreadyExists
        {
            bail!("failed to create Kafka topic {name}: {code:?}");
        }
    }
    wait_for_leaders(&admin, config).await
}

async fn wait_for_leaders(
    admin: &AdminClient<DefaultClientContext>,
    config: &Config,
) -> Result<()> {
    for _ in 0..30 {
        let metadata = admin.inner().fetch_metadata(
            Some(&config.kafka_topic),
            Timeout::After(Duration::from_secs(2)),
        )?;
        if let Some(topic) = metadata.topics().first()
            && !topic.partitions().is_empty()
            && topic
                .partitions()
                .iter()
                .all(|partition| partition.leader() >= 0)
        {
            info!(topic = %config.kafka_topic, partitions = topic.partitions().len(), "Kafka topic ready");
            return Ok(());
        }
        sleep(Duration::from_millis(200)).await;
    }
    bail!("Kafka topic {} has no partition leader", config.kafka_topic)
}

pub async fn consume(config: Config, pool: PgPool, shutdown: CancellationToken) -> Result<()> {
    let consumer: StreamConsumer = common_client(&config)
        .set("group.id", &config.kafka_group)
        .set("enable.auto.commit", "false")
        .set("enable.auto.offset.store", "false")
        .set("auto.offset.reset", "earliest")
        .set("session.timeout.ms", "10000")
        .set("heartbeat.interval.ms", "3000")
        .set("fetch.min.bytes", config.batch_min_bytes.to_string())
        .set(
            "fetch.wait.max.ms",
            config.batch_max_wait.as_millis().to_string(),
        )
        .set("fetch.max.bytes", config.batch_max_bytes.to_string())
        .set(
            "max.partition.fetch.bytes",
            config.batch_max_bytes.to_string(),
        )
        .create()
        .context("failed to create Kafka consumer")?;
    consumer.subscribe(&[&config.kafka_topic])?;
    info!(group = %config.kafka_group, "Kafka consumer started");

    let mut stream = consumer.stream();
    let mut batch: Vec<OwnedMessage> = Vec::with_capacity(config.batch_max_events);
    let mut deadline = Instant::now() + config.batch_max_wait;

    loop {
        tokio::select! {
            _ = shutdown.cancelled() => break,
            message = stream.next() => match message {
                Some(Ok(message)) => {
                    batch.push(message.detach());
                    if batch.len() == 1 { deadline = Instant::now() + config.batch_max_wait; }
                    if batch.len() >= config.batch_max_events {
                        flush(&consumer, &pool, &batch).await?;
                        batch.clear();
                    }
                }
                Some(Err(error)) => warn!(%error, "Kafka receive error"),
                None => bail!("Kafka consumer stream ended"),
            },
            _ = tokio::time::sleep_until(deadline), if !batch.is_empty() => {
                flush(&consumer, &pool, &batch).await?;
                batch.clear();
            }
        }
    }
    if !batch.is_empty() {
        flush(&consumer, &pool, &batch).await?;
    }
    consumer.unsubscribe();
    Ok(())
}

async fn flush(consumer: &StreamConsumer, pool: &PgPool, messages: &[OwnedMessage]) -> Result<()> {
    let mut events = Vec::with_capacity(messages.len());
    for message in messages {
        match message
            .payload()
            .and_then(|payload| serde_json::from_slice::<ErrorEvent>(payload).ok())
        {
            Some(event) => events.push(event),
            None => error!(
                topic = message.topic(),
                partition = message.partition(),
                offset = message.offset(),
                "discarding malformed Kafka event"
            ),
        }
    }

    let mut delay = Duration::from_millis(100);
    loop {
        match persist_batch(pool, &events).await {
            Ok(inserted) => {
                info!(received = messages.len(), inserted, "persisted Kafka batch");
                break;
            }
            Err(error) => {
                error!(%error, retry_ms = delay.as_millis(), "database batch failed; retaining Kafka offsets");
                sleep(delay).await;
                delay = (delay * 2).min(Duration::from_secs(10));
            }
        }
    }

    let mut highest: HashMap<(&str, i32), i64> = HashMap::new();
    for message in messages {
        highest
            .entry((message.topic(), message.partition()))
            .and_modify(|offset| *offset = (*offset).max(message.offset()))
            .or_insert(message.offset());
    }
    let mut offsets = TopicPartitionList::new();
    for ((topic, partition), offset) in highest {
        offsets.add_partition_offset(topic, partition, Offset::Offset(offset + 1))?;
    }
    consumer.commit(&offsets, CommitMode::Sync)?;
    Ok(())
}

fn common_client(config: &Config) -> ClientConfig {
    let mut client = ClientConfig::new();
    client
        .set("bootstrap.servers", &config.kafka_brokers)
        .set("client.id", "errortracer-errors-rust")
        .set("allow.auto.create.topics", "false")
        .set("socket.keepalive.enable", "true");
    client
}
