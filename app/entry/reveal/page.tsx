"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import StarField from "@/components/StarField";
import WeaveKnowledge from "@/components/WeaveKnowledge";
import { WeaveItem, WeaveEdge } from "@/lib/weave";
import { theme, DiaryType } from "@/lib/theme";
import { rgba, mix } from "@/lib/color";
import { useLang } from "@/lib/i18n";

const p = theme;
const HE: Record<DiaryType, [string, string]> = {
  creation: ["היצירה", "נשזרה"],
  dream: ["החלום", "נשזר"],
  idea: ["הרעיון", "נשזר"],
  reality: ["המציאות", "נשזרה"],
  record: ["הרשומה", "נשזרה"],
};

/**
 * The weave the new memory has just joined. The real one needs the whole
 * journal to draw; this is a small stand-in with the same component, so what
 * appears here is the map as it actually looks rather than a different graphic.
 * Deterministic, so the moment is the same every time.
 */
function revealWeave(mineType: DiaryType): { items: WeaveItem[]; edges: WeaveEdge[] } {
  const kinds: DiaryType[] = ["dream", "creation", "idea", "reality", "record"];
  const items: WeaveItem[] = Array.from({ length: 46 }, (_, i) => ({
    id: `r${i}`,
    title: "",
    body: "",
    // The memory just written is the one that burns: it is the only "mine" here.
    type: i === 0 ? mineType : kinds[(i * 3 + 1) % kinds.length],
    createdAt: new Date(0).toISOString(),
    lucidity: null,
    mine: i === 0,
  }));
  // Relationships are not computed here — there is no text to compute them from.
  // A fixed, uneven mesh gives the field the same knotted look the real one has.
  const edges: WeaveEdge[] = [];
  for (let i = 1; i < items.length; i++) {
    const a = i, b = (i * 7 + 3) % items.length;
    if (a !== b) edges.push({ a, b, strength: 1.6, reasons: [] });
  }
  return { items, edges };
}

