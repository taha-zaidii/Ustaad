-- ============================================================================
-- Migration: 2026-05-24  —  add escrow payments table + provider tracking
--
-- Idempotent + additive: every CREATE uses IF NOT EXISTS, the type uses
-- a DO-block guard, the trigger drops-then-creates. Re-runnable safely.
--
-- Adds:
--   1. payment_status_enum  (held → released | refunded | cancelled)
--   2. payment_provider_enum (stripe | easypaisa | jazzcash | mock)
--   3. payments table — one row per escrow lifecycle
--   4. Indexes for the two access patterns used by the API:
--        a. by job_id (job detail page)
--        b. by client_id / freelancer_id (user payment history)
--   5. touch_updated_at trigger
--
-- Tables touched: NONE — this only adds new objects. Existing data is
-- not modified.
-- ============================================================================

BEGIN;

-- ── 1. ENUM TYPES ────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE payment_status_enum AS ENUM
    ('held', 'released', 'refunded', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_provider_enum AS ENUM
    ('stripe', 'easypaisa', 'jazzcash', 'mock');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── 2. PAYMENTS TABLE ────────────────────────────────────────────────────────
-- One row per escrow lifecycle. The client funds the escrow when a
-- proposal is accepted (status='held'); on completion the client (or
-- an admin in dispute) releases it to the freelancer; on cancellation
-- the funds go back to the client.
--
-- amount is stored in the smallest currency unit (paisa for PKR, cents
-- for USD) as an integer to avoid floating-point rounding bugs.
CREATE TABLE IF NOT EXISTS public.payments (
  id               UUID                   PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id           UUID                   NOT NULL REFERENCES public.jobs(id)     ON DELETE CASCADE,
  client_id        UUID                   NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  freelancer_id    UUID                   NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  proposal_id      UUID                            REFERENCES public.proposals(id) ON DELETE SET NULL,

  amount_minor     BIGINT                 NOT NULL CHECK (amount_minor > 0),
  currency         CHAR(3)                NOT NULL DEFAULT 'PKR',

  provider         payment_provider_enum  NOT NULL,
  provider_ref     TEXT,                                  -- e.g. Stripe PaymentIntent id
  status           payment_status_enum    NOT NULL DEFAULT 'held',

  -- Lifecycle timestamps. Held is set on row creation; the others are
  -- written by state transitions only.
  held_at          TIMESTAMPTZ            NOT NULL DEFAULT NOW(),
  released_at      TIMESTAMPTZ,
  refunded_at      TIMESTAMPTZ,
  cancelled_at     TIMESTAMPTZ,

  -- Free-form audit fields. Useful when an admin reverses a decision.
  note             TEXT,
  metadata         JSONB                  NOT NULL DEFAULT '{}'::jsonb,

  created_at       TIMESTAMPTZ            NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ            NOT NULL DEFAULT NOW()
);

-- ── 3. INDEXES ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_payments_job_id        ON public.payments (job_id);
CREATE INDEX IF NOT EXISTS idx_payments_client_id     ON public.payments (client_id);
CREATE INDEX IF NOT EXISTS idx_payments_freelancer_id ON public.payments (freelancer_id);
CREATE INDEX IF NOT EXISTS idx_payments_status        ON public.payments (status);
CREATE INDEX IF NOT EXISTS idx_payments_provider_ref  ON public.payments (provider_ref)
  WHERE provider_ref IS NOT NULL;


-- ── 4. updated_at TRIGGER ────────────────────────────────────────────────────
-- touch_updated_at() is defined in schema.sql. We just bind it.
DROP TRIGGER IF EXISTS trg_payments_touch ON public.payments;
CREATE TRIGGER trg_payments_touch
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


COMMIT;

-- ============================================================================
-- End of 2026-05-24_payments.sql
-- ============================================================================
