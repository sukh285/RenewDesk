-- RenewDesk Database Schema Migration
-- Run this once against your Supabase project (SQL Editor or CLI)

-- Enable uuid generation
create extension if not exists "pgcrypto";

-- Subscriptions table
create table if not exists subscriptions (
  id               uuid primary key default gen_random_uuid(),
  request_id       text unique,                          -- idempotency key for Claude writes
  vendor           text not null,
  amount_paise     integer not null check (amount_paise >= 0), -- INR stored as paise (1 INR = 100 paise)
  billing_cycle    text not null check (billing_cycle in ('monthly', 'annual')),
  next_renewal     date not null,
  owner            text,
  review_state     text not null default 'none' check (review_state in ('none', 'pending', 'reviewed')),
  context          text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  version          integer not null default 1
);

-- Reviews table
create table if not exists reviews (
  id               uuid primary key default gen_random_uuid(),
  subscription_id  uuid not null references subscriptions(id) on delete cascade,
  decision         text not null default 'undecided' check (decision in ('undecided', 'keep', 'cancel', 'need_info')),
  action_status    text not null default 'open' check (action_status in ('open', 'completed')),
  owner            text,
  due_date         date,
  rationale        text,
  checklist        jsonb not null default '[]'::jsonb,  -- [{text: string, done: boolean}]
  completed_at     timestamptz,
  completion_note  text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  version          integer not null default 1
);

-- Activity log
create table if not exists activity_log (
  id               uuid primary key default gen_random_uuid(),
  subscription_id  uuid references subscriptions(id) on delete set null,
  review_id        uuid references reviews(id) on delete set null,
  actor            text not null check (actor in ('user', 'claude', 'system')),
  action           text not null,
  payload          jsonb,
  created_at       timestamptz not null default now()
);

-- Indexes for common query patterns
create index if not exists idx_subscriptions_next_renewal on subscriptions(next_renewal);
create index if not exists idx_subscriptions_owner on subscriptions(owner);
create index if not exists idx_subscriptions_review_state on subscriptions(review_state);
create index if not exists idx_reviews_subscription_id on reviews(subscription_id);
create index if not exists idx_reviews_decision on reviews(decision);
create index if not exists idx_reviews_action_status on reviews(action_status);
create index if not exists idx_reviews_due_date on reviews(due_date);
create index if not exists idx_activity_log_subscription_id on activity_log(subscription_id);

-- Auto-update updated_at timestamps
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  new.version = old.version + 1;
  return new;
end;
$$ language plpgsql;

create or replace trigger subscriptions_updated_at
  before update on subscriptions
  for each row execute function update_updated_at_column();

create or replace trigger reviews_updated_at
  before update on reviews
  for each row execute function update_updated_at_column();

