-- ============================================================================
-- Ustaad — E-Mazdoor : Database Schema (Postgres / Supabase)
--
-- Single, idempotent SQL file. Generated to align 1:1 with every column,
-- table, and query referenced from:
--   • app/api/**/route.ts        (controllers)
--   • lib/repositories/*.ts      (repository layer)
--   • lib/patterns/Singleton.ts  (Supabase JS adapter + pg_execute RPC)
--
-- Run order
--   1. Apply this file in the Supabase SQL editor (or `psql -f schema.sql`).
--   2. The pg_execute RPC at the bottom is required by the Supabase JS
--      adapter in lib/patterns/Singleton.ts when DATABASE_URL is absent.
--
-- This file is intentionally re-runnable: every CREATE uses IF NOT EXISTS,
-- every TRIGGER drops itself first, and seed inserts use ON CONFLICT DO NOTHING.
--
-- SRS reference: §4 (Functional Requirements REQ-1 … REQ-10), §5 (Non-Functional)
-- ============================================================================

BEGIN;

-- ── 0. EXTENSIONS ────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- ILIKE / trigram search on titles
CREATE EXTENSION IF NOT EXISTS "citext";     -- case-insensitive emails


-- ── 1. SHARED TYPES ──────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE user_type_enum AS ENUM ('client', 'freelancer', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE job_status_enum AS ENUM
    ('draft', 'open', 'bidding', 'assigned', 'in_progress', 'completed', 'cancelled', 'disputed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE budget_type_enum AS ENUM ('fixed', 'hourly');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE proposal_status_enum AS ENUM ('pending', 'accepted', 'rejected', 'withdrawn');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── 2. HELPER FUNCTIONS ──────────────────────────────────────────────────────
-- Auto-stamp updated_at on every UPDATE
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;


-- ── 3. CORE TABLES ───────────────────────────────────────────────────────────

-- 3.1 PROFILES — every user (Customer | Worker | Admin)
--     Mirrors columns referenced by:
--       app/api/profile/route.ts, app/api/freelancers/route.ts,
--       app/api/freelancers/[id]/route.ts, app/api/webhooks/clerk/route.ts,
--       lib/repositories/ProfileRepository.ts
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id        TEXT            UNIQUE NOT NULL,
  email           CITEXT          UNIQUE NOT NULL,
  full_name       TEXT,
  bio             TEXT,
  phone           TEXT,
  location        TEXT,
  user_type       user_type_enum  NOT NULL DEFAULT 'client',
  avatar_url      TEXT,
  hourly_rate     NUMERIC(10, 2)  DEFAULT 0,
  completed_jobs  INTEGER         NOT NULL DEFAULT 0,
  success_rate    NUMERIC(5, 2)   DEFAULT 0,
  response_time   TEXT,                       -- e.g. "30 min mein jawab"
  avg_rating      NUMERIC(3, 2)   DEFAULT 0,  -- denormalized aggregate
  review_count    INTEGER         NOT NULL DEFAULT 0,
  languages       TEXT[]          DEFAULT '{}',
  member_since    DATE            DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS profiles_clerk_id_idx   ON public.profiles (clerk_id);
CREATE INDEX IF NOT EXISTS profiles_user_type_idx  ON public.profiles (user_type);
CREATE INDEX IF NOT EXISTS profiles_location_idx   ON public.profiles USING gin (location gin_trgm_ops);
CREATE INDEX IF NOT EXISTS profiles_full_name_idx  ON public.profiles USING gin (full_name gin_trgm_ops);


-- 3.2 CLIENT_INFO — extra fields for client (REQ-2.x)
--     Referenced by app/api/jobs/[id]/route.ts (LEFT JOIN client_info ci ON p.id = ci.profile_id)
CREATE TABLE IF NOT EXISTS public.client_info (
  profile_id    UUID    PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_name  TEXT,
  jobs_posted   INTEGER NOT NULL DEFAULT 0,
  hire_rate     NUMERIC(5, 2)    DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS client_info_set_updated_at ON public.client_info;
CREATE TRIGGER client_info_set_updated_at
  BEFORE UPDATE ON public.client_info
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


-- 3.3 CATEGORIES — service taxonomy (Plumbing, Electrician, etc.)
--     Referenced by app/api/categories/route.ts, /api/jobs/route.ts,
--     /api/jobs/create/route.ts, JobRepository.listCategories
CREATE TABLE IF NOT EXISTS public.categories (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT    NOT NULL,
  slug        TEXT    UNIQUE NOT NULL,
  icon        TEXT,                      -- Lucide icon name, e.g. 'Zap'
  job_count   INTEGER NOT NULL DEFAULT 0,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS categories_slug_idx        ON public.categories (slug);
CREATE INDEX IF NOT EXISTS categories_job_count_idx   ON public.categories (job_count DESC);


-- 3.4 SKILLS — global skill dictionary
CREATE TABLE IF NOT EXISTS public.skills (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT    NOT NULL,
  slug        TEXT    UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS skills_slug_idx ON public.skills (slug);
CREATE INDEX IF NOT EXISTS skills_name_idx ON public.skills USING gin (name gin_trgm_ops);


-- 3.5 FREELANCER_SKILLS — m:n profile <-> skill
CREATE TABLE IF NOT EXISTS public.freelancer_skills (
  profile_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_id          UUID NOT NULL REFERENCES public.skills(id)   ON DELETE CASCADE,
  proficiency_level TEXT,
  PRIMARY KEY (profile_id, skill_id)
);

CREATE INDEX IF NOT EXISTS freelancer_skills_skill_idx ON public.freelancer_skills (skill_id);


-- 3.6 JOBS — primary domain table
--     Mirrors every column referenced from /api/jobs, /api/jobs/[id],
--     /api/jobs/create, /api/my-jobs, JobRepository
CREATE TABLE IF NOT EXISTS public.jobs (
  id                UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         UUID              NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id       UUID              REFERENCES public.categories(id) ON DELETE SET NULL,
  title             TEXT              NOT NULL,
  description       TEXT              NOT NULL,
  long_description  TEXT,
  budget_min        NUMERIC(12, 2)    NOT NULL,
  budget_max        NUMERIC(12, 2)    NOT NULL,
  budget_type       budget_type_enum  NOT NULL DEFAULT 'fixed',
  location          TEXT              NOT NULL,
  duration          TEXT,
  status            job_status_enum   NOT NULL DEFAULT 'open',
  proposals_count   INTEGER           NOT NULL DEFAULT 0,
  views_count       INTEGER           NOT NULL DEFAULT 0,
  is_urgent         BOOLEAN           NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ       NOT NULL DEFAULT NOW(),

  CONSTRAINT jobs_budget_range_chk CHECK (budget_min <= budget_max),
  CONSTRAINT jobs_budget_positive_chk CHECK (budget_min > 0)
);

DROP TRIGGER IF EXISTS jobs_set_updated_at ON public.jobs;
CREATE TRIGGER jobs_set_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS jobs_client_idx       ON public.jobs (client_id);
CREATE INDEX IF NOT EXISTS jobs_category_idx     ON public.jobs (category_id);
CREATE INDEX IF NOT EXISTS jobs_status_idx       ON public.jobs (status);
CREATE INDEX IF NOT EXISTS jobs_created_at_idx   ON public.jobs (created_at DESC);
CREATE INDEX IF NOT EXISTS jobs_status_created_idx ON public.jobs (status, created_at DESC);  -- list-open queries
CREATE INDEX IF NOT EXISTS jobs_location_idx     ON public.jobs USING gin (location gin_trgm_ops);
CREATE INDEX IF NOT EXISTS jobs_title_idx        ON public.jobs USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS jobs_description_idx  ON public.jobs USING gin (description gin_trgm_ops);


-- 3.7 JOB_SKILLS — m:n job <-> skill
CREATE TABLE IF NOT EXISTS public.job_skills (
  job_id    UUID NOT NULL REFERENCES public.jobs(id)   ON DELETE CASCADE,
  skill_id  UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  PRIMARY KEY (job_id, skill_id)
);

CREATE INDEX IF NOT EXISTS job_skills_skill_idx ON public.job_skills (skill_id);


-- 3.8 PROPOSALS — bid lifecycle (REQ-7.x)
CREATE TABLE IF NOT EXISTS public.proposals (
  id                UUID                  PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id            UUID                  NOT NULL REFERENCES public.jobs(id)     ON DELETE CASCADE,
  freelancer_id     UUID                  NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cover_letter      TEXT                  NOT NULL,
  proposed_budget   NUMERIC(12, 2)        NOT NULL,
  proposed_duration TEXT,
  status            proposal_status_enum  NOT NULL DEFAULT 'pending',
  created_at        TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ           NOT NULL DEFAULT NOW(),

  CONSTRAINT proposals_unique_per_freelancer UNIQUE (job_id, freelancer_id),
  CONSTRAINT proposals_budget_positive_chk    CHECK (proposed_budget > 0)
);

DROP TRIGGER IF EXISTS proposals_set_updated_at ON public.proposals;
CREATE TRIGGER proposals_set_updated_at
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS proposals_job_idx        ON public.proposals (job_id);
CREATE INDEX IF NOT EXISTS proposals_freelancer_idx ON public.proposals (freelancer_id);
CREATE INDEX IF NOT EXISTS proposals_status_idx     ON public.proposals (status);


-- 3.9 REVIEWS — ratings (REQ-7.x). One review per (job, client, freelancer).
CREATE TABLE IF NOT EXISTS public.reviews (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id         UUID         NOT NULL REFERENCES public.jobs(id)     ON DELETE CASCADE,
  client_id      UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  freelancer_id  UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating         INTEGER      NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment        TEXT,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT reviews_unique_per_job UNIQUE (job_id, client_id, freelancer_id)
);

CREATE INDEX IF NOT EXISTS reviews_freelancer_idx ON public.reviews (freelancer_id);
CREATE INDEX IF NOT EXISTS reviews_client_idx     ON public.reviews (client_id);
CREATE INDEX IF NOT EXISTS reviews_job_idx        ON public.reviews (job_id);


-- 3.10 EDUCATION — freelancer profile detail (referenced by /api/freelancers/[id])
CREATE TABLE IF NOT EXISTS public.education (
  id          UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID  NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  degree      TEXT  NOT NULL,
  institution TEXT,
  year        INTEGER,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS education_profile_idx ON public.education (profile_id);


-- 3.11 CERTIFICATIONS — referenced by /api/freelancers/[id]
CREATE TABLE IF NOT EXISTS public.certifications (
  id                    UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id            UUID    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name                  TEXT    NOT NULL,
  issuing_organization  TEXT,
  issue_date            DATE,
  credential_url        TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS certifications_profile_idx ON public.certifications (profile_id);


-- 3.12 PORTFOLIO — referenced by /api/freelancers/[id]
CREATE TABLE IF NOT EXISTS public.portfolio (
  id          UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID  NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       TEXT  NOT NULL,
  description TEXT,
  image_url   TEXT,
  project_url TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS portfolio_profile_idx ON public.portfolio (profile_id);


-- 3.13 PAYMENTS — escrow lifecycle (held → released | refunded | cancelled).
--      Funded by the client on proposal acceptance and released on
--      completion. amount_minor is the smallest currency unit (paisa for
--      PKR, cents for USD) stored as an integer to avoid rounding bugs.
--      Referenced by app/api/payments/**/route.ts and lib/payments/*.
DO $$ BEGIN
  CREATE TYPE payment_status_enum AS ENUM ('held', 'released', 'refunded', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_provider_enum AS ENUM ('stripe', 'easypaisa', 'jazzcash', 'mock');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.payments (
  id            UUID                   PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        UUID                   NOT NULL REFERENCES public.jobs(id)      ON DELETE CASCADE,
  client_id     UUID                   NOT NULL REFERENCES public.profiles(id)  ON DELETE RESTRICT,
  freelancer_id UUID                   NOT NULL REFERENCES public.profiles(id)  ON DELETE RESTRICT,
  proposal_id   UUID                            REFERENCES public.proposals(id) ON DELETE SET NULL,

  amount_minor  BIGINT                 NOT NULL CHECK (amount_minor > 0),
  currency      CHAR(3)                NOT NULL DEFAULT 'PKR',

  provider      payment_provider_enum  NOT NULL,
  provider_ref  TEXT,
  status        payment_status_enum    NOT NULL DEFAULT 'held',

  held_at       TIMESTAMPTZ            NOT NULL DEFAULT NOW(),
  released_at   TIMESTAMPTZ,
  refunded_at   TIMESTAMPTZ,
  cancelled_at  TIMESTAMPTZ,
  note          TEXT,
  metadata      JSONB                  NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ            NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ            NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_job_id        ON public.payments (job_id);
CREATE INDEX IF NOT EXISTS idx_payments_client_id     ON public.payments (client_id);
CREATE INDEX IF NOT EXISTS idx_payments_freelancer_id ON public.payments (freelancer_id);
CREATE INDEX IF NOT EXISTS idx_payments_status        ON public.payments (status);
CREATE INDEX IF NOT EXISTS idx_payments_provider_ref  ON public.payments (provider_ref)
  WHERE provider_ref IS NOT NULL;

DROP TRIGGER IF EXISTS trg_payments_touch ON public.payments;
CREATE TRIGGER trg_payments_touch
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


-- ── 4. DENORMALIZATION TRIGGERS ──────────────────────────────────────────────
-- Keep jobs.proposals_count and profiles.review_count / avg_rating in sync
-- so list-view queries don't have to aggregate on every render.

CREATE OR REPLACE FUNCTION public.sync_job_proposal_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.jobs SET proposals_count = proposals_count + 1 WHERE id = NEW.job_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.jobs SET proposals_count = GREATEST(proposals_count - 1, 0) WHERE id = OLD.job_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS proposals_sync_count ON public.proposals;
CREATE TRIGGER proposals_sync_count
  AFTER INSERT OR DELETE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.sync_job_proposal_count();


CREATE OR REPLACE FUNCTION public.sync_freelancer_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  fid UUID := COALESCE(NEW.freelancer_id, OLD.freelancer_id);
BEGIN
  UPDATE public.profiles
     SET avg_rating   = COALESCE((SELECT AVG(rating)::NUMERIC(3,2) FROM public.reviews WHERE freelancer_id = fid), 0),
         review_count = (SELECT COUNT(*) FROM public.reviews WHERE freelancer_id = fid)
   WHERE id = fid;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS reviews_sync_rating ON public.reviews;
CREATE TRIGGER reviews_sync_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.sync_freelancer_rating();


CREATE OR REPLACE FUNCTION public.sync_category_job_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.categories SET job_count = job_count + 1 WHERE id = NEW.category_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.categories SET job_count = GREATEST(job_count - 1, 0) WHERE id = OLD.category_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.category_id IS DISTINCT FROM OLD.category_id THEN
    UPDATE public.categories SET job_count = GREATEST(job_count - 1, 0) WHERE id = OLD.category_id;
    UPDATE public.categories SET job_count = job_count + 1 WHERE id = NEW.category_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS jobs_sync_category_count ON public.jobs;
CREATE TRIGGER jobs_sync_category_count
  AFTER INSERT OR UPDATE OF category_id OR DELETE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.sync_category_job_count();


-- ── 5. SEED DATA ─────────────────────────────────────────────────────────────
-- 12 service categories matching components/home/data.ts. Idempotent.

INSERT INTO public.categories (name, slug, icon, sort_order) VALUES
  ('Electrician',     'electrician',      'Zap',         10),
  ('Plumbing',        'plumbing',         'Droplets',    20),
  ('AC & Cooling',    'ac-refrigeration', 'Snowflake',   30),
  ('Construction',    'construction',     'HardHat',     40),
  ('Cleaning',        'cleaning',         'Sparkles',    50),
  ('Tailoring',       'tailoring',        'Scissors',    60),
  ('Painting',        'painting',         'PaintBucket', 70),
  ('Auto Mechanic',   'auto-mechanic',    'Car',         80),
  ('Carpentry',       'carpentry',        'Hammer',      90),
  ('Welding',         'welding',          'Flame',      100),
  ('Gardening',       'gardening',        'Leaf',       110),
  ('Appliances',      'home-appliances',  'Wrench',     120)
ON CONFLICT (slug) DO NOTHING;

-- A handful of common skills so /api/jobs/create has something to ON CONFLICT against
INSERT INTO public.skills (name, slug) VALUES
  ('Wiring',           'wiring'),
  ('Switch Repair',    'switch-repair'),
  ('Solar',            'solar'),
  ('Pipe Fitting',     'pipe-fitting'),
  ('Leak Repair',      'leak-repair'),
  ('AC Service',       'ac-service'),
  ('Gas Refill',       'gas-refill'),
  ('Inverter',         'inverter'),
  ('Interior Paint',   'interior-paint'),
  ('Roller Finish',    'roller-finish'),
  ('Wood Work',        'wood-work'),
  ('Assembly',         'assembly'),
  ('Wall Mount',       'wall-mount'),
  ('Deep Clean',       'deep-clean'),
  ('Commercial',       'commercial'),
  ('Same Day',         'same-day')
ON CONFLICT (slug) DO NOTHING;


-- ── 6. ROW-LEVEL SECURITY (defence in depth) ─────────────────────────────────
-- These policies are illustrative for the academic deliverable. They lock
-- public read-only access where useful and require auth elsewhere. They use
-- the Supabase auth pattern with `auth.jwt()` claims; the API layer in
-- app/api/*/route.ts performs the real authorization. These RLS rules are
-- the *belt* to that *braces*.

ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_skills        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certifications    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_info       ENABLE ROW LEVEL SECURITY;

