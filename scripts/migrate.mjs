#!/usr/bin/env node
// scripts/migrate.mjs
// Apply SQL migrations to Supabase using the REST API
// Usage: node scripts/migrate.mjs
// Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment

import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local manually
try {
  const envContent = readFileSync(join(__dirname, "../.env.local"), "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  // .env.local not found, using system environment
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
  process.exit(1);
}

const migrationsDir = join(__dirname, "../supabase/migrations");
const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

console.log(`Found ${files.length} migration file(s): ${files.join(", ")}`);

for (const file of files) {
  const sql = readFileSync(join(migrationsDir, file), "utf-8");
  console.log(`Running migration: ${file}...`);

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_SERVICE_ROLE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!response.ok) {
    // Try direct SQL execution via Supabase SQL endpoint
    const pgResponse = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/sql",
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: sql,
    });

    console.log(`  Status: ${pgResponse.status}`);
    if (!pgResponse.ok) {
      console.error(`  Warning: Migration ${file} may have had issues. Check Supabase dashboard.`);
      console.log("  You can also run this SQL directly in the Supabase SQL Editor.");
    } else {
      console.log(`  OK: ${file}`);
    }
  } else {
    console.log(`  OK: ${file}`);
  }
}

console.log("\nMigration script complete.");
console.log("If any migrations failed, paste the SQL from supabase/migrations/ into the Supabase SQL Editor.");

