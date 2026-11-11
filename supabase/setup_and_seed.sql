-- ==============================================================================
-- RenewDesk Complete Database Setup & Seed
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/nwwjzhxhemyfygscudsf/sql/new
-- ==============================================================================

-- 1. Enable pgcrypto for UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Clean previous tables if any (safe for fresh project)
DROP TABLE IF EXISTS activity_log CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;

-- 3. Subscriptions table
CREATE TABLE subscriptions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id       text UNIQUE,                          -- Idempotency key for Claude
  vendor           text NOT NULL,
  amount_paise     integer NOT NULL CHECK (amount_paise >= 0), -- INR in paise (1 INR = 100 paise)
  billing_cycle    text NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),
  next_renewal     date NOT NULL,
  owner            text,
  review_state     text NOT NULL DEFAULT 'none' CHECK (review_state IN ('none', 'pending', 'reviewed')),
  context          text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  version          integer NOT NULL DEFAULT 1
);

-- 4. Reviews table
CREATE TABLE reviews (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id  uuid NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  decision         text NOT NULL DEFAULT 'undecided' CHECK (decision IN ('undecided', 'keep', 'cancel', 'need_info')),
  action_status    text NOT NULL DEFAULT 'open' CHECK (action_status IN ('open', 'completed')),
  owner            text,
  due_date         date,
  rationale        text,
  checklist        jsonb NOT NULL DEFAULT '[]'::jsonb,
  completed_at     timestamptz,
  completion_note  text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  version          integer NOT NULL DEFAULT 1
);

