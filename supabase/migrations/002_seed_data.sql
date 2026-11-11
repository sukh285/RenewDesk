-- Seed data for RenewDesk demo
-- This script can be run multiple times safely (uses ON CONFLICT DO NOTHING)
-- Run after the schema migration

-- Clear existing data first (for clean re-seed)
TRUNCATE TABLE activity_log, reviews, subscriptions RESTART IDENTITY CASCADE;

-- Insert subscriptions
-- Amounts are in paise (1 INR = 100 paise)
-- Renewal dates are set relative to 2026-11-11

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
  )
ON CONFLICT (request_id) DO NOTHING;

-- Insert reviews
INSERT INTO reviews (id, subscription_id, decision, action_status, owner, due_date, rationale, checklist) VALUES
  (
    'b1b2c3d4-0001-0001-0001-000000000001',
    'a1b2c3d4-0001-0001-0001-000000000001',
    'keep',
    'completed',
    'Priya Sharma',
    '2026-11-11',
    'Core tool, non-negotiable for the team. Renew at current tier.',
    '[{"text": "Confirm seat count with team lead", "done": true}, {"text": "Verify billing address is current", "done": true}]'::jsonb
  ),
  (
    'b1b2c3d4-0002-0002-0002-000000000002',
    'a1b2c3d4-0002-0002-0002-000000000002',
    'need_info',
    'open',
    'Rohit Mehra',
    '2026-11-13',
    'Waiting to confirm whether we hire a 4th designer before Q1. Seat cost changes if we do.',
    '[{"text": "Check hiring plan with founder by Nov 15", "done": false}, {"text": "Get Figma seat pricing for 4 designers", "done": true}]'::jsonb
  ),
  (
    'b1b2c3d4-0003-0003-0003-000000000003',
    'a1b2c3d4-0003-0003-0003-000000000003',
    'undecided',
    'open',
    'Priya Sharma',
    '2026-11-18',
    NULL,
    '[]'::jsonb
  ),
  (
    'b1b2c3d4-0004-0004-0004-000000000004',
    'a1b2c3d4-0004-0004-0004-000000000004',
    'cancel',
    'open',
    'Amit Kapoor',
    '2026-11-28',
    'Team migrating to Discord for community. Internal communication moving to email and Linear comments. Slack cost is too high for current stage.',
    '[{"text": "Export message history before cancellation", "done": false}, {"text": "Notify team of migration date", "done": false}, {"text": "Contact Slack to initiate cancellation", "done": false}]'::jsonb
  ),
  (
    'b1b2c3d4-0005-0005-0005-000000000005',
    'a1b2c3d4-0005-0005-0005-000000000005',
    'undecided',
    'open',
    'Rohit Mehra',
    '2026-12-03',
    NULL,
    '[]'::jsonb
  ),
  (
    'b1b2c3d4-0006-0006-0006-000000000006',
    'a1b2c3d4-0006-0006-0006-000000000006',
    'keep',
    'completed',
    'Amit Kapoor',
    '2026-12-08',
    'Annual plan is good value. Hosts rely on 250-participant capacity for quarterly reviews.',
    '[{"text": "Verify billing contact email", "done": true}]'::jsonb
  );

-- Mark completed reviews
UPDATE reviews SET
  action_status = 'completed',
  completed_at = now() - interval '2 days',
  completion_note = 'Renewed for another month. No action required.'
WHERE id = 'b1b2c3d4-0001-0001-0001-000000000001';

UPDATE reviews SET
  action_status = 'completed',
  completed_at = now() - interval '1 day',
  completion_note = 'Annual renewal confirmed. Payment processed.'
WHERE id = 'b1b2c3d4-0006-0006-0006-000000000006';

-- Seed activity log entries
INSERT INTO activity_log (subscription_id, review_id, actor, action, payload) VALUES
  ('a1b2c3d4-0001-0001-0001-000000000001', 'b1b2c3d4-0001-0001-0001-000000000001', 'claude', 'subscription_created', '{"vendor": "Notion", "request_id": "seed-notion-001"}'::jsonb),
  ('a1b2c3d4-0001-0001-0001-000000000001', 'b1b2c3d4-0001-0001-0001-000000000001', 'user', 'review_updated', '{"decision": "keep", "owner": "Priya Sharma"}'::jsonb),
  ('a1b2c3d4-0001-0001-0001-000000000001', 'b1b2c3d4-0001-0001-0001-000000000001', 'user', 'review_completed', '{"decision": "keep"}'::jsonb),
  ('a1b2c3d4-0004-0004-0004-000000000004', 'b1b2c3d4-0004-0004-0004-000000000004', 'claude', 'subscription_created', '{"vendor": "Slack", "request_id": "seed-slack-001"}'::jsonb),
  ('a1b2c3d4-0004-0004-0004-000000000004', 'b1b2c3d4-0004-0004-0004-000000000004', 'user', 'review_updated', '{"decision": "cancel", "rationale": "Migrating to Discord"}'::jsonb);

