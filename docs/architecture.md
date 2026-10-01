# Section 8: Data Model & System Architecture Specification

## 1. Executive Summary
This document specifies the canonical **Data Model** and **System Architecture** for the Digital Queue & Appointment Management System (**QueueCraft**), derived directly from **Section 8** and its surrounding workflow requirements (Sections 1 through 7 and 9 through 11).

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                RECOMMENDED ARCHITECTURE                               │
│                                                                                        │
│   [ Web / Mobile Application ]                                                         │
│               │                                                                        │
│               ▼                                                                        │
│   [ Backend REST API Gateway ] ── (Auth, RBAC, Rate Limiting, Input Validation)       │
│               │                                                                        │
│       ┌───────┴───────────────────────┐                                                │
│       ▼                               ▼                                                │
│ [ Appointment Manager ]     [ Queue & Token Manager ]                                 │
│  - Slot Generation           - Sequential Token Dispenser (A-027)                      │
│  - Capacity Limiter          - Smart Wait Time Estimator                               │
│  - Check-In Window (±10m)    - FIFO / Priority Engine                                  │
│  - No-Show Auto-Marker       - Counter Calling & Reallocation                          │
│       │                               │                                                │
│       └───────────────┬───────────────┘                                                │
│                       ▼                                                                │
│         [ Database Layer (PostgreSQL) ]                                                │
│          Supabase Pooled & Direct Connections                                          │
│                       │                                                                │
│       ┌───────────────┴───────────────┐                                                │
│       ▼                               ▼                                                │
│ [ Staff Counter Desks ]    [ Admin / Manager Dashboard ]   [ Public Queue TV Display ] │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Section 8 Data Model Specification

The system is normalized across five core domain tables plus identity and operational logs:

### 2.1 The Five Core Tables from Section 8

```
┌─────────────────────────┐       ┌─────────────────────────┐
│        USER DATA        │       │      SERVICE DATA       │
├─────────────────────────┤       ├─────────────────────────┤
│ PK  id (user_id)        │       │ PK  id (service_id)     │
│     name                │       │     name (service_name) │
│     email (unique)      │       │     code (e.g. DOC-VER) │
│     phone               │       │     tokenPrefix (A, B)  │
│     passwordHash        │◄──┐   │ FK  departmentId        │
│     role (ENUM)         │   │   │     averageDuration     │
│     departmentId (FK)   │   │   │     dailyLimit          │
│     isActive            │   │   │     isActive            │
└────────────┬────────────┘   │   └────────────┬────────────┘
             │                │                │
             │ 1              │                │ 1
             │                │                │
             ▼ N              │                ▼ N
┌─────────────────────────┐   │   ┌─────────────────────────┐
│    APPOINTMENT DATA     │   │   │       TOKEN DATA        │
├─────────────────────────┤   │   ├─────────────────────────┤
│ PK  id (appointment_id) │   │   │ PK  id (token_id)       │
│ FK  userId ─────────────┼───┘   │     tokenNumber (A-027) │
│ FK  serviceId ──────────┼───┐   │ FK  userId (nullable)   │
│ FK  departmentId        │   │   │ FK  serviceId           │
│     appointmentDate     │   │   │ FK  departmentId        │
│     startTime           │   │   │ FK  counterId (nullable)│
│     endTime             │   │   │ FK  appointmentId       │
│     status (ENUM)       │   │   │     queuePosition       │
│     checkInTime         │   │   │     estimatedWait (min) │
└────────────┬────────────┘   │   │     status (ENUM)       │
             │                │   │     isPriority          │
             │ 1 (optional)   │   │     calledAt            │
             ▼ 1              │   │     completedAt         │
      [ Linked Token ]        │   └────────────▲────────────┘
                              │                │
                              │                │ 1 (current)
                              ▼ N              │
                   ┌─────────────────────────┐ │
                   │      COUNTER DATA       │ │
                   ├─────────────────────────┤ │
                   │ PK  id (counter_id)     │ │
                   │     counterNumber       │ │
                   │ FK  departmentId        │ │
                   │ FK  assignedStaffId     │ │
                   │ FK  serviceId ──────────┼─┘
                   │     currentTokenId ─────┼─┘
                   │     status (ENUM)       │
                   └─────────────────────────┘
```

---

### 2.2 Table Field Definitions & Invariants

