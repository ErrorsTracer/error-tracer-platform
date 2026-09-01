use crate::model::ErrorEvent;
use anyhow::Result;
use sqlx::{PgPool, Postgres, QueryBuilder};
use std::collections::{HashMap, HashSet};
use uuid::Uuid;

pub async fn persist_batch(pool: &PgPool, events: &[ErrorEvent]) -> Result<usize> {
    if events.is_empty() {
        return Ok(0);
    }
    let mut unique = HashMap::with_capacity(events.len());
    for event in events {
        unique.entry(event.id).or_insert(event);
    }
    let events: Vec<_> = unique.into_values().collect();
    let mut transaction = pool.begin().await?;

    let mut insert = QueryBuilder::<Postgres>::new(
        r#"INSERT INTO "errors-logs" (
        id, "applicationId", error, stack, environment, framework, language, runtime,
        level, name, fingerprint, handled, timestamp, release, url, transaction,
        "user", request, tags, extra, breadcrumbs, contexts, href, client,
        "additionalData", repeated, "createdAt", "updatedAt") "#,
    );
    insert.push_values(&events, |mut row, event| {
        row.push_bind(event.id)
            .push_bind(event.application_id)
            .push_bind(&event.error)
            .push_bind(&event.stack)
            .push_bind(&event.environment)
            .push_bind(&event.framework)
            .push_bind(&event.language)
            .push_bind(&event.runtime)
            .push_bind(&event.level)
            .push_bind(&event.name)
            .push_bind(&event.fingerprint)
            .push_bind(event.handled)
            .push_bind(event.timestamp)
            .push_bind(&event.release)
            .push_bind(&event.url)
            .push_bind(&event.transaction)
            .push_bind(&event.user)
            .push_bind(&event.request)
            .push_bind(&event.tags)
            .push_bind(&event.extra)
            .push_bind(&event.breadcrumbs)
            .push_bind(&event.contexts)
            .push_bind(&event.href)
            .push_bind(&event.client)
            .push_bind(&event.additional_data)
            .push_bind(1_i32)
            .push("CURRENT_TIMESTAMP")
            .push("CURRENT_TIMESTAMP");
    });
    insert.push(" ON CONFLICT (id) DO NOTHING RETURNING id");
    let inserted_ids: Vec<Uuid> = insert
        .build_query_scalar()
        .fetch_all(&mut *transaction)
        .await?;
    if inserted_ids.is_empty() {
        transaction.commit().await?;
        return Ok(0);
    }

    let inserted: HashSet<_> = inserted_ids.iter().copied().collect();
    let mut usage: HashMap<Uuid, (Uuid, i64, i64)> = HashMap::new();
    for event in events
        .into_iter()
        .filter(|event| inserted.contains(&event.id))
    {
        usage
            .entry(event.application_id)
            .and_modify(|value| {
                value.1 += event.payload_size;
                value.2 += 1;
            })
            .or_insert((event.owner_id, event.payload_size, 1));
    }

    let mut usage_insert = QueryBuilder::<Postgres>::new(
        r#"INSERT INTO usage (id, "userId", "applicationId", "totalErrorBytes", "totalErrorCount", "createdAt", "updatedAt") "#,
    );
    usage_insert.push_values(
        usage,
        |mut row, (application_id, (owner_id, bytes, count))| {
            row.push_bind(Uuid::new_v4())
                .push_bind(owner_id)
                .push_bind(application_id)
                .push_bind(bytes)
                .push_bind(count)
                .push("CURRENT_TIMESTAMP")
                .push("CURRENT_TIMESTAMP");
        },
    );
    usage_insert.push(
        r#" ON CONFLICT ("applicationId") DO UPDATE SET
        "userId" = EXCLUDED."userId",
        "totalErrorBytes" = usage."totalErrorBytes" + EXCLUDED."totalErrorBytes",
        "totalErrorCount" = usage."totalErrorCount" + EXCLUDED."totalErrorCount",
        "updatedAt" = CURRENT_TIMESTAMP"#,
    );
    usage_insert.build().execute(&mut *transaction).await?;
    transaction.commit().await?;
    Ok(inserted_ids.len())
}
