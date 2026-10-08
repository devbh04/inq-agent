-- ==============================================================================
-- EXIMPLE SHUBH VOICE AGENT - SUPABASE PRODUCTION DATABASE SCHEMA
-- ==============================================================================
-- Run this script in your Supabase SQL Editor (https://supabase.com/dashboard).
-- It is idempotent: safe to run on brand-new or existing Supabase projects.
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. INQUIRIES TABLE
-- Stores ocean freight inquiries captured by Shubh voice agent
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    caller_number TEXT DEFAULT 'unknown',
    company_name TEXT NOT NULL,
    pol TEXT NOT NULL,                          -- Port of Loading / Origin (e.g. Nhava Sheva / JNPT, Mundra)
    pod TEXT NOT NULL,                          -- Port of Discharge / Destination (e.g. Jebel Ali, Rotterdam)
    cargo TEXT NOT NULL,                        -- Cargo commodity / description
    load_type TEXT NOT NULL DEFAULT 'FCL' CHECK (load_type IN ('FCL', 'LCL')), -- Full vs Less than Container Load
    container_type TEXT NOT NULL,               -- e.g. 20GP, 40GP, 40HC, Reefer, ISO Tank, LCL
    inquiry_type TEXT NOT NULL DEFAULT 'full_inquiry' CHECK (inquiry_type IN ('rate_only', 'full_inquiry')),
    status TEXT NOT NULL DEFAULT 'sales_assigned' CHECK (status IN ('new', 'processing', 'rates_calculated', 'sales_assigned', 'completed')),
    notes TEXT,
    transcript JSONB DEFAULT '[]'::jsonb,       -- Full turn-by-turn conversation transcript
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Idempotent column additions for existing databases
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS load_type TEXT NOT NULL DEFAULT 'FCL';
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS transcript JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS caller_number TEXT DEFAULT 'unknown';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_inquiries_session_id ON public.inquiries (session_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON public.inquiries (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON public.inquiries (status);
CREATE INDEX IF NOT EXISTS idx_inquiries_company_name ON public.inquiries (company_name);


-- ==============================================================================
-- 2. CALL SESSIONS & COST TRACKING TABLE
-- Stores telecom pulse counts, Sarvam model usage, latencies, transcripts, and costs
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.call_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT UNIQUE NOT NULL,
    room_name TEXT NOT NULL,
    caller_identity TEXT DEFAULT 'unknown',
    call_direction TEXT DEFAULT 'inbound' CHECK (call_direction IN ('inbound', 'outbound', 'webrtc')),
    duration_seconds NUMERIC(10, 2) NOT NULL DEFAULT 0,
    telephony_pulses INTEGER NOT NULL DEFAULT 0,
    telephony_pulse_rate_inr NUMERIC(10, 2) NOT NULL DEFAULT 0.45, -- ₹0.45 per 60s pulse block
    telephony_cost_inr NUMERIC(10, 4) NOT NULL DEFAULT 0,          -- Calculated pulse total
    stt_audio_seconds NUMERIC(10, 2) NOT NULL DEFAULT 0,
    stt_cost_inr NUMERIC(10, 4) NOT NULL DEFAULT 0,                -- Sarvam Saaras (₹30/hour)
    llm_prompt_tokens INTEGER NOT NULL DEFAULT 0,
    llm_completion_tokens INTEGER NOT NULL DEFAULT 0,
    llm_cost_inr NUMERIC(10, 4) NOT NULL DEFAULT 0,                -- Sarvam-105B (₹29.28 in / ₹73.20 out per 1M)
    tts_characters INTEGER NOT NULL DEFAULT 0,
    tts_cost_inr NUMERIC(10, 4) NOT NULL DEFAULT 0,                -- Sarvam Bulbul v3 (₹30/10k characters)
    total_cost_inr NUMERIC(10, 4) NOT NULL DEFAULT 0,
    latency_p50_ms NUMERIC(10, 2),
    latency_p95_ms NUMERIC(10, 2),
    transcript JSONB DEFAULT '[]'::jsonb,                          -- Full session transcript with timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Idempotent column additions for existing databases
ALTER TABLE public.call_sessions ADD COLUMN IF NOT EXISTS telephony_pulse_rate_inr NUMERIC(10, 2) NOT NULL DEFAULT 0.45;
ALTER TABLE public.call_sessions ADD COLUMN IF NOT EXISTS transcript JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.call_sessions ADD COLUMN IF NOT EXISTS call_direction TEXT DEFAULT 'inbound';
ALTER TABLE public.call_sessions ADD COLUMN IF NOT EXISTS latency_p50_ms NUMERIC(10, 2);
ALTER TABLE public.call_sessions ADD COLUMN IF NOT EXISTS latency_p95_ms NUMERIC(10, 2);

-- Indexes for session lookups and reporting
CREATE INDEX IF NOT EXISTS idx_call_sessions_session_id ON public.call_sessions (session_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_created_at ON public.call_sessions (created_at DESC);


-- ==============================================================================
-- 3. AUTOMATIC UPDATED_AT TRIGGER
-- Automatically keeps updated_at synchronized on edits
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_inquiries_updated_at ON public.inquiries;
CREATE TRIGGER trigger_inquiries_updated_at
    BEFORE UPDATE ON public.inquiries
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();


-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- Enables secure reads and writes for backend service role and anon clients
-- ==============================================================================
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;

-- Inquiries RLS Policies
DROP POLICY IF EXISTS "Allow public read access on inquiries" ON public.inquiries;
CREATE POLICY "Allow public read access on inquiries"
    ON public.inquiries FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow public insert on inquiries" ON public.inquiries;
CREATE POLICY "Allow public insert on inquiries"
    ON public.inquiries FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on inquiries" ON public.inquiries;
CREATE POLICY "Allow public update on inquiries"
    ON public.inquiries FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Call Sessions RLS Policies
DROP POLICY IF EXISTS "Allow public read access on call_sessions" ON public.call_sessions;
CREATE POLICY "Allow public read access on call_sessions"
    ON public.call_sessions FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow public insert on call_sessions" ON public.call_sessions;
CREATE POLICY "Allow public insert on call_sessions"
    ON public.call_sessions FOR INSERT
    WITH CHECK (true);


-- ==============================================================================
-- 5. REALTIME SUBSCRIPTIONS
-- Enables instant live feed updates in the Next.js operational dashboard
-- ==============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'inquiries'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.inquiries;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'call_sessions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.call_sessions;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;