#### 1. User Data
- **`id`** (`TEXT`, PK): Universally unique identifier (UUID).
- **`name`** (`TEXT`): Full legal/display name.
- **`email`** (`TEXT`, Unique): Primary login credential, normalized to lowercase.
- **`phone`** (`TEXT`, Nullable): Contact phone for SMS/WhatsApp notifications.
- **`passwordHash`** (`TEXT`): Bcrypt salted hash (cost factor 12).
- **`role`** (`ENUM`): `CUSTOMER` | `STAFF` | `MANAGER` | `ADMIN`.
- **`departmentId`** (`TEXT`, FK, Nullable): Foreign key to Department. Scopes Staff and Managers.
- **`isActive`** (`BOOLEAN`): Account active status. Deactivated users cannot log in.
- **`lastLoginAt`** (`TIMESTAMP`, Nullable): Security audit timestamp.

#### 2. Service Data
- **`id`** (`TEXT`, PK): Unique service identifier (e.g. `srv-doc-verif`).
- **`name`** (`TEXT`): Descriptive name (e.g., "Document Verification", "Certificate Verification").
- **`code`** (`TEXT`): Uppercase short code (e.g. `DOC-VERIF`, `CERT-VERIF`).
- **`tokenPrefix`** (`TEXT`): Single letter prefix used in ticket dispenser (`A` for `A-027`).
- **`departmentId`** (`TEXT`, FK): The parent administrative department.
- **`averageDuration`** (`INTEGER`): Expected service duration in minutes (e.g., 5, 10, 20). Feeds the wait-time algorithm.
- **`dailyLimit`** (`INTEGER`, Nullable): Capacity cap per calendar day.
- **`isActive`** (`BOOLEAN`): Whether customers can select this service.

#### 3. Counter Data
- **`id`** (`TEXT`, PK): Unique counter identifier (e.g. `ctr-01`).
- **`counterNumber`** (`TEXT`): Human-readable label (e.g., "Counter 1", "Counter 2", "Counter 3").
- **`departmentId`** (`TEXT`, FK): Department owning this counter.
- **`assignedStaffId`** (`TEXT`, FK, Nullable): Staff currently logged in and assigned.
- **`serviceId`** (`TEXT`, FK, Nullable): Service currently handled at this counter.
- **`currentTokenId`** (`TEXT`, Nullable): Token currently being served.
- **`status`** (`ENUM`): `AVAILABLE` | `BUSY` | `BREAK` | `CLOSED`.

#### 4. Appointment Data
- **`id`** (`TEXT`, PK): Unique appointment identifier.
- **`appointmentNumber`** (`TEXT`, Unique): Reference code (e.g., `APT-20261001-001`).
- **`userId`** (`TEXT`, FK): Registered customer who booked.
- **`serviceId`** (`TEXT`, FK): Targeted service.
- **`departmentId`** (`TEXT`, FK): Targeted department.
- **`appointmentDate`** (`TIMESTAMP`): Calendar date of the slot.
- **`startTime`** (`TEXT`): Time slot start (24h format, e.g. `09:30`).
- **`endTime`** (`TEXT`): Time slot end (24h format, e.g. `10:00`).
- **`status`** (`ENUM`):
  - `BOOKED`: Initial user reservation.
  - `CONFIRMED`: System/manager accepted.
  - `CHECKED_IN`: Customer arrived within check-in window.
  - `WAITING`: Transferred to active queue.
  - `IN_SERVICE`: Currently at the counter.
  - `COMPLETED`: Finished and logged.
  - `CANCELLED`: Cancelled by user before deadline.
  - `MISSED`: Failed to check in within &plusmn;10 min window.
  - `RESCHEDULED`: Moved to another slot.
  - `DELAYED`: Department experiencing delays.
- **`checkInTime`** (`TIMESTAMP`, Nullable): Exact arrival timestamp.

#### 5. Token Data
- **`id`** (`TEXT`, PK): Unique token identifier.
- **`tokenNumber`** (`TEXT`): Printed ticket number (e.g., `A-027`).
- **`userId`** (`TEXT`, FK, Nullable): Linked user account (null for walk-in anonymous kiosk users).
- **`serviceId`** (`TEXT`, FK): Requested service.
- **`departmentId`** (`TEXT`, FK): Assigned department.
- **`counterId`** (`TEXT`, FK, Nullable): Assigned counter when called.
- **`appointmentId`** (`TEXT`, FK, Unique, Nullable): Associated scheduled appointment.
- **`queuePosition`** (`INTEGER`): Zero-based or 1-based order in active queue.
- **`estimatedWait`** (`INTEGER`): Dynamic estimated wait time in minutes.
- **`status`** (`ENUM`):
  - `WAITING`: In line.
  - `CALLED`: Flashed on public board & staff desk ("Token A-027 -> Counter 3").
  - `IN_SERVICE`: Customer at counter.
  - `COMPLETED`: Service finished.
  - `SKIPPED`: Customer temporarily absent, pushed back.
  - `MISSED`: Customer failed to appear after multiple calls.
  - `CANCELLED`: Abandoned by visitor.
