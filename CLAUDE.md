# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

**ParcelHub** — a self-hosted personal package management system. You receive packages on behalf of friends, log them in, and track when they're picked up. Core concepts: **Recipients** (friends), **Packages** (parcels), **Bins** (storage locations), **Intake** (logging arrivals), **Pickup** (scanning to mark collected).

## Project Structure

All files are currently in the root directory. The intended architecture (per README) separates `client/` (React/Vite) and `server/` (Fastify/Node), but in this working copy everything is flat:

- **Frontend** (React): `App.tsx`, `AppLayout.tsx`, `*Page.tsx`, `api.ts`, `main.tsx`, `index.html`, `index.css`, `utils.ts`, UI components (`button.tsx`, `card.tsx`, `badge.tsx`, `dialog.tsx`, `input.tsx`, `label.tsx`, `select.tsx`)
- **Backend** (Fastify): `index.ts` (entry), `packages.ts`, `recipients.ts`, `bins.ts` (routes), `barcode.ts`, `email.ts` (services), `prisma-plugin.ts`
- **Database**: `schema.prisma`, `seed.ts`
- **Config**: `vite.config.ts`, `tsconfig.json`, `package.json`
- **Docker**: `Dockerfile`, `docker-compose.yml`, `nginx.conf`

## Commands

```bash
# Backend dev server (port 3001)
npm run dev          # tsx watch src/index.ts

# Build backend
npm run build        # tsc

# Start built backend
npm start

# Database
npm run db:push      # prisma db push (create/sync schema)
npm run db:seed      # tsx prisma/seed.ts
npm run db:studio    # prisma studio (web UI)
```

The frontend uses Vite separately. In development, Vite proxies `/api/*` requests to `http://localhost:3001`.

There are no tests configured.

## Architecture

### Data Flow

**Intake**: Frontend form → `POST /api/packages/intake` → Prisma creates Package (status: `RECEIVED`) → optionally sends email (status: `NOTIFIED`) → returns barcode → frontend shows printable barcode dialog.

**Pickup**: Barcode scan (manual or camera via `html5-qrcode`) → `POST /api/packages/pickup/:barcode` → validates not already picked up → updates status to `PICKED_UP`, sets `pickedUpAt`, stores `collectedBy` → optionally sends confirmation email.

### Backend Patterns

- Fastify plugins for dependency injection (see `prisma-plugin.ts` — injects `fastify.prisma` into all routes)
- Zod schemas validate all request bodies before Prisma calls
- Routes are registered via `app.register()` in `index.ts`
- Barcode format: `PKG-YYYYMMDD-XXXX` (generated in `barcode.ts`)
- Email uses Nodemailer; templates are inline HTML strings in `email.ts`

### Frontend Patterns

- React Query (`@tanstack/react-query`) for all server state; configured with `staleTime: 10_000`, `retry: 1`
- All API calls go through the typed `request<T>()` helper in `api.ts`
- Shared TypeScript types (`Recipient`, `Bin`, `Package`, `DashboardStats`) are defined in `api.ts`
- `AppLayout.tsx` provides the sidebar nav shell; `App.tsx` defines routes; each `*Page.tsx` is a full route page
- Dashboard auto-refreshes every 30s via `refetchInterval`

### Database Schema (SQLite via Prisma)

Three models: `Recipient` → `Package` (one-to-many), `Bin` → `Package` (one-to-many optional). Package has `status` field (`RECEIVED` | `NOTIFIED` | `PICKED_UP`) and indexed fields `barcode`, `status`, `recipientId`.

## Environment Variables

Configure via `.env` in the server root:

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `3001` | Server port |
| `HOST` | `0.0.0.0` | Server host |
| `CLIENT_URL` | `http://localhost:5173` | CORS origin |
| `DATABASE_URL` | `file:./prisma/parcel-hub.db` | SQLite path |
| `SMTP_HOST` | `smtp.gmail.com` | Email server |
| `SMTP_PORT` | `587` | Email port |
| `SMTP_SECURE` | `false` | TLS flag |
| `SMTP_USER` | — | Email account |
| `SMTP_PASS` | — | Email password |
| `SMTP_FROM` | `SMTP_USER` | From address |

## Docker

```bash
docker-compose up    # Builds and runs server (3001) + client (5173→80 via Nginx)
```

SQLite database is persisted via the `db-data` Docker volume.
