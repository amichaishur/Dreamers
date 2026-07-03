import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Scan a string for the first char > 255 (non-Latin1 → breaks ByteString cookies).
function firstBadChar(s: string): { i: number; code: number; ctx: string } | null {
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code > 255) return { i, code, ctx: s.slice(Math.max(0, i - 6), i + 6) };
  }
  return null;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/home";
  const oauthError = searchParams.get("error_description") || searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(`${origin}/welcome?error=oauth&msg=${encodeURIComponent(oauthError)}`);
  }
  if (!code) {
    return NextResponse.redirect(`${origin}/welcome?error=nocode`);
  }

  const cookieStore = await cookies();
  const diag: string[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieEncoding: "base64url",
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(toSet) {
          for (const { name, value, options } of toSet) {
            const badName = firstBadChar(name);
            const badVal = firstBadChar(value);
            if (badName) diag.push(`NAME ${name.slice(0, 20)} i${badName.i} c${badName.code}`);
            if (badVal) diag.push(`VAL ${name.slice(0, 24)} i${badVal.i} c${badVal.code} «${badVal.ctx}»`);
            try {
              cookieStore.set(name, value, options);
            } catch (e) {
              diag.push(`SETFAIL ${name.slice(0, 24)}: ${(e as Error).message.slice(0, 60)}`);
            }
          }
        },
      },
    }
  );

  try {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && diag.length === 0) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    const report = (error ? `ERR:${error.message} | ` : "OK | ") + (diag.join(" ; ") || "no-bad-cookie");
    return NextResponse.redirect(`${origin}/welcome?error=diag&msg=${encodeURIComponent(report.slice(0, 400))}`);
  } catch (e) {
    const err = e as Error;
    const report = `THREW:${err.message} | ${(err.stack || "").split("\n").slice(0, 4).join(" ")} | ${diag.join(" ; ")}`;
    return NextResponse.redirect(`${origin}/welcome?error=threw&msg=${encodeURIComponent(report.slice(0, 500))}`);
  }
}
