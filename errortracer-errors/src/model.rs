use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IngestError {
    pub project_id: Option<Uuid>,
    pub environment: Option<String>,
    pub framework: Option<String>,
    pub language: Option<String>,
    pub runtime: Option<String>,
    pub level: Option<String>,
    pub message: Option<String>,
    pub error: Option<String>,
    pub name: Option<String>,
    pub stack: Option<String>,
    pub fingerprint: Option<String>,
    pub handled: Option<bool>,
    pub timestamp: Option<DateTime<Utc>>,
    pub release: Option<String>,
    pub server_name: Option<String>,
    pub url: Option<String>,
    pub transaction: Option<String>,
    pub user: Option<Value>,
    pub request: Option<Value>,
    pub tags: Option<Value>,
    pub extra: Option<Value>,
    pub breadcrumbs: Option<Vec<Value>>,
    pub contexts: Option<Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ErrorEvent {
    pub id: Uuid,
    pub application_id: Uuid,
    pub owner_id: Uuid,
    pub payload_size: i64,
    pub error: String,
    pub stack: Option<String>,
    pub environment: String,
    pub framework: Option<String>,
    pub language: Option<String>,
    pub runtime: Option<String>,
    pub level: String,
    pub name: Option<String>,
    pub fingerprint: String,
    pub handled: Option<bool>,
    pub timestamp: DateTime<Utc>,
    pub release: Option<String>,
    pub url: Option<String>,
    pub transaction: Option<String>,
    pub user: Option<Value>,
    pub request: Option<Value>,
    pub tags: Option<Value>,
    pub extra: Value,
    pub breadcrumbs: Option<Value>,
    pub contexts: Option<Value>,
    pub href: Option<String>,
    pub client: Option<String>,
    pub additional_data: Option<String>,
}

#[derive(Serialize)]
pub struct Accepted {
    pub id: Uuid,
    pub status: &'static str,
}
