import type { Metadata } from "next";

/**
 * The link preview for a shared dream. WhatsApp (and every other messenger)
 * reads this server-side, signed out — which is exactly what get_shared_entry
 * allows: one entry, by exact uuid, never the author's user id, and the name
 * only when it was shared with one.
 *
 * The dream's title goes in the preview text rather than into the image:
 * drawing Hebrew into a generated PNG needs a server-side font pipeline that
 * breaks quietly, while text next to the branded card cannot.
 */
export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !key || !/^[0-9a-f-]{36}$/i.test(id)) return {};

  try {
    const res = await fetch(`${base}/rest/v1/rpc/get_shared_entry`, {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({ p_id: id }),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return {};
    const rows: { title?: string; type?: string; author_name?: string | null; shared_anonymous?: boolean }[] = await res.json();
    const e = Array.isArray(rows) ? rows[0] : undefined;
    if (!e?.title) return {};

    // A creation shared as a dream reads as a mistake. Name what it actually is.
    const KIND: Record<string, string> = {
      dream: "חלום", creation: "יצירה", idea: "רעיון",
      reality: "מציאות", record: "סמלים ועוגנים",
    };
    const what = KIND[e.type ?? "dream"] ?? "זיכרון";
    const by = e.shared_anonymous || !e.author_name ? "" : ` · מאת ${e.author_name}`;
    const description = `${what} מתוך מארג החיים${by}`;
    return {
      title: `${e.title} · Dreamers`,
      description,
      openGraph: { title: e.title, description, siteName: "Dreamers", type: "article" },
      twitter: { card: "summary_large_image", title: e.title, description },
    };
  } catch {
    // The page still opens; the preview just falls back to the site-wide card.
    return {};
  }
}

export default function SharedDreamLayout({ children }: { children: React.ReactNode }) {
  return children;
}
