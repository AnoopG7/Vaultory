# Vaultory

Multi-store retail inventory & sales management for small retail chains, with AI-powered demand forecasting and automatic purchase-order generation.

Vaultory is developed as a Software Engineering project (Sprint Planner: 29 Aug – 30 Sep 2026). Team: Anoop Gupta — Project Manager / Business Analyst / Scrum Master / Tech Lead.

## Tech stack

| Layer      | Technology                                                                                                                              |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend   | React 19 · TypeScript · Vite · Tailwind CSS v4 · shadcn/ui · TanStack Query · React Router · Zustand · React Hook Form + Zod · Recharts |
| Backend    | Node.js · Express 5 · TypeScript (ESM) · Zod · Supabase (Postgres + Auth + Storage) · Groq (optional AI)                                |
| Deployment | Vercel (frontend) · Render (backend) · Supabase (data)                                                                                  |

## Repository layout

```
backend/   Express + TypeScript API (config, middleware, feature modules, routes)
frontend/  React + Vite SPA
Docs/      BRD, SRS, SOW, Sprint Planner (Markdown + rendered PDFs)
tools/     Project tooling (Markdown → PDF)
```

## Getting started

Prerequisites: Node.js ≥ 22.12, npm, and a Supabase project (URL + anon key).

**Backend API**

```sh
cd backend
npm install
cp .env.example .env   # set SUPABASE_URL and SUPABASE_ANON_KEY
npm run dev            # http://localhost:4000
```

**Frontend app**

```sh
cd frontend
npm install
npm run dev            # http://localhost:5173 (proxies /api → localhost:4000)
```

No `.env` is needed in dev for the frontend - Vite proxies `/api` to the backend automatically.

## Lint & format (project-wide)

```sh
npm install            # root tooling (Prettier)
npm run lint           # ESLint for frontend + backend
npm run build          # tsc + vite build for frontend, tsc build for backend
npm run format         # Prettier --write
npm run format:check   # Prettier --check
```

Formatting is configured in `prettier.config.mjs` (root). Shared ESLint style mirrors the frontend setup.

## Documentation

- [Business Requirements (v3.4)](Docs/BRD.md)
- [Software Requirements (v1.1)](Docs/SRS.md)
- [Statement of Work (v1.2)](Docs/SOW.md)
- [Sprint Planner (v2.1)](Docs/Sprint_Planner.md)

## Current status

Scaffolding complete: frontend (routing, theming, forms, stores, responsive UI) and backend (env validation, auth, error handling, health check) are wired and clean (lint + build pass). Feature modules (inventory, sales/POS, purchase orders, AI forecasts) are mapped to the database schema.
