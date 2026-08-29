-- Tribunal — initial schema
--
-- Run this in the Supabase SQL editor. It is written to be read before it is run:
-- the interesting part is not the columns, it is the checks. Several rules this
-- project depends on are held here rather than in application code, because code
-- can forget and a constraint cannot.
--
-- Row-level security is enabled on every table and no policy is written for any of
-- them. Nothing reaches these tables except the server holding the secret key.
-- The project was also created with "automatically expose new tables" off, so no
-- grant is made to anon or authenticated here either.

begin;

-- ---------------------------------------------------------------------------
-- cases — the charge sheet, stored as fields and not as prose
-- ---------------------------------------------------------------------------

create table public.cases (
  id            uuid primary key default gen_random_uuid(),
  reference     text        not null unique,
  accused       text        not null,
  deceased      text,
  act_alleged   text        not null,
  background    text        not null,
  agreed_facts  text[]      not null,
  question      text        not null,
  created_at    timestamptz not null default now(),

  -- A charge sheet without its question is the one refusal with no exception.
  -- It is refused in the browser, refused again on the server, and cannot be
  -- written here even if both were somehow bypassed.
  constraint cases_question_present    check (length(btrim(question)) > 0),
  constraint cases_accused_present     check (length(btrim(accused)) > 0),
  constraint cases_act_alleged_present check (length(btrim(act_alleged)) > 0),
  constraint cases_background_present  check (length(btrim(background)) > 0),

  -- The floor of three agreed facts, held by the database rather than remembered
  -- by the application. Postgres can count the elements of an array.
  constraint cases_three_agreed_facts  check (coalesce(array_length(agreed_facts, 1), 0) >= 3)
);

comment on table public.cases is
  'One charge sheet. The word counts in docs/charge-sheet-spec.md are validation policy and live in code; only structural rules are held here.';
comment on column public.cases.deceased is
  'Nullable on purpose. A killing has one; not every act put to the Tribunal does.';

-- ---------------------------------------------------------------------------
-- deliberations — one run of the panel
-- ---------------------------------------------------------------------------

create table public.deliberations (
  id             uuid primary key default gen_random_uuid(),
  case_id        uuid        not null references public.cases (id) on delete restrict,
  status         text        not null check (status in ('running', 'complete', 'failed')),
  failed_at_wave text        check (failed_at_wave in ('advocates', 'judges')),
  retry_used     boolean     not null default false,
  started_at     timestamptz not null default now(),
  finished_at    timestamptz,

  -- A failed run names the wave it failed in. A run that did not fail names none.
  constraint deliberations_failure_names_its_wave check (
    (status =  'failed' and failed_at_wave is not null) or
    (status <> 'failed' and failed_at_wave is null)
  )
);

comment on table public.deliberations is
  'One run. No totals are stored: tokens and cost are the sum of the calls, and a stored total is a second place for the same fact to be wrong.';

-- ---------------------------------------------------------------------------
-- calls — one row per model call, including the ones that failed
-- ---------------------------------------------------------------------------

create table public.calls (
  id                 uuid primary key default gen_random_uuid(),
  deliberation_id    uuid          not null references public.deliberations (id) on delete restrict,
  seq                smallint      not null,
  role               text          not null check (role in ('advocate', 'judge')),
  agent              text          not null,
  seat               text          check (seat in ('defence', 'prosecution')),
  is_retry           boolean       not null default false,
  status             text          not null check (status in ('complete', 'malformed', 'failed')),

  model_requested    text          not null,
  model_answered     text,

  position           text          check (position in ('justified', 'not justified')),
  verdict            text          check (verdict in ('justified', 'not justified')),
  reasons            text[],
  controlling_ground text,

  tokens_in          integer       not null default 0 check (tokens_in  >= 0),
  tokens_out         integer       not null default 0 check (tokens_out >= 0),
  price_in_per_m     numeric(12,6),
  price_out_per_m    numeric(12,6),
  cost_usd           numeric(14,8),
  latency_ms         integer       check (latency_ms >= 0),

  raw_response       text,
  error              text,
  created_at         timestamptz   not null default now(),

  -- Seven panel calls and one spare. Combined with the unique index below, this
  -- is the eight-call cap, held by the database and not only by the code.
  constraint calls_seq_within_cap check (seq between 1 and 8),

  constraint calls_agent_matches_role check (
    (role = 'advocate' and agent in ('jon', 'tyrion', 'daenerys', 'grey_worm')) or
    (role = 'judge'    and agent in ('barak', 'elon', 'shamgar'))
  ),

  -- An advocate sits in a seat. A judge does not.
  constraint calls_seat_matches_role check (
    (role = 'advocate' and seat is not null) or
    (role = 'judge'    and seat is null)
  ),

  -- The four rules from docs/plan.md. --------------------------------------

  -- 1. An advocate row has no verdict and no controlling ground.
  constraint calls_advocate_holds_no_verdict check (
    role <> 'advocate' or (verdict is null and controlling_ground is null)
  ),

  -- 2. A judge row has no position.
  constraint calls_judge_holds_no_position check (
    role <> 'judge' or position is null
  ),

  -- 3. A row that is not complete carries neither a position nor a verdict.
  --    This is the one that matters most. A blank field or a default verdict
  --    entering the record is the worst thing this system can do, and this makes
  --    it impossible rather than merely forbidden.
  constraint calls_incomplete_holds_no_outcome check (
    status = 'complete' or (position is null and verdict is null)
  ),

  -- 4. A complete row carries at least two reasons.
  constraint calls_complete_has_two_reasons check (
    status <> 'complete' or coalesce(array_length(reasons, 1), 0) >= 2
  ),

  -- And the positive half of the same rule: complete means the outcome arrived.
  constraint calls_complete_has_its_outcome check (
    status <> 'complete' or (
      (role = 'advocate' and position is not null) or
      (role = 'judge'    and verdict is not null
                         and controlling_ground is not null
                         and length(btrim(controlling_ground)) > 0)
    )
  ),

  -- A call that answered names the model that answered it.
  constraint calls_complete_names_its_model check (
    status <> 'complete' or (model_answered is not null and length(btrim(model_answered)) > 0)
  ),

  unique (deliberation_id, seq)
);

comment on table public.calls is
  'One model call. A failed call still has a row: a failure is a row with a status, never an absence.';
comment on column public.calls.model_answered is
  'The model named in the response, not the one requested. A gateway can route elsewhere, and a log of what was asked describes a run that did not happen.';
comment on column public.calls.price_in_per_m is
  'The price in force when the call was made. Model prices move, and without this a run leaves tokens and dollars with no way to get from one to the other.';
comment on column public.calls.raw_response is
  'Kept whatever the status. When a model returns prose instead of the fixed shape, the text it actually returned is the only evidence of why.';

-- One retry for the whole deliberation, not one per agent.
create unique index calls_one_retry_per_deliberation
  on public.calls (deliberation_id)
  where is_retry;

create index calls_by_deliberation   on public.calls (deliberation_id);
create index deliberations_by_case   on public.deliberations (case_id);

-- ---------------------------------------------------------------------------
-- Row-level security: on everywhere, policies nowhere.
-- ---------------------------------------------------------------------------

alter table public.cases         enable row level security;
alter table public.deliberations enable row level security;
alter table public.calls         enable row level security;

commit;
