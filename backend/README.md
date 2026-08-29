# Vaultory Backend

Express 5 + TypeScript (ESM) REST API for Vaultory. Business logic lives here in Node; **Supabase is used only for Postgres, Auth, and Storage**.

## Stack

- Node.js + Express 5, TypeScript with `NodeNext` (native ESM)
- Zod for runtime validation (env + request bodies)
- Supabase client (`@supabase/supabase-js`) for Auth and the database
- Security/lifecycle: helmet, cors, express-rate-limit, morgan
- Optional Groq integration for AI forecasting / recommendations

## Prerequisites

- Node.js ≥ 22.12
- A Supabase project (URL + anon key). The service-role key and Groq API key are optional.

## Setup

```sh
npm install
cp .env.example .env
```

| Variable                    | Required | Default                 | Description                              |
| --------------------------- | -------- | ----------------------- | ---------------------------------------- |
| `NODE_ENV`                  | no       | `development`           | `development` / `test` / `production`    |
| `PORT`                      | no       | `4000`                  | Port to bind                             |
| `CLIENT_ORIGIN`             | no       | `http://localhost:5173` | Allowed CORS origin                      |
| `SUPABASE_URL`              | **yes**  | —                       | Supabase project URL                     |
| `SUPABASE_ANON_KEY`         | **yes**  | —                       | Public anon key                          |
| `SUPABASE_SERVICE_ROLE_KEY` | no       | —                       | Privileged server-only key               |
| `GROQ_API_KEY`              | no       | —                       | Enables AI forecasting / recommendations |

## Scripts

| Command             | Description                        |
| ------------------- | ---------------------------------- |
| `npm run dev`       | Run with `tsx watch` (auto-reload) |
| `npm run build`     | `tsc` → `dist/`                    |
| `npm run start`     | Run built `dist/index.js`          |
| `npm run typecheck` | `tsc --noEmit`                     |
| `npm run lint`      | ESLint (flat config)               |

## Project structure

```
src/
├── app.ts              Express app assembly: middleware, routes, error handling
├── index.ts            Server bootstrap (reads Port + env)
├── config/             env.ts (Zod schema) + supabase.ts (client)  [barrel]
├── middleware/         auth (requireAuth/requireRoles), error handling, validation  [barrel]
├── modules/            one folder per feature (health, auth, ...)  [barrels]
└── routes/             index.ts — central API router mounting every module
```

Conventions:

- **ESM**: relative imports use the `.js` extension (`./config/index.js`).
- **Barrel exports**: modules expose an `index.js` and routes are consumed via `@/…`-style app paths here as `./middleware/index.js` etc.
- **No barrel conflicts**: type-only exports are separated so nothing is duplicated.

## API

Current endpoints (development state — feature endpoints are added as the DB schema lands):

| Method | Path                 | Auth               | Description                              |
| ------ | -------------------- | ------------------ | ---------------------------------------- |
| `GET`  | `/api/health`        | public             | Liveness + DB/AI status (used by Render) |
| `POST` | `/api/auth/signin`   | public             | Email + password sign-in                 |
| `POST` | `/api/auth/otp`      | public             | Email OTP / magic-link sign-in           |
| `GET`  | `/api/auth/me`       | Bearer JWT         | Current authenticated user               |
| `GET`  | `/api/auth/me/roles` | Bearer JWT (owner) | Role-enforcement example                 |

Authentication uses Supabase JWT bearer tokens. Errors follow a uniform shape:

```json
{ "error": "Error message", "message": "Error message", "code": "VALIDATION" }
```

## Status

Backend scaffolding is complete and clean (lint + typecheck + build). Feature modules — inventory, sales/POS, purchase orders, and AI demand forecasting — are designed against the database schema and will be added module-by-module under `src/modules/` and mounted in `src/routes/index.ts`.
