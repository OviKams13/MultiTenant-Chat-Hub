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

1. Copy `.env.example` to `.env` inside `apps/backend-service`.
2. Fill in real values for database credentials, `JWT_SECRET`, and `GEMINI_API_KEY`.

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

## Public runtime contract version

- `POST /api/v1/public/chat` is treated as the stable **API v1** runtime contract.
- Future breaking runtime changes must be introduced under a new path version (for example `/api/v2/public/chat`).

## Operational endpoints

- Health check: `GET /health`
- OpenAPI docs landing page: `GET /api-docs`
- OpenAPI JSON: `GET /api-docs.json`

## Main API base path

- `GET/POST/... /api/v1/...`
