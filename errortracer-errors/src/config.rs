use anyhow::{Context, Result};
use sqlx::PgPool;
use sqlx::postgres::{PgConnectOptions, PgPoolOptions};
use std::{env, str::FromStr, time::Duration};

#[derive(Clone)]
pub struct Config {
    pub port: u16,
    pub origin: String,
    pub kafka_brokers: String,
    pub kafka_topic: String,
    pub kafka_group: String,
    pub kafka_partitions: i32,
    pub kafka_replication_factor: i32,
    pub batch_max_events: usize,
    pub batch_max_wait: Duration,
    pub batch_min_bytes: usize,
    pub batch_max_bytes: usize,
    pub request_max_bytes: usize,
    pub database: PgConnectOptions,
}

impl Config {
    pub fn from_env() -> Result<Self> {
        dotenvy::dotenv().ok();
        let database = PgConnectOptions::new()
            .host(&required("DB_HOST")?)
            .port(parse("DB_PORT", 5432)?)
            .username(&required("DB_USER")?)
            .password(&required("DB_PASSWORD")?)
            .database(&required("DB_NAME")?);

        Ok(Self {
            port: parse("ERRORS_APP_PORT", 4974)?,
            origin: env::var("ORIGIN").unwrap_or_else(|_| "http://localhost:3000".into()),
            kafka_brokers: env::var("KAFKA_BROKERS").unwrap_or_else(|_| "localhost:9092".into()),
            kafka_topic: env::var("KAFKA_ERROR_TOPIC")
                .unwrap_or_else(|_| "errortracer.error-events.v1".into()),
            kafka_group: env::var("KAFKA_CONSUMER_GROUP")
                .unwrap_or_else(|_| "errortracer-error-writers-v2".into()),
            kafka_partitions: parse("KAFKA_NUM_PARTITIONS", 3)?,
            kafka_replication_factor: parse("KAFKA_REPLICATION_FACTOR", 1)?,
            batch_max_events: parse("KAFKA_BATCH_MAX_EVENTS", 500)?,
            batch_max_wait: Duration::from_millis(parse("KAFKA_BATCH_MAX_WAIT_MS", 1000)?),
            batch_min_bytes: parse("KAFKA_BATCH_MIN_BYTES", 32_768)?,
            batch_max_bytes: parse("KAFKA_BATCH_MAX_BYTES", 1_048_576)?,
            request_max_bytes: parse("ERRORS_REQUEST_MAX_BYTES", 1_048_576)?,
            database,
        })
    }

    pub async fn pool(&self) -> Result<PgPool> {
        PgPoolOptions::new()
            .min_connections(parse("DB_POOL_MIN", 2)?)
            .max_connections(parse("DB_POOL_MAX", 20)?)
            .acquire_timeout(Duration::from_secs(5))
            .connect_with(self.database.clone())
            .await
            .context("failed to connect to PostgreSQL")
    }
}

fn required(name: &str) -> Result<String> {
    env::var(name).with_context(|| format!("{name} is required"))
}

fn parse<T>(name: &str, default: T) -> Result<T>
where
    T: FromStr,
    T::Err: std::error::Error + Send + Sync + 'static,
{
    match env::var(name) {
        Ok(value) => value.parse().with_context(|| format!("invalid {name}")),
        Err(_) => Ok(default),
    }
}
