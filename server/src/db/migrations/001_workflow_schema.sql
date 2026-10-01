-- ==============================================================================
-- APPOINTMENT & DIGITAL QUEUE WORKFLOW SCHEMA MIGRATION
-- ==============================================================================

-- 1. Enums
DO $$ BEGIN
    CREATE TYPE appointment_status AS ENUM (
        'booked', 'confirmed', 'checked_in', 'waiting', 
        'in_service', 'completed', 'cancelled', 'missed', 
        'rescheduled', 'delayed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE token_status AS ENUM (
        'waiting', 'called', 'in_service', 'completed', 
        'skipped', 'missed', 'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE counter_status_enum AS ENUM (
        'available', 'busy', 'break', 'closed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'CUSTOMER',
    department_id TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Departments table
CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    working_hours TEXT DEFAULT '09:00 - 17:00',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Services table
CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    department_id TEXT NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    code_prefix TEXT NOT NULL DEFAULT 'A',
    avg_duration_min INTEGER NOT NULL DEFAULT 15,
    description TEXT,
    daily_limit INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Counters table
CREATE TABLE IF NOT EXISTS counters (
    id TEXT PRIMARY KEY,
    counter_number TEXT NOT NULL,
    department_id TEXT NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    assigned_staff_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'closed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Counter Services mapping
CREATE TABLE IF NOT EXISTS counter_services (
    counter_id TEXT NOT NULL REFERENCES counters(id) ON DELETE CASCADE,
    service_id TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    PRIMARY KEY (counter_id, service_id)
);

-- 7. Appointment Slots table
CREATE TABLE IF NOT EXISTS appointment_slots (
    id TEXT PRIMARY KEY,
    service_id TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    max_capacity INTEGER NOT NULL DEFAULT 6,
    booked_count INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT chk_booked_capacity CHECK (booked_count <= max_capacity),
    CONSTRAINT uq_service_slot UNIQUE (service_id, date, start_time)
);
CREATE INDEX IF NOT EXISTS idx_slots_service_date ON appointment_slots (service_id, date);

-- 8. Appointments table
CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY,
    appointment_number TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    service_id TEXT NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
    slot_id TEXT NOT NULL REFERENCES appointment_slots(id) ON DELETE RESTRICT,
    status appointment_status NOT NULL DEFAULT 'booked',
    check_in_time TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_appointments_user ON appointments (user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_slot ON appointments (slot_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments (status);

-- Partial unique index: A user has at most one active appointment per slot
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_active_slot 
ON appointments (user_id, slot_id) 
WHERE status NOT IN ('cancelled', 'missed');

-- 9. Daily Token Counters (Atomic dispenser table)
CREATE TABLE IF NOT EXISTS daily_token_counters (
    service_id TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    last_number INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (service_id, date)
);

-- 10. Tokens table
CREATE TABLE IF NOT EXISTS tokens (
    id TEXT PRIMARY KEY,
    token_number TEXT NOT NULL,
    user_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
    service_id TEXT NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
    department_id TEXT NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    appointment_id TEXT UNIQUE REFERENCES appointments(id) ON DELETE SET NULL,
    status token_status NOT NULL DEFAULT 'waiting',
    priority INTEGER NOT NULL DEFAULT 0,
    queue_position INTEGER NOT NULL DEFAULT 0,
    estimated_wait_min INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    called_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tokens_service_status ON tokens (service_id, status);
CREATE INDEX IF NOT EXISTS idx_tokens_queue_order ON tokens (priority DESC, created_at ASC);

-- Partial unique index: One active token per user per service
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_active_token_service 
ON tokens (user_id, service_id) 
WHERE user_id IS NOT NULL AND status IN ('waiting', 'called', 'in_service');

-- 11. Token Counters table (historical counter calls)
CREATE TABLE IF NOT EXISTS token_counters (
    id TEXT PRIMARY KEY,
    token_id TEXT NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
    counter_id TEXT NOT NULL REFERENCES counters(id) ON DELETE CASCADE,
    called_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 12. Booking Rules table
CREATE TABLE IF NOT EXISTS booking_rules (
    id TEXT PRIMARY KEY,
    department_id TEXT REFERENCES departments(id) ON DELETE CASCADE,
    service_id TEXT REFERENCES services(id) ON DELETE CASCADE,
    check_in_window_min INTEGER NOT NULL DEFAULT 10,
    max_active_tokens_per_user INTEGER NOT NULL DEFAULT 1,
    cancellation_deadline_hours INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, read);

-- 14. Activity Logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,
    actor_id TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs (entity_type, entity_id);

-- Enable Supabase Realtime publication on tokens and appointments
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE tokens;
EXCEPTION
    WHEN others THEN null;
END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
EXCEPTION
    WHEN others THEN null;
END $$;
