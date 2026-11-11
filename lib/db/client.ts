import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Server-only Supabase client using service role key
// Never import this in client components

function createServerClient(): SupabaseClient<any> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables"
    );
  }

  return createClient<any>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Export a lazily created singleton
let _client: SupabaseClient<any> | null = null;

export function getDb(): SupabaseClient<any> {
  if (!_client) {
    _client = createServerClient();
  }
  return _client;
}

export type DbClient = SupabaseClient<any>;