- **`isPriority`** (`BOOLEAN`): Elderly / disability / VIP expedited flag.
- **`calledAt`** (`TIMESTAMP`, Nullable): Timestamp of first staff call.
- **`completedAt`** (`TIMESTAMP`, Nullable): Timestamp service concluded.

---

## 3. System Architecture Specification

```
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                                   CLIENT LAYER (Vite SPA)                                 │
├──────────────────────────┬──────────────────────────┬─────────────────────────────────────┤
│  Customer Mobile/Web     │  Staff Counter Desk      │  Public Display & TV Kiosk          │
│  - Book Appointment      │  - Next Token Caller     │  - Now Serving Big Board            │
│  - Walk-in Token Ticket  │  - Start/Finish/Skip/Miss│  - Audio Chime Announcer            │
│  - Live Wait-Time Radar  │  - Counter Pause/Break   │  - Self-Service Ticket Dispenser    │
└──────────────────────────┴──────────────────────────┴─────────────────────────────────────┘
                                           │
                                           ▼ (HTTPS / JSON / Bearer JWT)
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                                    API GATEWAY (Express)                                  │
├───────────────────────────────────────────────────────────────────────────────────────────┤
│  - JWT Bearer Token Authenticator & Cookie Rotation Engine                                │
│  - Role-Based Access Control (RBAC: CUSTOMER, STAFF, MANAGER, ADMIN)                      │
│  - Department Scope Guard (Isolates managers & staff to assigned dept)                    │
│  - Rate Limiting (Brute-force protection on auth & ticket issuance)                       │
│  - Structured Zod Schema Request Validation & Sanitization                                │
└───────────────────────────────────────────────────────────────────────────────────────────┘
                                           │
                    ┌──────────────────────┴──────────────────────┐
                    ▼                                             ▼
┌─────────────────────────────────────────┐   ┌─────────────────────────────────────────────┐
│          APPOINTMENT MANAGER            │   │           QUEUE & TOKEN MANAGER             │
├─────────────────────────────────────────┤   ├─────────────────────────────────────────────┤
│ - Slot Generation Engine                │   │ - Sequential Ticket Dispenser (A-001..Z-999)│
│ - Capacity Limiter (prevent overbooking)│   │ - Live FIFO / Priority Queue Ordering       │
│ - Check-In Window Guard (±10 minutes)   │   │ - Smart Wait Time Calculation Engine        │
│ - No-Show Auto-Expiration Pipeline      │   │ - Counter Dispatcher (Active vs Closed)     │
│ - Rescheduling & Conflict Resolution    │   │ - Recall & Skip Redistribution Engine       │
└─────────────────────────────────────────┘   └─────────────────────────────────────────────┘
                    │                                             │
                    └──────────────────────┬──────────────────────┘
                                           ▼
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                                   DATABASE PERSISTENCE                                    │
├───────────────────────────────────────────────────────────────────────────────────────────┤
│  Supabase Managed PostgreSQL                                                              │
│  - Transaction Pooler (Port 6543 / PgBouncer) for high-concurrency API calls              │
│  - Direct Connection (Port 5432) for Schema Migrations & DDL                              │
│  - ACID Transactions for Token Sequence & Counter State Consistency                       │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Core Algorithmic Logic

### 4.1 Smart Waiting Time Calculation Algorithm (Section 4)
Instead of displaying a static number, QueueCraft dynamically computes:

$$\text{Estimated Wait Time} = \frac{\text{People Ahead} \times \text{Average Service Duration}}{\text{Active Counters}}$$

**Dynamic Adjustments**:
1. **Counter Closure**: If Counter 3 transitions from `AVAILABLE` &rarr; `CLOSED` or `BREAK`, the number of active counters drops immediately, and wait times for remaining waiting tokens update automatically.
2. **Priority Tokens**: Priority tokens are inserted at the head of the pending queue, adjusting the `queuePosition` of standard tickets behind them.
3. **Service Velocity Weighting**: If recent completed tokens for a service took less or more time than `averageDuration`, an exponential moving average (EMA) dampens wait time volatility.

### 4.2 Check-In Window Algorithm (Section 7)
For a scheduled appointment at $T_{\text{appointment}}$:
- **Valid Check-In Interval**: $[T_{\text{appointment}} - 10\text{ min}, T_{\text{appointment}} + 10\text{ min}]$
- If customer checks in before $T - 10\text{ min}$: System prompts: *"Check-in opens 10 minutes prior to your time slot."*
- If customer arrives within window: Appointment status changes to `CHECKED_IN`, and a queue `Token` is automatically minted with high priority.
- If customer fails to check in by $T + 10\text{ min}$: Background job flags appointment as `MISSED`, releasing the counter capacity.

---

## 5. End-to-End Workflow Sequences

### Flow A: Walk-In Digital Token (Section 3 & 4)
```
Customer/Kiosk                   Queue Manager                 Database                 Staff Counter
      │                                │                           │                          │
      │── 1. Select Service (Doc Ver) ─>│                           │                          │
      │                                │── 2. Read Active Counters─>│                          │
      │                                │<─ 2 Active (Ctr 1, Ctr 2) ─│                          │
      │                                │                           │                          │
      │                                │── 3. Calculate Wait Time ──│                          │
      │                                │   (6 ahead * 10m / 2 = 18m)│                          │
      │                                │                           │                          │
      │                                │── 4. Mint Token "A-027" ──>│                          │
      │<─ 5. Return Ticket A-027 ──────│                           │                          │
      │      (Wait: 18m, Ahead: 6)     │                           │                          │
      │                                │                           │                          │
      │                                │                           │<── 6. Click "Call Next" ─│
      │                                │<── 7. Counter 1 Calls ────│                          │
      │                                │── 8. Token A-027 CALLED ──>│                          │
      │<─ 9. Audio/Visual Notification─│                           │                          │
      │   "A-027 please proceed to Ctr1│                           │                          │
