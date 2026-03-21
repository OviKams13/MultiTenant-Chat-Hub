FROM node:20-bookworm-slim

WORKDIR /workspace

# Install workspace dependencies required by demo-react-host and widget packages.
COPY package.json package-lock.json ./
COPY scripts/ensure-windows-optional-deps.mjs scripts/ensure-windows-optional-deps.mjs
COPY apps/demo-react-host/package.json apps/demo-react-host/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/widget-core/package.json packages/widget-core/package.json
COPY packages/widget-react/package.json packages/widget-react/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/tsconfig-base/package.json packages/tsconfig-base/package.json

RUN npm ci

# Copy sources needed to build demo dependencies and run Vite host.
COPY apps/demo-react-host apps/demo-react-host
COPY packages/shared-types packages/shared-types
COPY packages/widget-core packages/widget-core
COPY packages/widget-react packages/widget-react
COPY packages/eslint-config packages/eslint-config
COPY packages/tsconfig-base packages/tsconfig-base

EXPOSE 5173

CMD ["npm", "run", "dev", "--workspace", "@mth/demo-react-host", "--", "--host", "0.0.0.0", "--port", "5173"]
