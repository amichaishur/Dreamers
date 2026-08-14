// TEMPORARY staging-only probe: why does generateMetadata's fetch fail on
// Vercel while working everywhere else? Reports env presence and the actual
// error. Deleted before anything merges to production.
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const out: Record<string, unknown> = {
    hasUrl: !!url,
    hasKey: !!key,
    urlHost: url ? new URL(url).hostname.slice(0, 8) + "…" : null,
    node: process.version,
  };
  try {
    const res = await fetch(`${url}/rest/v1/rpc/get_shared_entry`, {
      method: "POST",
      headers: { apikey: key!, "Content-Type": "application/json" },
      body: JSON.stringify({ p_id: "10e8dd46-c591-4692-aaeb-ca67556a1404" }),
      signal: AbortSignal.timeout(4000),
    });
    out.status = res.status;
    const rows = await res.json();
    out.rows = Array.isArray(rows) ? rows.length : typeof rows;
    out.title = Array.isArray(rows) ? (rows[0]?.title ?? null) : null;
  } catch (e) {
    const err = e as Error;
    out.error = `${err?.name}: ${err?.message}`;
  }
  return Response.json(out);
}
