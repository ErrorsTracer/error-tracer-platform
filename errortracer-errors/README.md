# ErrorTracer ingestion service

Standalone NestJS application extracted from `errortracer-backend`. It owns the
existing ingestion endpoint:

```text
POST /v0.1/errors/ingest
X-ErrorTracer-Key: <application key>
```

The service shares the backend PostgreSQL schema and deliberately disables
Sequelize schema synchronization. Run database migrations from
`errortracer-backend` before starting this service.

```bash
bun install
bun run start:dev
```

It listens on `ERRORS_APP_PORT` (4974 by default). Accepted events are published
to Kafka and a consumer writes each Kafka fetch batch to PostgreSQL in one
transaction. In production, route the
existing public `/v0.1/errors/ingest` path to this service.

Kafka configuration:

- `KAFKA_BROKERS` (default `localhost:9092`): comma-separated broker addresses
- `KAFKA_ERROR_TOPIC` (default `errortracer.error-events.v1`)
- `KAFKA_NUM_PARTITIONS` (default `3`) and `KAFKA_REPLICATION_FACTOR` (default `1`)
- `KAFKA_CONSUMER_GROUP` (default `errortracer-error-writers-v1`)
- `KAFKA_BATCH_MIN_BYTES` (default `32768`): target fetch size before a database write
- `KAFKA_BATCH_MAX_BYTES` (default `1048576`): maximum bytes fetched per partition
- `KAFKA_BATCH_MAX_WAIT_MS` (default `1000`): maximum wait to fill a batch
