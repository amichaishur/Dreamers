"use client";

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    // base64url keeps cookie values pure-ASCII so non-Latin1 chars (e.g. Hebrew
    // names in the session) don't break strict runtimes like Netlify.
    { cookieEncoding: "base64url" }
  );
}