-- Public read for catalogues (categories, skills) — used by every visitor
DROP POLICY IF EXISTS "categories_public_read" ON public.categories;
CREATE POLICY "categories_public_read" ON public.categories
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "skills_public_read" ON public.skills;
CREATE POLICY "skills_public_read" ON public.skills
  FOR SELECT USING (TRUE);

-- Public read for OPEN jobs only
DROP POLICY IF EXISTS "jobs_public_read_open" ON public.jobs;
CREATE POLICY "jobs_public_read_open" ON public.jobs
  FOR SELECT USING (status = 'open');

-- Public read for freelancer-shape profiles (without sensitive cols this would
-- need a view; for the academic prototype the API layer projects the safe ones)
DROP POLICY IF EXISTS "profiles_public_read_freelancers" ON public.profiles;
CREATE POLICY "profiles_public_read_freelancers" ON public.profiles
  FOR SELECT USING (user_type = 'freelancer');

-- Reviews — readable by everyone (public reputation)
DROP POLICY IF EXISTS "reviews_public_read" ON public.reviews;
CREATE POLICY "reviews_public_read" ON public.reviews
  FOR SELECT USING (TRUE);

-- All other tables: writes go through the API layer using the service-role
-- key, which bypasses RLS. No explicit policies needed for that path.


