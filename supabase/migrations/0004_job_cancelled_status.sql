-- 0004_job_cancelled_status.sql
-- Allows 'cancelled' status on gdd_generation_jobs for safe user-initiated abort.

ALTER TABLE public.gdd_generation_jobs
  DROP CONSTRAINT IF EXISTS gdd_generation_jobs_status_check;

ALTER TABLE public.gdd_generation_jobs
  ADD CONSTRAINT gdd_generation_jobs_status_check
  CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled'));
