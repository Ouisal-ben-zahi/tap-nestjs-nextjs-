-- Table: candidate_saved_jobs
-- Purpose: persist saved jobs for each candidate (DB-side, not localStorage).
-- Safe to run multiple times.

create table if not exists public.candidate_saved_jobs (
  id bigserial primary key,
  candidate_id bigint not null,
  job_id bigint not null,
  created_at timestamptz not null default now(),
  constraint uq_candidate_saved_jobs_candidate_job unique (candidate_id, job_id),
  constraint fk_candidate_saved_jobs_candidate
    foreign key (candidate_id)
    references public.candidates(id)
    on delete cascade,
  constraint fk_candidate_saved_jobs_job
    foreign key (job_id)
    references public.jobs(id)
    on delete cascade
);

create index if not exists idx_candidate_saved_jobs_candidate_id
  on public.candidate_saved_jobs(candidate_id);

create index if not exists idx_candidate_saved_jobs_job_id
  on public.candidate_saved_jobs(job_id);
