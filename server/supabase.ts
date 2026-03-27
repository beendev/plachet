import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "./env";

let supabaseClient: any | null | undefined;

export function getSupabaseSyncStatus() {
  const env = getServerEnv();
  const configured = Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);

  return {
    configured,
    enabled: configured && env.supabaseSyncEnabled,
    syncEnabled: env.supabaseSyncEnabled,
  };
}

export function getSupabaseAdminClient() {
  if (supabaseClient !== undefined) {
    return supabaseClient;
  }

  const env = getServerEnv();
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    supabaseClient = null;
    return supabaseClient;
  }

  supabaseClient = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseClient;
}
