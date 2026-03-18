# @mth/demo-html-host

Plain HTML integration demo host for `@mth/widget-web-component`.

## What this demo proves

- Script-tag consumption of a browser bundle generated from `@mth/widget-web-component`.
- `<chatbot-widget>` usage in a non-React host page.
- Runtime requests target the backend service directly via element attributes.

## Expected local configuration

- Backend URL: `http://localhost:4000`
- Demo chatbot domain: `shop.example.com`
- Host origin: `http://localhost:8080` (must be allowed by backend security model for this demo chatbot)

## Run

From repo root:

```bash
npm install
npm run dev --workspace @mth/demo-html-host
```

This command builds the browser bundle and serves `public/index.html` on port `8080`.

## Windows troubleshooting (esbuild optional dependency)

If you still see `The package "@esbuild/win32-x64" could not be found`, run from repo root:

```powershell
npm i -D @esbuild/win32-x64 --no-save
npm run dev --workspace @mth/demo-html-host
```
