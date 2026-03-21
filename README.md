# MultiTenant Chat Hub

MultiTenant Chat Hub is a monorepo that contains:

- A deployable backend API service.
- An admin application.
- Reusable chatbot widget packages (core runtime, React adapter, and Web Component wrapper).
- Two demo host apps (React and plain HTML) to validate integrations quickly.

## Repository structure

```text
apps/
  backend-service      # API service (Express + TypeScript)
  admin-app            # Admin dashboard
  demo-react-host      # React integration demo
  demo-html-host       # Plain HTML integration demo
packages/
  shared-types         # Shared backend/widget contracts
  widget-core          # Runtime logic and policies
  widget-react         # React widget package
  widget-web-component # <chatbot-widget> package
  eslint-config        # Shared ESLint config
  tsconfig-base        # Shared TypeScript config
scripts/
  ensure-windows-optional-deps.mjs
```

## Prerequisites

- Node.js 18+ (Node 20 LTS recommended)
- npm 9+
- Docker + Docker Compose (recommended for local backend stack)

## Install

From repository root:

```bash
npm install
```

## Run the full local stack (recommended)

### Option A: Docker Compose (backend + DB + admin + demos)

```bash
docker compose up --build
```

Useful endpoints:

- Backend: `http://localhost:4000`
- Health: `http://localhost:4000/health`
- API docs: `http://localhost:4000/api-docs`
- Admin app: `http://localhost:4173`
- React host demo: `http://localhost:5173`
- HTML host demo: `http://localhost:8080`

Optional helper scripts:

```bash
npm run docker:up
npm run docker:logs
npm run docker:down
```

### Option B: Run backend locally (without Docker)

1. Create env file:

```bash
cp apps/backend-service/.env.example apps/backend-service/.env
```

2. Make sure your local MySQL config matches `.env`.

3. Start backend in dev mode:

```bash
npm run dev --workspace @mth/backend-service
```

## Run admin app and demos without Docker (optional)

If you only want to run frontend hosts locally while keeping backend in Docker:

### Admin app

```bash
npm run dev --workspace @mth/admin-app
```

### React host demo

```bash
npm run dev --workspace @mth/demo-react-host
```

Open: `http://localhost:5173`

### HTML host demo

```bash
npm run dev --workspace @mth/demo-html-host
```

Open: `http://localhost:8080`

## Monorepo commands

From root:

```bash
npm run dev
npm run build
npm run lint
npm run test
npm run clean
```

## Windows note

If optional native dependencies fail to resolve on Windows, run:

```powershell
npm i -D @rollup/rollup-win32-x64-msvc @esbuild/win32-x64 --no-save
```

If needed, reinstall dependencies with:

```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm install
```
