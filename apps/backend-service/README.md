# @mth/backend-service

Standalone deployable backend service for MultiTenant Chat Hub.

## What this service contains

This single HTTP service includes the existing backend domains:

- auth
- chatbots
- static blocks
- dynamic block types
- dynamic block instances
- tags
- browse endpoints
- public chat runtime (`POST /api/v1/public/chat`)

## Prerequisites

- Node.js 20+
- MySQL database

## Environment setup

1. If you do not already have a local `.env`, copy `.env.example` to `.env` inside `apps/backend-service`.
2. If you already have a `.env` with real credentials, **do not overwrite it**. Update only missing keys by comparing with `.env.example`.
3. Fill in real values for database credentials, `JWT_SECRET`, and `GEMINI_API_KEY`.

## Install dependencies (from repo root)

```bash
npm install
```

## Run in development

```bash
npm run dev --workspace @mth/backend-service
```

## Build and run production bundle

```bash
npm run build --workspace @mth/backend-service
npm run start --workspace @mth/backend-service
```

## Quality checks

```bash
npm run lint --workspace @mth/backend-service
npm run test --workspace @mth/backend-service
```

## Docker local stack (backend + mysql)

From repo root:

```bash
docker compose up --build
```

Stack services:

- `mysql` (MySQL 8, persistent volume)
- `backend` (this package, built from `apps/backend-service/Dockerfile`)

Available URLs:

- Backend: `http://localhost:4000`
- Health: `http://localhost:4000/health`
- OpenAPI docs: `http://localhost:4000/api-docs`
- OpenAPI JSON: `http://localhost:4000/api-docs.json`

Container bootstrap behavior used for local reproducibility:

- `DB_AUTO_SYNC=true`: auto-creates/updates tables from Sequelize models at startup.
- `DB_AUTO_SEED=true`: runs idempotent bootstrap seed data (`ADMIN/USER` roles, admin user, system tags, demo chatbot, and demo allowed origins).
- `DB_CONNECT_RETRY_ATTEMPTS` + `DB_CONNECT_RETRY_DELAY_MS`: backend retries DB connection while MySQL is becoming ready.

If you need real LLM answers in local compose, export `GEMINI_API_KEY` before running compose.

Demo seed values used by integration hosts:

- demo chatbot domain: `shop.example.com` (configurable by `SEED_DEMO_CHATBOT_DOMAIN`)
- allowed origins seeded for local demos: `http://localhost:5173`, `http://localhost:8080`

## Public runtime contract version

- `POST /api/v1/public/chat` is treated as the stable **API v1** runtime contract.
- Future breaking runtime changes must be introduced under a new path version (for example `/api/v2/public/chat`).

## Public runtime security model (v1)

- `domain` is **resolution-only** (chatbot lookup), not proof of caller identity.
- Backend verifies HTTP `Origin` against chatbot-specific allowed origins.
- Optional `widgetKey` is a **public identifier** for diagnostics/rotation, not a secret.
- Public security error codes include:
  - `ORIGIN_NOT_ALLOWED` (403)
  - `INVALID_WIDGET_KEY` (400)

### Missing Origin policy

- Browser widget requests are expected to include `Origin`.
- In production, missing `Origin` is rejected.
- Non-production bypass is available only when explicitly enabled via `PUBLIC_RUNTIME_ALLOW_MISSING_ORIGIN=true`.
- Per-chatbot allowlist accepts `*` as a wildcard origin for quick testing (not recommended for production).

## CORS and CSP integration notes

- CORS is a browser policy layer and does not replace backend authorization checks.
- Production CORS allowlist can be configured with `CORS_ALLOWED_ORIGINS`.
- Setting `CORS_ALLOWED_ORIGINS=*` allows all browser origins (quick testing only; not recommended for production).
- Runtime authorization remains chatbot-level `Origin` allowlist verification.

Host sites embedding the widget should allow:

- `script-src`: widget bundle origin (your CDN/hosting)
- `connect-src`: backend API origin (this service)
- `style-src`: allow widget style injection path used by the web component wrapper

## Operational endpoints

- Health check: `GET /health`
- OpenAPI docs landing page: `GET /api-docs`
- OpenAPI JSON: `GET /api-docs.json`

## Main API base path

- `GET/POST/... /api/v1/...`
