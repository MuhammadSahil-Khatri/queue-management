# QueueCraft – Queue Management System

QueueCraft is a full-stack queue and appointment management platform with role-based dashboards for **CUSTOMER**, **STAFF**, **MANAGER**, and **ADMIN** users.

It supports appointment booking, walk-in token generation, queue handling at counters, department/service management, and authentication with JWT + refresh token rotation.

## Repository Structure

```text
.
├── src/                  # Root React app (Vite)
├── server/               # Express + Prisma backend
├── client/               # Standalone React client package
├── docs/                 # Project documentation
├── server.ts             # Unified dev server (API + Vite on one port)
└── package.json          # Root scripts (dev/build/test/lint)
```

## Tech Stack

- **Frontend:** React, Vite, TypeScript, React Router, Axios, Tailwind
- **Backend:** Express, TypeScript, Prisma, PostgreSQL (Supabase-ready)
- **Auth/Security:** JWT, refresh tokens, bcrypt, helmet, rate limiting
- **Validation/Testing:** Zod, Vitest

## Prerequisites

- Node.js 20+
- npm

## Environment Configuration

### 1) Root `.env` (platform/runtime-specific)

Copy `/home/runner/work/queue-management/queue-management/.env.example` if you run with the root unified server setup that expects these values.

### 2) Backend `.env`

Copy:

`/home/runner/work/queue-management/queue-management/server/.env.example`

to:

`/home/runner/work/queue-management/queue-management/server/.env`

Key variables:
- `PORT`
- `CLIENT_URL`
- `DATABASE_URL`
- `DIRECT_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`

### 3) Client `.env` (only for standalone client mode)

Copy:

`/home/runner/work/queue-management/queue-management/client/.env.example`

to:

`/home/runner/work/queue-management/queue-management/client/.env`

Set `VITE_API_URL` to your backend URL (for example `http://localhost:5000`).

## Run the Project

### Option A: Unified full-stack dev mode (recommended)

From repository root:

```bash
npm install
npm run dev
```

- App: `http://localhost:3000`
- API: `http://localhost:3000/api`
- Health: `http://localhost:3000/api/health`

### Option B: Backend only

```bash
cd server
npm install
npm run dev
```

- API: `http://localhost:5000`

### Option C: Client only

```bash
cd client
npm install
npm run dev
```

- App: `http://localhost:3000`

## Root Scripts

From `/home/runner/work/queue-management/queue-management`:

- `npm run dev` – run unified server (Express + Vite middleware)
- `npm run build` – build frontend with Vite
- `npm run preview` – preview built frontend
- `npm run lint` – TypeScript type-check (`tsc --noEmit`)
- `npm run test` – run Vitest suite
- `npm run prisma:seed` – run seed script from `server/prisma/seed.ts`

## API Route Groups

Base URL: `/api`

- `/auth` – register/login/refresh/logout + profile endpoints
- `/users` – user management, departments lookup, audit logs
- `/departments` – public department/service discovery
- `/services` – available dates and slot discovery
- `/appointments` – booking, rescheduling, cancellation, check-in
- `/tokens` – walk-in token generation and active token retrieval
- `/queue` – queue state, call-next, token status updates
- `/data-model` – schema/data overview endpoint

## Testing

From repository root:

```bash
npm test
```

## Additional Documentation

- `/home/runner/work/queue-management/queue-management/docs/auth.md`
- `/home/runner/work/queue-management/queue-management/docs/architecture.md`
- `/home/runner/work/queue-management/queue-management/docs/test-checklist.md`
