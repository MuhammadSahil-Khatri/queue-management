# Chunk 2: Authentication & Authorization Specification & Architecture

## 1. System Overview
QueueCraft is a Digital Queue & Appointment Management System engineered for high-concurrency civic institutions (banks, clinics, university administrative desks, and municipal service centers). 

**Chunk 2** establishes the core security foundation:
- Secure authentication (bcrypt + JWT + refresh token rotation in `httpOnly`, `secure`, `SameSite` cookies)
- Single source of truth for Role-Based Access Control (RBAC)
- Multi-tenant department scoping
- Immutable audit logging of authentication and user lifecycle events
- In-memory token management with silent auto-refresh on 401 status

---

## 2. Role & Permission Matrix

The system specifies exactly four roles:

| Action / Capability | CUSTOMER | STAFF | MANAGER | ADMIN | Enforcement Mechanism |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Self-Registration (Sign Up)** | ✅ | ❌ | ❌ | ❌ | Public `/api/auth/register` (Role is hardcoded to `CUSTOMER`) |
| **Log In & Rotate Session** | ✅ | ✅ | ✅ | ✅ | `/api/auth/login`, `/api/auth/refresh` |
| **Manage Own Profile / Password** | ✅ | ✅ | ✅ | ✅ | `/api/auth/me`, `/api/auth/change-password` |
| **Access Own Queue / History** | ✅ | ❌ | ❌ | ❌ | `ownerOrRole` middleware & user ID matching |
| **Call / Serve / Skip Tokens** | ❌ | ✅ | ❌ | ❌ | Chunk 4 (scoped to counter & department) |
| **View Waiting Customers** | ❌ | ✅ | ✅ | ✅ | Scoped to assigned department |
| **Manage Department Staff** | ❌ | ❌ | ✅ | ✅ | `/api/users` (Manager scoped strictly to own dept & role `STAFF`) |
| **Manage Counters & Services** | ❌ | ❌ | ✅ | ✅ | Chunk 3 (Manager scoped to own department) |
| **Manage All Departments** | ❌ | ❌ | ❌ | ✅ | `/api/departments` (Admin only) |
| **Manage All Users & Roles** | ❌ | ❌ | ❌ | ✅ | `/api/users` (Admin full access) |
| **View Audit Logs & Analytics** | ❌ | ❌ | ❌ | ✅ | `/api/users/audit-logs` (Admin only) |

### Key Security Invariants
1. **Self-Demotion Guard**: An administrator cannot demote or deactivate their own active account.
2. **Last Admin Protection**: The last active administrator in the database cannot be deleted, deactivated, or demoted.
3. **Department Isolation**: Managers and staff are constrained to their assigned `departmentId`. Attempting to access or alter another department's resources yields `403 Forbidden` (`DEPARTMENT_MISMATCH`).
4. **Privilege Escalation Lock**: Public registration strictly sets `role = 'CUSTOMER'`. Any `role` field sent in the request payload by a malicious client is completely discarded.

---

## 3. Authentication & Session Flow

```
[ Client Application ]                          [ Express API + DB ]
       │                                                 │
       │─── 1. POST /api/auth/login (email, pass) ──────>│
       │                                                 │ Verify bcrypt hash & isActive
       │                                                 │ Generate Access Token (15 min)
       │                                                 │ Generate Refresh Token (7 days)
       │                                                 │ Hash & store refresh token in DB
       │<── 2. Response: { user, accessToken } ──────────│
       │       Set-Cookie: refreshToken=...; httpOnly;   │
       │                                                 │
       │─── 3. GET /api/... (Bearer <access_token>) ────>│ Verify JWT signature & active user
       │<── 4. Protected Resource Data ──────────────────│
       │                                                 │
   [ Token Expires (15 min) ]                            │
       │                                                 │
       │─── 5. GET /api/... (Expired Token) ────────────>│
       │<── 6. 401 Unauthorized ─────────────────────────│
       │                                                 │
[ Axios Interceptor catches 401 silently ]              │
       │─── 7. POST /api/auth/refresh (Cookie) ─────────>│ Verify hash in DB & not revoked
       │                                                 │ Revoke old refresh token
       │                                                 │ Issue new Access & Refresh tokens
       │<── 8. { accessToken, user } + New Cookie ───────│
       │                                                 │
       │─── 9. Replay original request with new token ──>│
       │<── 10. Success Response ────────────────────────│
       │                                                 │
       │─── 11. POST /api/auth/logout ──────────────────>│ Revoke refresh token in DB
       │<── 12. Clear-Cookie + 200 OK ───────────────────│
```