function RevealInner() {
  const sp = useSearchParams();
  const { t, lang } = useLang();
  const raw = sp.get("diary") || "dream";
  const key = (["creation", "dream", "idea", "reality", "record"].includes(raw) ? raw : "dream") as DiaryType;
  const total = Number(sp.get("count") ?? 0) || 0;
  const entryId = sp.get("id");
  const viewHref = entryId ? `/entry/${entryId}` : "/journals";
  // Shared to the community, so there is a link worth sending. This is the
  // moment people want to send it — asking them to save, leave, and reopen the
  // memory to find the button was the long way round.
  const shared = sp.get("shared") === "1";
  const sharedTitle = sp.get("title") ?? "";
  const [copied, setCopied] = useState(false);
  const c = p.dots[key];
  const diaryName = t(`diary.${key}`);
  const [theLabel, wove] = HE[key];
  const weave = useMemo(() => revealWeave(key), [key]);
  const mainLine = lang === "en" ? `The ${diaryName.toLowerCase()} was woven into the Weave` : `${theLabel} ${wove} במארג`;
  const bright = mix(c, "#ffffff", 0.4);
  const hexLite = mix(c, "#ffffff", 0.55);
  const hexDeep = mix(c, "#000000", 0.32);
  const dateStr = new Date().toLocaleDateString(lang === "en" ? "en-US" : "he-IL", { day: "numeric", month: "long", year: "numeric" });

  return (
    <main style={{ position: "relative", minHeight: "100svh", overflow: "hidden", background: p.bg, color: p.text, display: "flex", flexDirection: "column" }}>
      <StarField count={80} color={p.starColor} />

      <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "clamp(28px, 8vh, 74px) 28px 34px", minHeight: 0 }}>
        {/* success pill */}
        <div style={{ display: "flex", justifyContent: "center", animation: "pillIn 0.6s cubic-bezier(.2,.8,.2,1) 0.15s both" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 16px 7px 13px", borderRadius: 999, background: rgba(c, 0.14), border: `1px solid ${rgba(c, 0.34)}`, backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={bright} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            <span style={{ fontSize: 13, fontWeight: 600, color: p.text }}>{t("rv.saved")}</span>
          </div>
        </div>

        {/* The weave itself, the one the home screen draws */}
        <div style={{ flex: "0 1 auto", width: "min(340px, 88vw)", height: "min(340px, 88vw)", marginTop: "clamp(8px, 3vh, 26px)" }}>
          <WeaveKnowledge dots={p.dots} items={weave.items} edges={weave.edges} />
        </div>

        {/* copy */}
        <div style={{ textAlign: "center", marginTop: "clamp(4px, 2vh, 16px)" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, animation: "riseUp 0.7s cubic-bezier(.2,.8,.2,1) 0.5s both" }}>
            <div style={{ filter: `drop-shadow(0 0 6px ${rgba(c, 0.7)})`, flex: "0 0 auto" }}>
              <div style={{ width: 19, height: 21, clipPath: "polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)", background: `linear-gradient(150deg, ${hexLite}, ${c} 55%, ${hexDeep})` }} />
            </div>
            <span style={{ fontSize: "clamp(19px, 5.5vw, 24px)", fontWeight: 800, color: p.text, letterSpacing: "-0.3px" }}>{mainLine}</span>
          </div>
          <div style={{ marginTop: 9, fontSize: 14, color: p.subtext, animation: "riseUp 0.7s cubic-bezier(.2,.8,.2,1) 0.62s both" }}>{t("rv.new")} · {dateStr}</div>
        </div>

        {/* counter */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, marginTop: "clamp(10px, 3vh, 22px)" }}>
          <span style={{ fontSize: "clamp(44px, 12vw, 54px)", fontWeight: 800, lineHeight: 1, background: `linear-gradient(135deg, ${p.fabFrom}, ${p.fabTo})`, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", animation: "popIn 0.6s cubic-bezier(.2,.8,.2,1) 0.72s both" }}>{total}</span>
          <div style={{ fontSize: 13.5, color: p.subtext, letterSpacing: 0.3, animation: "riseUp 0.7s ease 0.8s both" }}>{t("rv.memories")}</div>
        </div>

        {/* actions */}
        <div style={{ width: "100%", maxWidth: 360, marginTop: "auto", paddingTop: "clamp(16px, 4vh, 28px)", display: "flex", flexDirection: "column", gap: 11, animation: "riseUp 0.7s cubic-bezier(.2,.8,.2,1) 0.9s both" }}>
          {shared && entryId && (
            <div style={{ display: "flex", gap: 9 }}>
              <button
                onClick={() => {
                  const link = `${window.location.origin}/d/${entryId}`;
                  const intro = `${diaryName} ${t("share.waFrom")}`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(`${intro} ${sharedTitle}
${link}`)}`, "_blank");
                }}
                style={{ flex: 1, height: 46, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, border: "1px solid rgba(76,217,142,0.4)", background: "rgba(76,217,142,0.12)", cursor: "pointer", fontSize: 13.5, fontWeight: 700, color: "#8FE7B0" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#4CD98E" style={{ flex: "0 0 auto" }}><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.4 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5s.8 1.9.8 2c.1.1.1.3 0 .5-.3.6-.7.9-.5 1.2.7 1.2 1.6 2 2.8 2.6.3.2.5.1.7-.1l.9-1c.2-.3.4-.2.7-.1l2 .9c.3.2.5.3.5.4 0 .1 0 .7-.2 1.3Z" /></svg>
                {t("share.whatsapp")}
              </button>
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(`${window.location.origin}/d/${entryId}`);
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1800);
                  } catch { /* clipboard blocked — WhatsApp still works */ }
                }}
                style={{ flex: 1, height: 46, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, border: `1px solid ${p.cardBorder}`, background: p.cardBg, cursor: "pointer", fontSize: 13.5, fontWeight: 700, color: p.text }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={p.text} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "0 0 auto" }}><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                {copied ? t("share.copied") : t("share.copyLink")}
              </button>
            </div>
          )}
          <Link href="/home" style={{ height: 52, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 9, background: `linear-gradient(135deg, ${p.fabFrom}, ${p.fabTo})`, boxShadow: `0 12px 30px ${rgba(c, 0.4)}`, textDecoration: "none" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11.5 12 4l9 7.5" /><path d="M5 10v9h14v-9" /></svg>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>{t("rv.home")}</span>
          </Link>
          <Link href={viewHref} style={{ height: 50, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: p.cardBg, border: `1px solid ${p.cardBorder}`, textDecoration: "none" }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={p.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
            <span style={{ fontSize: 15, fontWeight: 600, color: p.text }}>{t("rv.view")}{diaryName}</span>
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function RevealPage() {
  return (
    <Suspense>
      <RevealInner />
    </Suspense>
  );
}
