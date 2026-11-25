"use client";
import { createBrowserClient } from "@supabase/ssr";

/** Client Supabase côté navigateur. Renvoie null si la configuration publique est absente. */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createBrowserClient(url, key);
}
