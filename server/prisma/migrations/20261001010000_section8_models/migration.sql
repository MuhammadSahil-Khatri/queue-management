-- ==============================================================================
-- SECTION 8 DATA MODEL MIGRATION (Digital Queue & Appointment Management)
-- ==============================================================================

-- Create Enums if not exists
DO $$ BEGIN
    CREATE TYPE "CounterStatus" AS ENUM ('AVAILABLE', 'BUSY', 'BREAK', 'CLOSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "AppointmentStatus" AS ENUM (
        'BOOKED', 'CONFIRMED', 'CHECKED_IN', 'WAITING', 
        'IN_SERVICE', 'COMPLETED', 'CANCELLED', 'MISSED', 
        'RESCHEDULED', 'DELAYED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "TokenStatus" AS ENUM (
        'WAITING', 'CALLED', 'IN_SERVICE', 'COMPLETED', 
        'SKIPPED', 'MISSED', 'CANCELLED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Alter Department to include workingHours if needed
ALTER TABLE "Department" ADD COLUMN IF NOT EXISTS "workingHours" TEXT DEFAULT '09:00 - 17:00';

-- 1. Create Service Table (Section 8)
-- Fields: service_id, service_name, department_id, average_duration, active_status
CREATE TABLE IF NOT EXISTS "Service" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "tokenPrefix" TEXT NOT NULL DEFAULT 'A',
    "departmentId" TEXT NOT NULL,
    "averageDuration" INTEGER NOT NULL DEFAULT 15,
    "description" TEXT,
    "dailyLimit" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Service_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Service_departmentId_code_key" ON "Service"("departmentId", "code");
CREATE INDEX IF NOT EXISTS "Service_departmentId_idx" ON "Service"("departmentId");
CREATE INDEX IF NOT EXISTS "Service_isActive_idx" ON "Service"("isActive");

-- 2. Create Counter Table (Section 8)
-- Fields: counter_id, department_id, assigned_staff, service_type, current_token, status
CREATE TABLE IF NOT EXISTS "Counter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "counterNumber" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "assignedStaffId" TEXT,
    "serviceId" TEXT,
    "currentTokenId" TEXT,
    "status" "CounterStatus" NOT NULL DEFAULT 'CLOSED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Counter_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Counter_assignedStaffId_fkey" FOREIGN KEY ("assignedStaffId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Counter_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Counter_departmentId_idx" ON "Counter"("departmentId");
CREATE INDEX IF NOT EXISTS "Counter_assignedStaffId_idx" ON "Counter"("assignedStaffId");
CREATE INDEX IF NOT EXISTS "Counter_status_idx" ON "Counter"("status");

-- 3. Create Appointment Table (Section 8)
-- Fields: appointment_id, user_id, service_id, appointment_date, start_time, end_time, appointment_status, check_in_time
CREATE TABLE IF NOT EXISTS "Appointment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appointmentNumber" TEXT NOT NULL UNIQUE,
    "userId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "appointmentDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'BOOKED',
    "checkInTime" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Appointment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Appointment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Appointment_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Appointment_userId_idx" ON "Appointment"("userId");
CREATE INDEX IF NOT EXISTS "Appointment_serviceId_idx" ON "Appointment"("serviceId");
CREATE INDEX IF NOT EXISTS "Appointment_departmentId_idx" ON "Appointment"("departmentId");
CREATE INDEX IF NOT EXISTS "Appointment_appointmentDate_idx" ON "Appointment"("appointmentDate");
CREATE INDEX IF NOT EXISTS "Appointment_status_idx" ON "Appointment"("status");

-- 4. Create Token Table (Section 8)
-- Fields: token_id, token_number, user_id, service_id, queue_position, estimated_wait, token_status, created_at
CREATE TABLE IF NOT EXISTS "Token" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenNumber" TEXT NOT NULL,
    "userId" TEXT,
    "serviceId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "counterId" TEXT,
    "appointmentId" TEXT UNIQUE,
    "queuePosition" INTEGER NOT NULL DEFAULT 1,
    "estimatedWait" INTEGER NOT NULL DEFAULT 0,
    "status" "TokenStatus" NOT NULL DEFAULT 'WAITING',
    "isPriority" BOOLEAN NOT NULL DEFAULT false,
    "calledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Token_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Token_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Token_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Token_counterId_fkey" FOREIGN KEY ("counterId") REFERENCES "Counter"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Token_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Token_departmentId_status_idx" ON "Token"("departmentId", "status");
CREATE INDEX IF NOT EXISTS "Token_serviceId_idx" ON "Token"("serviceId");
CREATE INDEX IF NOT EXISTS "Token_counterId_idx" ON "Token"("counterId");
CREATE INDEX IF NOT EXISTS "Token_tokenNumber_idx" ON "Token"("tokenNumber");
CREATE INDEX IF NOT EXISTS "Token_createdAt_idx" ON "Token"("createdAt");
