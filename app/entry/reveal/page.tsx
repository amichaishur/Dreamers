"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import StarField from "@/components/StarField";
import WeaveJoin from "@/components/WeaveJoin";
import { theme, DiaryType } from "@/lib/theme";
import { rgba, mix } from "@/lib/color";
import { useLang } from "@/lib/i18n";

const p = theme;
const HE: Record<DiaryType, [string, string]> = {
  creation: ["היצירה", "נשזרה"],
  dream: ["החלום", "נשזר"],
  idea: ["הרעיון", "נשזר"],
  reality: ["המציאות", "נשזרה"],
};

function RevealInner() {
  const sp = useSearchParams();
  const { t, lang } = useLang();
  const raw = sp.get("diary") || "dream";
  const key = (["creation", "dream", "idea", "reality"].includes(raw) ? raw : "dream") as DiaryType;
  const total = Number(sp.get("count") ?? 0) || 0;
  const entryId = sp.get("id");
  const viewHref = entryId ? `/entry/${entryId}` : "/journals";
  const c = p.dots[key];
  const diaryName = t(`diary.${key}`);
  const [theLabel, wove] = HE[key];
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

        {/* WeaveJoin B — approved reveal animation */}
        <div style={{ flex: "0 1 auto", display: "flex", alignItems: "center", justifyContent: "center", marginTop: "clamp(8px, 3vh, 26px)" }}>
          <WeaveJoin color={c} size={300} />
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
