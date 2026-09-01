use crate::{
    kafka::EventPublisher,
    model::{Accepted, ErrorEvent, IngestError},
    sanitize,
};
use axum::{
    Json,
    body::Bytes,
    extract::State,
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Response},
};
use chrono::Utc;
use serde::Serialize;
use serde_json::Value;
use sqlx::PgPool;
use std::sync::Arc;
use tracing::error;
use uuid::Uuid;

const APP_KEY_INVALID: &str = "errors.app.keyInvalid";
const APP_ORGANIZATION_MISMATCH: &str = "errors.app.organizationMismatch";
const APP_PRODUCTION_DISABLED: &str = "errors.app.productionDisabled";
const AUTH_REQUIRED: &str = "errors.auth.required";
const VALIDATION_FAILED: &str = "errors.validation.failed";

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub publisher: EventPublisher,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ErrorBody<'a> {
    status_code: u16,
    message: &'a str,
}

pub(crate) struct ApiError(StatusCode, &'static str);

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let body = ErrorBody {
            status_code: self.0.as_u16(),
            message: self.1,
        };
        (self.0, Json(body)).into_response()
    }
}

pub async fn health() -> StatusCode {
    StatusCode::NO_CONTENT
}

pub async fn ingest(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    body: Bytes,
) -> Result<impl IntoResponse, ApiError> {
    let key = headers
        .get("x-errortracer-key")
        .and_then(|value| value.to_str().ok())
        .filter(|value| !value.is_empty())
        .ok_or(ApiError(StatusCode::UNAUTHORIZED, AUTH_REQUIRED))?;
    let data: IngestError = serde_json::from_slice(&body)
        .map_err(|_| ApiError(StatusCode::BAD_REQUEST, VALIDATION_FAILED))?;
    validate(&data)?;

    let credential = sqlx::query_as::<_, (Uuid, bool, Uuid)>(
        r#"
        SELECT e."applicationId", e."isEnabled", a."ownerId"
        FROM environments e
        INNER JOIN applications a ON a.id = e."applicationId"
        WHERE e."appKey" = $1 AND a.status = 'active'
        LIMIT 1
    "#,
    )
    .bind(key)
    .fetch_optional(&state.pool)
    .await
    .map_err(internal)?
    .ok_or(ApiError(StatusCode::UNAUTHORIZED, APP_KEY_INVALID))?;
    let (application_id, enabled, owner_id) = credential;
    if data.project_id.is_some_and(|id| id != application_id) {
        return Err(ApiError(StatusCode::FORBIDDEN, APP_ORGANIZATION_MISMATCH));
    }
    if !enabled {
        return Err(ApiError(StatusCode::BAD_REQUEST, APP_PRODUCTION_DISABLED));
    }

    let message = data
        .message
        .as_deref()
        .or(data.error.as_deref())
        .unwrap()
        .to_owned();
    let environment = data
        .environment
        .clone()
        .unwrap_or_else(|| "production".into());
    let fingerprint = data.fingerprint.clone().unwrap_or_else(|| {
        sanitize::fingerprint(
            &application_id.to_string(),
            &environment,
            data.name.as_deref(),
            &message,
            data.stack.as_deref(),
            data.framework.as_deref(),
            data.runtime.as_deref(),
        )
    });
    let mut user = data.user.clone();
    let mut request = data.request.clone();
    let mut tags = data.tags.clone();
    let mut breadcrumbs = data.breadcrumbs.clone().map(Value::Array);
    let mut contexts = data.contexts.clone();
    for value in user
        .iter_mut()
        .chain(request.iter_mut())
        .chain(tags.iter_mut())
        .chain(contexts.iter_mut())
    {
        sanitize::sanitize(value);
    }
    if let Some(value) = breadcrumbs.as_mut() {
        sanitize::sanitize(value);
    }
    let mut extra = data
        .extra
        .clone()
        .and_then(|value| value.as_object().cloned())
        .unwrap_or_default();
    if let Some(server_name) = &data.server_name {
        extra.insert("serverName".into(), Value::String(server_name.clone()));
    }
    let mut extra = Value::Object(extra);
    sanitize::sanitize(&mut extra);

    let id = Uuid::new_v4();
    let event = ErrorEvent {
        id,
        application_id,
        owner_id,
        payload_size: body.len() as i64,
        error: message,
        stack: data.stack,
        environment,
        framework: data.framework.clone(),
        language: data.language,
        runtime: data.runtime,
        level: data.level.unwrap_or_else(|| "error".into()),
        name: data.name,
        fingerprint,
        handled: data.handled,
        timestamp: data.timestamp.unwrap_or_else(Utc::now),
        release: data.release,
        url: data.url.clone(),
        transaction: data.transaction,
        user,
        request,
        tags,
        extra,
        breadcrumbs,
        contexts,
        href: data.url,
        client: data.framework,
        additional_data: None,
    };
    state.publisher.publish(&event).await.map_err(internal)?;
    Ok((
        StatusCode::ACCEPTED,
        Json(Accepted {
            id,
            status: "accepted",
        }),
    ))
}

fn validate(data: &IngestError) -> Result<(), ApiError> {
    let message_valid = data
        .message
        .as_ref()
        .is_some_and(|value| !value.trim().is_empty());
    let error_valid = data
        .error
        .as_ref()
        .is_some_and(|value| !value.trim().is_empty());
    if !message_valid && !error_valid {
        return Err(ApiError(StatusCode::BAD_REQUEST, VALIDATION_FAILED));
    }
    if data.runtime.as_ref().is_some_and(|value| {
        ![
            "browser", "server", "mobile", "desktop", "worker", "unknown",
        ]
        .contains(&value.as_str())
    }) {
        return Err(ApiError(StatusCode::BAD_REQUEST, VALIDATION_FAILED));
    }
    if data.level.as_ref().is_some_and(|value| {
        !["fatal", "error", "warning", "info", "debug", "critical"].contains(&value.as_str())
    }) {
        return Err(ApiError(StatusCode::BAD_REQUEST, VALIDATION_FAILED));
    }
    for value in [
        &data.user,
        &data.request,
        &data.tags,
        &data.extra,
        &data.contexts,
    ]
    .into_iter()
    .flatten()
    {
        if !value.is_object() {
            return Err(ApiError(StatusCode::BAD_REQUEST, VALIDATION_FAILED));
        }
    }
    Ok(())
}

fn internal(error: impl std::fmt::Display) -> ApiError {
    error!(%error, "ingestion request failed");
    ApiError(StatusCode::INTERNAL_SERVER_ERROR, "errors.internal")
}
