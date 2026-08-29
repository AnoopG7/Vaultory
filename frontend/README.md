# Vaultory Frontend

React 19 + TypeScript SPA for Vaultory (multi-store retail inventory & sales management).

## Stack

- React 19, TypeScript, Vite
- Tailwind CSS v4 (CSS-first, `@tailwindcss/vite`)
- shadcn/ui components on Radix UI
- React Router 7 (data router), TanStack Query, Zustand
- React Hook Form + Zod, Recharts, Sonner, next-themes

## Scripts

| Command           | Description                                            |
| ----------------- | ------------------------------------------------------ |
| `npm run dev`     | Start Vite dev server on `http://localhost:5173`       |
| `npm run build`   | `tsc -b` + Vite production build                       |
| `npm run preview` | Preview the production build                           |
| `npm run lint`    | ESLint (flat config, incl. React Hooks + Fast Refresh) |

## Structure

```
src/
├── App.tsx            Root component -> renders <RouterProvider>
├── main.tsx           App bootstrap: QueryClient, ThemeProvider, Toaster
├── router.tsx         Route tree (data router) + ProtectedRoute guard
├── index.css          Tailwind v4 entry + theme tokens
├── pages/             Route pages (auth, dashboard, inventory, sales, reports, ...)
├── components/
│   ├── layout/        App shell, sidebar, protected-route, page placeholders
│   ├── theme/         ThemeProvider + mode toggle
│   └── ui/            shadcn/ui components (barrel)
├── stores/            Zustand stores (auth-store)
├── hooks/             Custom hooks (useIsMobile, useTheme)
└── lib/               API client, types, utils (barrel)
```

## Conventions

- **Path alias**: `@` → `src/` (configured in `vite.config.ts` + `tsconfig`).
- **Barrel exports**: import shared code from `@/components/ui`, `@/components/theme`, `@/components/layout`, `@/lib`, `@/stores`, `@/hooks`.
- **Dev proxy**: Vite proxies `/api` → `http://localhost:4000` (the Express backend); no `.env` needed in dev.
- **Theming**: light mode is default ("linen"), dark mode toggle in the app shell via `ThemeProvider`.

## Environment

Optional for production/preview builds — the base URL of the backend API:

```
VITE_API_BASE_URL=
```

Leave empty in development so the Vite proxy handles `/api` requests.
