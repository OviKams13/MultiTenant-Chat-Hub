FROM node:20-bookworm-slim

WORKDIR /workspace

# Install workspace dependencies first for better Docker layer caching.
COPY package.json package-lock.json ./
COPY apps/backend-service/package.json apps/backend-service/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/tsconfig-base/package.json packages/tsconfig-base/package.json

RUN npm ci

# Copy monorepo sources required to build backend and its workspace dependencies.
COPY apps/backend-service apps/backend-service
COPY packages/shared-types packages/shared-types
COPY packages/eslint-config packages/eslint-config
COPY packages/tsconfig-base packages/tsconfig-base

RUN npm run build -w @mth/backend-service

ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "apps/backend-service/dist/index.js"]
