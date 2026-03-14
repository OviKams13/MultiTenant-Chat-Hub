# MultiTenant Chat Hub Monorepo

This repository is now organized as a monorepo using **npm workspaces** and **Turborepo**.

## Structure

- `apps/backend-service` - Express + TypeScript backend service (existing product backend).
- `apps/admin-app` - React/TypeScript admin dashboard app.
- `apps/demo-react-host` - scaffold for a future React host integration demo.
- `apps/demo-html-host` - scaffold for a future plain HTML host integration demo.
- `packages/shared-types` - source of truth for shared public runtime contracts (backend + widget packages).
- `packages/widget-core` - scaffold for future UI-agnostic widget runtime.
- `packages/widget-react` - scaffold for future React widget package.
- `packages/widget-web-component` - scaffold for future Web Component wrapper.
- `packages/eslint-config` - shared ESLint config package.
- `packages/tsconfig-base` - shared TypeScript base config package.

## Install dependencies

```bash
npm install
```

## Run backend service

```bash
npm run dev --workspace @mth/backend-service
```

## Monorepo commands

```bash
npm run dev
npm run build
npm run lint
npm run test
```

These commands are orchestrated with Turborepo across workspace packages/apps.
