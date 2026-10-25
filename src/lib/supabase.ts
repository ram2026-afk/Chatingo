import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { HttpError } from "@/lib/errors";

let client: SupabaseClient | null = null;

function envValue(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return "";
}

function supabaseConfig() {
  const url = envValue("NEXT_PUBLIC_SUPABASE_URL");
  const key = envValue("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY");
  if (!url || !key) {
    throw new HttpError(503, "Database is not configured.");
  }
  return { url, key };
}

export function supabaseAdmin() {
  if (!client) {
    const { url, key } = supabaseConfig();
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) =>
          fetch(input, {
            ...init,
            cache: "no-store",
          }),
      },
    });
  }
  return client;
}

export function supabaseAuthClient() {
  const { url, key } = supabaseConfig();
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function adminCredentials() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? "";
  const password = process.env.ADMIN_PASSWORD ?? "";
  if (!email || !password) {
    throw new HttpError(503, "Admin sign-in is not configured.");
  }
  return { email, password };
}
