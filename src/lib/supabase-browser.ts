"use client";

import { createClient } from "@supabase/supabase-js";

function envValue(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return "";
}

export function supabaseBrowser() {
  const url = envValue("NEXT_PUBLIC_SUPABASE_URL");
  const key = envValue(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  );
  if (!url || !key) {
    throw new Error("Database is not configured.");
  }
  return createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