-- 5. Activity log table
CREATE TABLE activity_log (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id  uuid REFERENCES subscriptions(id) ON DELETE SET NULL,
  review_id        uuid REFERENCES reviews(id) ON DELETE SET NULL,
  actor            text NOT NULL CHECK (actor IN ('user', 'claude', 'system')),
  action           text NOT NULL,
  payload          jsonb,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- 6. Indexes for high performance
CREATE INDEX idx_subscriptions_next_renewal ON subscriptions(next_renewal);
CREATE INDEX idx_subscriptions_owner ON subscriptions(owner);
CREATE INDEX idx_subscriptions_review_state ON subscriptions(review_state);
CREATE INDEX idx_reviews_subscription_id ON reviews(subscription_id);
CREATE INDEX idx_reviews_decision ON reviews(decision);
CREATE INDEX idx_reviews_action_status ON reviews(action_status);
CREATE INDEX idx_reviews_due_date ON reviews(due_date);
CREATE INDEX idx_activity_log_subscription_id ON activity_log(subscription_id);

-- 7. Trigger function for automatic updated_at and version increment
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  new.updated_at = now();
  new.version = old.version + 1;
  RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. Seed Subscriptions
INSERT INTO subscriptions (id, request_id, vendor, amount_paise, billing_cycle, next_renewal, owner, review_state, context) VALUES
  (
    'a1b2c3d4-0001-0001-0001-000000000001',
    'seed-notion-001',
    'Notion',
    165000,
    'monthly',
    '2026-11-18',
    'Priya Sharma',
    'reviewed',
    'Team wiki and project tracking. 8 seats. Used daily by design and product teams.'
  ),
  (
    'a1b2c3d4-0002-0002-0002-000000000002',
    'seed-figma-001',
    'Figma',
    850000,
    'monthly',
    '2026-11-20',
    'Rohit Mehra',
    'pending',
    'Design tool for 3 designers. Consider downgrading to starter plan if headcount stays flat through Q1.'
  ),
  (
    'a1b2c3d4-0003-0003-0003-000000000003',
    'seed-linear-001',
    'Linear',
    120000,
    'monthly',
    '2026-11-25',
    'Priya Sharma',
    'pending',
    NULL
  ),
  (
    'a1b2c3d4-0004-0004-0004-000000000004',
    'seed-slack-001',
    'Slack',
    1450000,
    'monthly',
    '2026-12-05',
    'Amit Kapoor',
    'reviewed',
    'Team messaging for 22 people. Evaluating Discord for community and cutting internal Slack.'
  ),
  (
    'a1b2c3d4-0005-0005-0005-000000000005',
    'seed-vercel-001',
    'Vercel Pro',
    170000,
    'monthly',
    '2026-12-10',
    'Rohit Mehra',
    'pending',
    NULL
  ),
  (
    'a1b2c3d4-0006-0006-0006-000000000006',
    'seed-zoom-001',
    'Zoom',
    1200000,
    'annual',
    '2026-12-15',
    'Amit Kapoor',
    'reviewed',
    '250-participant meetings. Only 2 hosts use it regularly. Annual plan renews in December.'
  ),
  (
    'a1b2c3d4-0007-0007-0007-000000000007',
    'seed-intercom-001',
    'Intercom',
    1850000,
    'monthly',
    '2027-01-10',
    'Priya Sharma',
    'pending',
    'Customer support and in-app messaging. 3 agents. Volume has been low this quarter.'
  ),
  (
    'a1b2c3d4-0008-0008-0008-000000000008',
    'seed-miro-001',
    'Miro',
    320000,
    'monthly',
    '2027-02-01',
    NULL,
    'none',
    NULL
  );

-- 9. Seed Reviews
INSERT INTO reviews (id, subscription_id, decision, action_status, owner, due_date, rationale, checklist, completed_at, completion_note) VALUES
  (
    'b1b2c3d4-0001-0001-0001-000000000001',
    'a1b2c3d4-0001-0001-0001-000000000001',
    'keep',
    'completed',
    'Priya Sharma',
    '2026-11-11',
    'Core tool, non-negotiable for the team. Renew at current tier.',
    '[{"text": "Confirm seat count with team lead", "done": true}, {"text": "Verify billing address is current", "done": true}]'::jsonb,
    now() - interval '2 days',
    'Renewed for another month. No action required.'
  ),
  (
    'b1b2c3d4-0002-0002-0002-000000000002',
    'a1b2c3d4-0002-0002-0002-000000000002',
    'need_info',
    'open',
    'Rohit Mehra',
    '2026-11-13',
    'Waiting to confirm whether we hire a 4th designer before Q1. Seat cost changes if we do.',
    '[{"text": "Check hiring plan with founder by Nov 15", "done": false}, {"text": "Get Figma seat pricing for 4 designers", "done": true}]'::jsonb,
    NULL,
    NULL
  ),
  (
    'b1b2c3d4-0003-0003-0003-000000000003',
    'a1b2c3d4-0003-0003-0003-000000000003',
    'undecided',
    'open',
    'Priya Sharma',
    '2026-11-18',
    NULL,
    '[]'::jsonb,
    NULL,
    NULL
  ),
  (
    'b1b2c3d4-0004-0004-0004-000000000004',
    'a1b2c3d4-0004-0004-0004-000000000004',
    'cancel',
    'open',
    'Amit Kapoor',
    '2026-11-28',
    'Team migrating to Discord for community. Internal communication moving to email and Linear comments. Slack cost is too high for current stage.',
    '[{"text": "Export message history before cancellation", "done": false}, {"text": "Notify team of migration date", "done": false}, {"text": "Contact Slack to initiate cancellation", "done": false}]'::jsonb,
    NULL,
    NULL
  ),
  (
    'b1b2c3d4-0005-0005-0005-000000000005',
    'a1b2c3d4-0005-0005-0005-000000000005',
    'undecided',
    'open',
    'Rohit Mehra',
    '2026-12-03',
    NULL,
    '[]'::jsonb,
    NULL,
    NULL
  ),
  (
    'b1b2c3d4-0006-0006-0006-000000000006',
    'a1b2c3d4-0006-0006-0006-000000000006',
    'keep',
    'completed',
    'Amit Kapoor',
    '2026-12-08',
    'Annual plan is good value. Hosts rely on 250-participant capacity for quarterly reviews.',
    '[{"text": "Verify billing contact email", "done": true}]'::jsonb,
    now() - interval '1 day',
    'Annual renewal confirmed. Payment processed.'
  );

-- 10. Seed Activity Log
INSERT INTO activity_log (subscription_id, review_id, actor, action, payload) VALUES
  ('a1b2c3d4-0001-0001-0001-000000000001', 'b1b2c3d4-0001-0001-0001-000000000001', 'claude', 'subscription_created', '{"vendor": "Notion", "request_id": "seed-notion-001"}'::jsonb),
  ('a1b2c3d4-0001-0001-0001-000000000001', 'b1b2c3d4-0001-0001-0001-000000000001', 'user', 'review_updated', '{"decision": "keep", "owner": "Priya Sharma"}'::jsonb),
  ('a1b2c3d4-0001-0001-0001-000000000001', 'b1b2c3d4-0001-0001-0001-000000000001', 'user', 'review_completed', '{"decision": "keep"}'::jsonb),
  ('a1b2c3d4-0004-0004-0004-000000000004', 'b1b2c3d4-0004-0004-0004-000000000004', 'claude', 'subscription_created', '{"vendor": "Slack", "request_id": "seed-slack-001"}'::jsonb),
  ('a1b2c3d4-0004-0004-0004-000000000004', 'b1b2c3d4-0004-0004-0004-000000000004', 'user', 'review_updated', '{"decision": "cancel", "rationale": "Migrating to Discord"}'::jsonb);
