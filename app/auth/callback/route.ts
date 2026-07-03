import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/home";
  const oauthError = searchParams.get("error_description") || searchParams.get("error");

  // Google/Supabase returned an OAuth error before we ever got a code.
  if (oauthError) {
    return NextResponse.redirect(`${origin}/welcome?error=oauth&msg=${encodeURIComponent(oauthError)}`);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    // Code exchange failed — surface the real reason.
    return NextResponse.redirect(`${origin}/welcome?error=exchange&msg=${encodeURIComponent(error.message)}`);
  }

  // Reached the callback with neither a code nor an error param.
  return NextResponse.redirect(`${origin}/welcome?error=nocode`);
}
