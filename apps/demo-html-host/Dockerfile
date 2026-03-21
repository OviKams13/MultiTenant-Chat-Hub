FROM node:20-bookworm-slim

WORKDIR /workspace

# Install workspace dependencies required by demo-html-host and widget bundle build.
COPY package.json package-lock.json ./
COPY scripts/ensure-windows-optional-deps.mjs scripts/ensure-windows-optional-deps.mjs
COPY apps/demo-html-host/package.json apps/demo-html-host/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/widget-core/package.json packages/widget-core/package.json
COPY packages/widget-react/package.json packages/widget-react/package.json
COPY packages/widget-web-component/package.json packages/widget-web-component/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/tsconfig-base/package.json packages/tsconfig-base/package.json

RUN npm ci

# Copy sources needed for browser widget build and static host serving.
COPY apps/demo-html-host apps/demo-html-host
COPY packages/shared-types packages/shared-types
COPY packages/widget-core packages/widget-core
COPY packages/widget-react packages/widget-react
COPY packages/widget-web-component packages/widget-web-component
COPY packages/eslint-config packages/eslint-config
COPY packages/tsconfig-base packages/tsconfig-base

EXPOSE 8080

CMD ["npm", "run", "dev", "--workspace", "@mth/demo-html-host"]
