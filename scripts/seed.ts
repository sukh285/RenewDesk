/**
 * RenewDesk seed script
 * Creates demo subscriptions and reviews in Supabase.
 *
 * Run with:
 *   npx tsx scripts/seed.ts
 *   -- or --
 *   npx ts-node --esm scripts/seed.ts
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Load .env.local manually (no external dotenv dependency needed at runtime)
// ---------------------------------------------------------------------------
function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    console.warn(".env.local not found - relying on existing environment variables");
    return;
  }
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    // Strip surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvLocal();

// ---------------------------------------------------------------------------
// Supabase client (service role - bypasses RLS)
// ---------------------------------------------------------------------------
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local"
  );
  process.exit(1);
}

const db: SupabaseClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

// ---------------------------------------------------------------------------
// Subscription definitions
// ---------------------------------------------------------------------------
interface SubDef {
  vendor: string;
  amount_paise: number;
  billing_cycle: "monthly" | "annual";
  next_renewal: string; // YYYY-MM-DD
  owner: string | null;
  context?: string;
}

const SUBSCRIPTIONS: SubDef[] = [
  {
    vendor: "Notion",
    amount_paise: 165000,
    billing_cycle: "monthly",
    next_renewal: "2026-11-18",
    owner: "Priya Sharma",
    context: "Team wiki and project tracking. 8 seats. Used daily by design and product.",
  },
  {
    vendor: "Figma",
    amount_paise: 850000,
    billing_cycle: "monthly",
    next_renewal: "2026-11-20",
    owner: "Rohit Mehra",
    context: "Design tool for 3 designers. Consider downgrading to starter if headcount stays flat.",
  },
  {
    vendor: "Linear",
    amount_paise: 120000,
    billing_cycle: "monthly",
    next_renewal: "2026-11-25",
    owner: "Priya Sharma",
  },
  {
    vendor: "Slack",
    amount_paise: 1450000,
    billing_cycle: "monthly",
    next_renewal: "2026-12-05",
    owner: "Amit Kapoor",
  },
  {
    vendor: "Vercel Pro",
    amount_paise: 170000,
    billing_cycle: "monthly",
    next_renewal: "2026-12-10",
    owner: "Rohit Mehra",
  },
  {
    vendor: "Zoom",
    amount_paise: 1200000,
    billing_cycle: "annual",
    next_renewal: "2026-12-15",
    owner: "Amit Kapoor",
    context: "250 participant meetings. Only 2 hosts use it regularly.",
  },
  {
    vendor: "Intercom",
    amount_paise: 1850000,
    billing_cycle: "monthly",
    next_renewal: "2027-01-10",
    owner: "Priya Sharma",
  },
  {
    vendor: "Miro",
    amount_paise: 320000,
    billing_cycle: "monthly",
    next_renewal: "2027-02-01",
    owner: null,
  },
];

// ---------------------------------------------------------------------------
// Review overrides (applied after subscription + auto-review creation)
// ---------------------------------------------------------------------------
interface ReviewOverride {
  vendor: string;
  decision: "keep" | "cancel" | "need_info" | "undecided";
  owner?: string | null;
  rationale?: string;
  action_status?: "open" | "completed";
}

const REVIEW_OVERRIDES: ReviewOverride[] = [
  {
    vendor: "Notion",
    decision: "keep",
    owner: "Priya Sharma",
    rationale: "Core tool, non-negotiable. Renew.",
  },
  {
    vendor: "Figma",
    decision: "need_info",
    owner: "Rohit Mehra",
    rationale: "Waiting to confirm whether we hire another designer before deciding seat count.",
  },
  // Linear: leave as undecided (auto-created review is fine)
  {
    vendor: "Slack",
    decision: "cancel",
    owner: "Amit Kapoor",
    rationale: "Migrating to Discord for community. Internal team moves to email + Linear.",
    action_status: "open",
  },
  {
    vendor: "Zoom",
    decision: "keep",
    rationale: "Only annual tool, good value for price.",
  },
];

// ---------------------------------------------------------------------------
// Helper: default review due date (7 days before renewal)
// ---------------------------------------------------------------------------
function defaultDueDate(nextRenewal: string): string {
  const d = new Date(nextRenewal);
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------
async function seed() {
  console.log("Starting RenewDesk seed...\n");

  for (const sub of SUBSCRIPTIONS) {
    console.log(`Seeding ${sub.vendor}...`);

    // --- Idempotency check: skip if vendor already exists ---
    const { data: existing, error: checkErr } = await db
      .from("subscriptions")
      .select("id, vendor")
      .eq("vendor", sub.vendor)
      .maybeSingle();

    if (checkErr) {
      console.error(`  ERROR checking ${sub.vendor}: ${checkErr.message}`);
      continue;
    }

    if (existing) {
      console.log(`  Skipped (already exists, id=${existing.id})`);
      continue;
    }

    // --- Insert subscription ---
    const { data: inserted, error: insertErr } = await db
      .from("subscriptions")
      .insert({
        vendor: sub.vendor,
        amount_paise: sub.amount_paise,
        billing_cycle: sub.billing_cycle,
        next_renewal: sub.next_renewal,
        owner: sub.owner ?? null,
        context: sub.context ?? null,
        review_state: "pending",
      })
      .select()
      .single();

    if (insertErr || !inserted) {
      console.error(`  ERROR inserting ${sub.vendor}: ${insertErr?.message}`);
      continue;
    }

    console.log(`  Inserted subscription id=${inserted.id}`);

    // --- Auto-create initial review (undecided) ---
    const dueDate = defaultDueDate(sub.next_renewal);
    const { data: review, error: reviewErr } = await db
      .from("reviews")
      .insert({
        subscription_id: inserted.id,
        decision: "undecided",
        action_status: "open",
        owner: sub.owner ?? null,
        due_date: dueDate,
        checklist: [],
      })
      .select()
      .single();

    if (reviewErr || !review) {
      console.error(`  ERROR creating review for ${sub.vendor}: ${reviewErr?.message}`);
      continue;
    }

    console.log(`  Created review id=${review.id} (undecided)`);

    // --- Log activity ---
    await db.from("activity_log").insert({
      subscription_id: inserted.id,
      review_id: review.id,
      actor: "system",
      action: "subscription_seeded",
      payload: { vendor: sub.vendor },
    });
  }

  // ---------------------------------------------------------------------------
  // Apply review overrides
  // ---------------------------------------------------------------------------
  console.log("\nApplying review overrides...\n");

  for (const override of REVIEW_OVERRIDES) {
    console.log(`  Updating review for ${override.vendor}...`);

    // Find the subscription
    const { data: sub } = await db
      .from("subscriptions")
      .select("id")
      .eq("vendor", override.vendor)
      .maybeSingle();

    if (!sub) {
      console.warn(`  WARNING: Subscription for ${override.vendor} not found, skipping override`);
      continue;
    }

    // Find its latest review
    const { data: rev } = await db
      .from("reviews")
      .select("id, version")
      .eq("subscription_id", sub.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!rev) {
      console.warn(`  WARNING: No review found for ${override.vendor}, skipping override`);
      continue;
    }

    const updatePayload: Record<string, unknown> = {
      decision: override.decision,
    };
    if (override.owner !== undefined) updatePayload.owner = override.owner;
    if (override.rationale) updatePayload.rationale = override.rationale;
    if (override.action_status) updatePayload.action_status = override.action_status;

    const { error: updateErr } = await db
      .from("reviews")
      .update(updatePayload)
      .eq("id", rev.id);

    if (updateErr) {
      console.error(`  ERROR updating review for ${override.vendor}: ${updateErr.message}`);
      continue;
    }

    // Update subscription review_state to reflect the decision
    if (override.decision !== "undecided") {
      await db
        .from("subscriptions")
        .update({ review_state: "reviewed" })
        .eq("id", sub.id);
    }

    console.log(`  Set ${override.vendor} review to decision=${override.decision}`);
  }

  console.log("\nSeed complete.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
