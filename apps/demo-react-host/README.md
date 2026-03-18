# @mth/demo-react-host

React integration demo host for `@mth/widget-react`.

## What this demo proves

- A host React app consumes the packaged widget via package import (`@mth/widget-react`).
- No admin-app internal code is imported.
- Runtime requests go to the backend service configured by host app env.

## Expected local configuration

- Backend URL: `http://localhost:4000`
- Demo chatbot domain: `shop.example.com`
- Host origin: `http://localhost:5173` (must be allowed by backend security model for this demo chatbot)

## Run

From repo root:

```bash
npm install
npm run dev --workspace @mth/demo-react-host
```

The dev script auto-builds `shared-types`, `widget-core`, and `widget-react` before starting Vite.

Optional env setup (only if you want custom values):

- Linux/macOS:
```bash
cp apps/demo-react-host/.env.example apps/demo-react-host/.env
```
- Windows PowerShell:
```powershell
Copy-Item apps/demo-react-host/.env.example apps/demo-react-host/.env
```

If you skip this step, defaults are already defined in the demo source.

## Windows troubleshooting (Rollup optional dependency)

If you still see `Cannot find module @rollup/rollup-win32-x64-msvc`, run from repo root:

```powershell
npm i -D @rollup/rollup-win32-x64-msvc --no-save
npm run dev --workspace @mth/demo-react-host
```
