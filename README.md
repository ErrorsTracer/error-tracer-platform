# ErrorTracer

ErrorTracer is a self-hosted, open-source error logging platform created by Elsiddig Ahmed. It helps teams capture, inspect, and manage application errors from one dashboard.

If you prefer a hosted SaaS version so you do not have to manage servers, databases, updates, or deployments, visit [errortracer.io](https://errortracer.io).

## Features

- Self-hosted error logging dashboard
- Backend API for authentication, applications, users, and error ingestion
- PostgreSQL persistence
- Docker Compose setup for production and realtime development
- Environment-based configuration from the root project `.env`

## Tech Stack

- Frontend: Next.js, React, TypeScript, Tailwind CSS, Radix UI
- Backend: NestJS, TypeScript, Sequelize
- Database: PostgreSQL
- Runtime and package manager: Bun
- Infrastructure: Docker and Docker Compose

## Project Structure

```text
.
├── compose.yml                 # Production Docker Compose stack
├── compose.dev.yml             # Development Docker Compose override
├── .env.example                # Example environment configuration
├── errortracer-backend/        # NestJS backend API
└── errortracer-frontend/       # Next.js frontend dashboard
```

## Prerequisites

- Docker
- Docker Compose

You do not need to install Bun, Node.js, PostgreSQL, or project dependencies on your host machine when using Docker Compose.

## Quick Start

1. Create your environment file:

```bash
cp .env.example .env
```

2. Open `.env` and change the default secrets before deploying anywhere public:

```env
DB_PASSWORD=change-me
JWT_SECRET=change-me
ACCESS_TOKEN_SECRET=change-me
REFRESH_TOKEN_SECRET=change-me
APP_KEY_GENERATOR=change-me-32-character-minimum-key
```

3. Start the production stack:

```bash
docker compose --env-file .env -f compose.yml up -d --build
```

4. Open the app:

```text
Frontend: http://localhost:3000
Backend:  http://localhost:4973
```

5. Stop the stack:

```bash
docker compose --env-file .env -f compose.yml down
```

## Development

The development stack mounts the frontend and backend source folders into the containers and runs both apps in watch mode.

Start development:

```bash
docker compose --env-file .env -f compose.yml -f compose.dev.yml up -d --build
```

View logs:

```bash
docker compose --env-file .env -f compose.yml -f compose.dev.yml logs -f
```

Stop development:

```bash
docker compose --env-file .env -f compose.yml -f compose.dev.yml down
```

Stop development and remove local Docker volumes:

```bash
docker compose --env-file .env -f compose.yml -f compose.dev.yml down -v
```

## Useful Docker Commands

Rebuild all services:

```bash
docker compose --env-file .env -f compose.yml build
```

Restart one service:

```bash
docker compose --env-file .env -f compose.yml restart backend
docker compose --env-file .env -f compose.yml restart frontend
docker compose --env-file .env -f compose.yml restart database
```

Check service status:

```bash
docker compose --env-file .env -f compose.yml ps
```

Follow production logs:

```bash
docker compose --env-file .env -f compose.yml logs -f
```

## Environment Configuration

All Docker Compose configuration is managed from the root `.env` file. The frontend and backend containers receive their environment variables from `compose.yml`, so app-level `.env` files are not required for Docker-based usage.

Important values:

- `DB_USER`, `DB_PASSWORD`, `DB_NAME`: PostgreSQL credentials
- `DATABASE_PUBLISHED_PORT`: Host port for PostgreSQL
- `APP_PORT`, `BACKEND_PORT`: Backend container and host ports
- `FRONTEND_PORT`: Frontend host port
- `ORIGIN`: Frontend URL allowed by backend CORS
- `NEXT_PUBLIC_API_BASE_URL`: Backend URL used by the frontend
- `JWT_SECRET`, `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`: Auth secrets
- `APP_KEY_GENERATOR`: Application key generation secret

## Database Notes

PostgreSQL data is stored in the `postgres_data` Docker volume. If you change database credentials after the database has already been initialized, PostgreSQL will keep the old credentials in the existing volume.

For a clean local reset:

```bash
docker compose --env-file .env -f compose.yml down -v
docker compose --env-file .env -f compose.yml up -d --build
```

Only use `down -v` when you are comfortable deleting the local database volume.

## Production Notes

Before deploying publicly:

- Replace every default secret in `.env`
- Use strong database credentials
- Set `ORIGIN` to your deployed frontend URL
- Set `NEXT_PUBLIC_API_BASE_URL` to your deployed backend URL
- Run behind HTTPS with a reverse proxy or hosting platform of your choice
- Back up the PostgreSQL volume or use a managed PostgreSQL database

## License

This project is open-source. See [LICENSE](./LICENSE) for details.