-- ── 7. PG_EXECUTE — RPC bridge for the Supabase JS adapter ───────────────────
-- Used by lib/patterns/Singleton.ts → SupabaseAdapter.query() when
-- DATABASE_URL is not configured. Accepts a SQL string with $N placeholders
-- already interpolated (the adapter handles interpolation client-side) and
-- returns rows as JSONB.
--
-- ⚠ Security note. This RPC executes arbitrary SQL inside the database. In
-- production it MUST only be reachable from server-side code (the route
-- handlers) using the service-role key — never from the browser anon key.
-- The function is INTENTIONALLY not SECURITY DEFINER so it inherits the
-- caller's privileges; the service role has full access and the anon role
-- does not. Do NOT grant EXECUTE to anon.

CREATE OR REPLACE FUNCTION public.pg_execute(query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  result JSONB;
  trimmed TEXT := ltrim(query);
BEGIN
  IF trimmed ILIKE 'SELECT%' OR trimmed ILIKE 'WITH%' THEN
    EXECUTE 'SELECT COALESCE(jsonb_agg(t), ''[]''::jsonb) FROM (' || query || ') t' INTO result;
  ELSE
    EXECUTE query;
    GET DIAGNOSTICS result = ROW_COUNT;
    result := jsonb_build_array(jsonb_build_object('rowCount', result));
  END IF;
  RETURN result;
END;
$$;

-- Lock down execution: service role only.
REVOKE ALL ON FUNCTION public.pg_execute(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pg_execute(TEXT) FROM anon;
GRANT  EXECUTE ON FUNCTION public.pg_execute(TEXT) TO service_role;


-- ── 8. CONVENIENCE VIEWS ─────────────────────────────────────────────────────
-- v_jobs_listing — exactly the columns JobRepository.findOpen returns.
-- Lets analysts query the same shape the API exposes without re-deriving joins.

CREATE OR REPLACE VIEW public.v_jobs_listing AS
SELECT
  j.id, j.title, j.description, j.budget_min, j.budget_max,
  j.budget_type, j.location, j.duration, j.status, j.created_at,
  j.proposals_count, j.views_count, j.is_urgent,
  c.name AS category_name,
  c.slug AS category_slug,
  COALESCE(
    ARRAY_AGG(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL),
    '{}'::text[]
  ) AS skills
FROM public.jobs       j
LEFT JOIN public.categories  c  ON j.category_id = c.id
LEFT JOIN public.job_skills  js ON j.id = js.job_id
LEFT JOIN public.skills      s  ON js.skill_id = s.id
GROUP BY j.id, c.name, c.slug;


-- ── 9. (Optional) DEMO PROFILE FOR LOCAL DEV ─────────────────────────────────
-- Uncomment to seed a single Clerk-ID-aligned profile so /api/jobs/create
-- works without hitting "Profile not found" on a fresh DB. Replace the
-- clerk_id with your actual Clerk user id (user_xxx).
--
-- INSERT INTO public.profiles
--   (clerk_id, email, full_name, user_type, location)
-- VALUES
--   ('user_REPLACE_ME', 'demo@ustaad.pk', 'Demo Client', 'client', 'Karachi')
-- ON CONFLICT (clerk_id) DO NOTHING;


COMMIT;

-- ============================================================================
-- End of schema.sql
-- ============================================================================
