-- Table: recruiter_scheduled_interviews
-- Purpose: save planned interviews from recruiter form.
-- Safe to run multiple times.

create table if not exists public.recruiter_scheduled_interviews (
  id bigserial primary key,
  recruiter_user_id bigint not null,
  job_id bigint not null,
  candidate_id bigint not null,
  candidate_postule_id bigint not null,
  interview_type text not null check (interview_type in ('EN_LIGNE', 'PRESENTIEL', 'TELEPHONIQUE')),
  interview_date date not null,
  interview_time time not null,
  status text not null default 'PLANIFIE' check (status in ('PLANIFIE', 'TERMINE', 'ANNULE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_rsi_job
    foreign key (job_id)
    references public.jobs(id)
    on delete cascade,
  constraint fk_rsi_candidate
    foreign key (candidate_id)
    references public.candidates(id)
    on delete cascade,
  constraint fk_rsi_candidate_postule
    foreign key (candidate_postule_id)
    references public.candidate_postule(id)
    on delete cascade
);

create index if not exists idx_rsi_recruiter_user_id
  on public.recruiter_scheduled_interviews(recruiter_user_id);

create index if not exists idx_rsi_job_id
  on public.recruiter_scheduled_interviews(job_id);

create index if not exists idx_rsi_candidate_id
  on public.recruiter_scheduled_interviews(candidate_id);

create index if not exists idx_rsi_date_time
  on public.recruiter_scheduled_interviews(interview_date, interview_time);
