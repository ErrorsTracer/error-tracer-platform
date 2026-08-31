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

It listens on `ERRORS_APP_PORT` (4974 by default). In production, route the
existing public `/v0.1/errors/ingest` path to this service.
