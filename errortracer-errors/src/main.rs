mod api;
mod config;
mod db;
mod kafka;
mod model;
mod sanitize;

use anyhow::{Context, Result, bail};
use api::AppState;
use axum::{
    Router,
    routing::{get, post},
};
use config::Config;
use http::{HeaderName, HeaderValue, Method, header::CONTENT_TYPE};
use std::{net::SocketAddr, sync::Arc};
use tokio_util::sync::CancellationToken;
use tower_http::{cors::CorsLayer, limit::RequestBodyLimitLayer, trace::TraceLayer};
use tracing::info;
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() -> Result<()> {
    init_logging();
    let config = Config::from_env()?;
    let pool = config.pool().await?;
    kafka::provision_topic(&config).await?;
    let publisher = kafka::EventPublisher::new(&config)?;
    let state = Arc::new(AppState {
        pool: pool.clone(),
        publisher,
    });
    let origin: HeaderValue = config
        .origin
        .parse()
        .context("ORIGIN must be a valid HTTP origin")?;
    let app = Router::new()
        .route("/health", get(api::health))
        .route("/v0.1/errors/ingest", post(api::ingest))
        .route("/errors/ingest", post(api::ingest))
        .with_state(state)
        .layer(RequestBodyLimitLayer::new(config.request_max_bytes))
        .layer(
            CorsLayer::new()
                .allow_origin(origin)
                .allow_credentials(true)
                .allow_methods([Method::POST, Method::OPTIONS])
                .allow_headers([
                    CONTENT_TYPE,
                    HeaderName::from_static("x-errortracer-key"),
                ]),
        )
        .layer(TraceLayer::new_for_http());

    let address = SocketAddr::from(([0, 0, 0, 0], config.port));
    let listener = tokio::net::TcpListener::bind(address).await?;
    info!(%address, "Rust ingestion service listening");
    let shutdown = CancellationToken::new();
    let server_shutdown = shutdown.clone();
    let mut server = tokio::spawn(async move {
        axum::serve(listener, app)
            .with_graceful_shutdown(server_shutdown.cancelled_owned())
            .await
    });
    let consumer_shutdown = shutdown.clone();
    let mut consumer = tokio::spawn(kafka::consume(config, pool, consumer_shutdown));
    tokio::select! {
        result = &mut server => {
            shutdown.cancel();
            result.context("HTTP server task failed")?.context("HTTP server failed")?;
        }
        result = &mut consumer => {
            shutdown.cancel();
            match result {
                Ok(Ok(())) => bail!("Kafka consumer stopped unexpectedly"),
                Ok(Err(error)) => return Err(error.context("Kafka consumer failed")),
                Err(error) => return Err(error.into()),
            }
        }
        _ = shutdown_signal() => {
            info!("shutdown signal received");
            shutdown.cancel();
            server.await.context("HTTP server task failed during shutdown")?
                .context("HTTP server failed during shutdown")?;
            if tokio::time::timeout(std::time::Duration::from_secs(15), &mut consumer).await.is_err() {
                consumer.abort();
            }
        }
    }
    if !consumer.is_finished() {
        consumer.abort();
    }
    Ok(())
}

async fn shutdown_signal() {
    #[cfg(unix)]
    {
        use tokio::signal::unix::{SignalKind, signal};
        let mut terminate = signal(SignalKind::terminate()).expect("failed to install SIGTERM handler");
        tokio::select! {
            _ = tokio::signal::ctrl_c() => {},
            _ = terminate.recv() => {},
        }
    }
    #[cfg(not(unix))]
    tokio::signal::ctrl_c().await.expect("failed to install Ctrl-C handler");
}

fn init_logging() {
    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info,rdkafka=warn,tower_http=info"));
    let builder = tracing_subscriber::fmt().with_env_filter(filter);
    if std::env::var("LOG_FORMAT").as_deref() == Ok("pretty") {
        builder.compact().init();
    } else {
        builder.json().init();
    }
}