---

## 4. API Endpoints

### Public Auth
- `POST /api/auth/register`: Public customer self-registration. Rate limited.
- `POST /api/auth/login`: Issues access token + httpOnly refresh cookie. Generic error on failure.
- `POST /api/auth/refresh`: Rotates refresh token (single use) and returns new access token.
- `POST /api/auth/logout`: Revokes refresh token in database and clears cookie.

### Authenticated Profile
- `GET /api/auth/me`: Returns current authenticated user record with department & staff profile.
- `PATCH /api/auth/me`: Updates current user's name and phone.
- `POST /api/auth/change-password`: Requires current password verification, sets new bcrypt hash, revokes existing refresh tokens.

### User Management (Role-Restricted)
- `GET /api/users`: Search, filter (role, department, status), and pagination.
  - ADMIN: Lists all organization users.
  - MANAGER: Automatically filtered to STAFF within their assigned department only.
  - STAFF / CUSTOMER: `403 Forbidden`.
- `POST /api/users`: Create user account.
  - ADMIN: Can create any role (`CUSTOMER`, `STAFF`, `MANAGER`, `ADMIN`).
  - MANAGER: Can create ONLY `STAFF` within their own department.
- `PATCH /api/users/:id`: Edit user details, staff code, shifts, and counters.
  - ADMIN: Full access across all users.
  - MANAGER: Can only edit `STAFF` inside their department.
- `PATCH /api/users/:id/status`: Activate or deactivate user.
  - Prevents admin self-deactivation and last-admin lockout.
- `DELETE /api/users/:id`: Delete user account (ADMIN only).
- `GET /api/users/departments`: Retrieve list of active departments.
- `GET /api/users/audit-logs`: View security audit log history (ADMIN only).

---

## 5. Folder Structure & Logic Locations