```

### Flow B: Scheduled Appointment Lifecycle (Section 3 & 5)
```
Customer Portal                  Appt Manager                  Database                 Public Queue
      │                                │                           │                          │
      │── 1. Select Service & Date ────>│                           │                          │
      │                                │── 2. Query Free Slots ────>│                          │
      │<─ 3. Return Available Slots ───│                           │                          │
      │                                │                           │                          │
      │── 4. Book Slot (09:30-10:00) ──>│                           │                          │
      │                                │── 5. Insert Appointment ──>│                          │
      │<─ 6. Confirmed: APT-001 ───────│                           │                          │
      │                                │                           │                          │
   [ Day of Appointment: 09:25 ]       │                           │                          │
      │── 7. Customer Clicks Check-In ─>│                           │                          │
      │                                │── 8. Check Window (±10m) ─│                          │
      │                                │── 9. Status = CHECKED_IN ─>│                          │
      │                                │── 10. Generate Priority ──>│── 11. Enqueue Ticket ──>│
      │<─ 12. Token A-015 Issued ──────│       Token               │                          │
```

---

## 6. Directory Structure & Implementation Mapping

```
/
├── docs/
│   ├── architecture.md           # This comprehensive architecture document
│   ├── auth.md                   # Chunk 2 Authentication & Supabase setup
│   └── test-checklist.md         # Verification checklist
│
├── server/
│   ├── prisma/
│   │   ├── schema.prisma         # Full Section 8 data model (User, Dept, Service, Counter, Appointment, Token)
│   │   ├── migrations/
│   │   │   ├── 20261001000000_init/              # Initial Auth & Identity migration
│   │   │   └── 20261001010000_section8_models/   # Section 8 Services, Counters, Appointments, Tokens
│   │   └── seed-section8.js      # Populates Section 8 models into live Supabase Postgres
│   └── src/
│       ├── lib/
│       │   └── prisma.ts         # Dual-mode database client (Supabase PostgreSQL / In-Memory Fallback)
│       ├── types/
│       │   └── section8.ts       # TypeScript models for Service, Counter, Appointment, Token
│       └── services/
│           ├── appointment.service.ts # Appointment slot allocation & check-in window
│           └── queue.service.ts       # Token generation, FIFO queue, wait-time estimator
│
└── src/
    └── pages/
        └── ArchitectureView.tsx  # Interactive visual data model & architecture explorer in UI
```