```
/
├── server.ts                    # Root unified fullstack server (Express API + Vite middleware)
├── metadata.json                # AI Studio application manifest
│
├── server/                      # Standalone Backend Service
│   ├── .env.example             # Supabase PostgreSQL & JWT configuration
│   ├── package.json             # Backend dependencies & Prisma scripts
│   ├── tsconfig.json
│   ├── prisma/
│   │   ├── schema.prisma        # Supabase Postgres schema (User, Department, StaffProfile, RefreshToken, AuditLog)
│   │   ├── seed.ts              # Database seed script for Supabase
│   │   └── migrations/          # Raw SQL migrations for Supabase deployment
│   └── src/
│       ├── lib/
│       │   ├── prisma.ts        # Database client & in-memory dev fallback with seeded records
│       │   ├── jwt.ts           # Token sign, verify, and sha256 hash logic
│       │   └── password.ts      # Bcrypt (cost 12) hashing & verification
│       ├── types/
│       │   ├── auth.ts          # Role, Shift, StaffStatus, User types
│       │   ├── user.ts          # Entity records
│       │   └── express.d.ts     # Express Request.user type augmentations
│       ├── validators/
│       │   ├── auth.schema.ts   # Zod validators for login, register, password
│       │   └── user.schema.ts   # Zod validators for user creation & updates
│       ├── middleware/
│       │   ├── authenticate.ts  # JWT verification & active user loader
│       │   ├── authorize.ts     # Role authorization guard
│       │   ├── scopeToDepartment.ts # Department boundary enforcement
│       │   ├── ownerOrRole.ts   # Customer data ownership guard
│       │   ├── permissions.ts   # Centralized permission map
│       │   ├── rateLimiter.ts   # Rate limiting (express-rate-limit)
│       │   └── errorHandler.ts  # Generic sanitized JSON error handler
│       ├── services/
│       │   ├── auth.service.ts  # Core authentication business logic
│       │   ├── user.service.ts  # User management and RBAC rules
│       │   └── audit.service.ts # Audit logging pipeline
│       ├── controllers/
│       │   ├── auth.controller.ts # Auth HTTP handlers & cookie management
│       │   └── user.controller.ts # User management HTTP handlers
│       ├── routes/
│       │   ├── auth.routes.ts   # /api/auth routes
│       │   └── user.routes.ts   # /api/users routes
│       ├── app.ts               # Express app creation & middleware mounting
│       └── server.ts            # Standalone API runner (port 5000)
│
├── client/                      # Standalone Frontend Application
│   ├── .env.example             # VITE_API_URL configuration
│   ├── package.json
│   └── src/                     # Client application source (mirrored from /src)
│
├── src/                         # React Frontend Application (Vite Root)
│   ├── api/
│   │   ├── axios.ts             # Axios client with in-memory token and silent 401 refresh interceptor
│   │   ├── auth.api.ts          # Auth API calls & types
│   │   └── user.api.ts          # User management API calls
│   ├── context/
│   │   └── AuthContext.tsx      # Auth provider, session restore, role redirects
│   ├── components/
│   │   ├── ProtectedRoute.tsx   # Unauthenticated redirect to /login
│   │   ├── RoleRoute.tsx        # Role gatekeeper with 403 fallback UI
│   │   └── AppLayout.tsx        # Role-aware navigation bar, user badge, header
│   ├── pages/
│   │   ├── Login.tsx            # Login with 1-click Demo Role Switcher
│   │   ├── Register.tsx         # Customer self-registration form
│   │   ├── Profile.tsx          # Profile update and change password
│   │   ├── NotFound.tsx         # 404 page
│   │   ├── dashboards/
│   │   │   ├── CustomerDashboard.tsx # /customer
│   │   │   ├── StaffDashboard.tsx    # /staff (with duty status toggle)
│   │   │   ├── ManagerDashboard.tsx  # /manager (with department overview)
│   │   │   └── AdminDashboard.tsx    # /admin (with system stats)
│   │   ├── admin/
│   │   │   └── AdminUsers.tsx   # /admin/users table, modal, filters, audit logs
│   │   └── manager/
│   │       └── ManagerStaff.tsx # /manager/staff department staff management
│   ├── App.tsx                  # Main router configuration
│   ├── main.tsx                 # Entrypoint
│   └── index.css                # Tailwind CSS
│
└── docs/
    ├── auth.md                  # This document
    └── test-checklist.md       # Step-by-step verification checklist
```

---

## 6. Supabase PostgreSQL Integration Guide

To connect QueueCraft to your Supabase PostgreSQL database:

### 1. Retrieve Supabase Connection Strings
In your Supabase project dashboard:
1. Navigate to **Project Settings** > **Database**.
2. Scroll to the **Connection string** section:
   - **Transaction Pooler (Port 6543)**: Select "Transaction" mode with `pgbouncer=true`. Copy this for `DATABASE_URL`.
   - **Direct Connection (Port 5432)**: Copy this for `DIRECT_URL` (needed for Prisma schema migrations).

### 2. Configure `.env`
In `/server/.env`:
```env
DATABASE_URL="postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
JWT_ACCESS_SECRET="generate-a-random-secure-64-character-string"
JWT_REFRESH_SECRET="generate-a-different-random-secure-64-character-string"
```

### 3. Deploy Migrations & Seed
Run in `/server`:
```bash
npx prisma migrate deploy
npm run prisma:seed
```
This applies the migration SQL located in `server/prisma/migrations/20261001000000_init/migration.sql` and populates the database with initial departments and demo accounts.
