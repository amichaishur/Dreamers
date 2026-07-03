"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import StarField from "@/components/StarField";
import WeaveSphere from "@/components/WeaveSphere";
import BottomNav from "@/components/BottomNav";
import { theme } from "@/lib/theme";
import { mix, rgba } from "@/lib/color";
import { useLang } from "@/lib/i18n";
import { listEntries, DbEntry } from "@/lib/supabase/data";

export default function HomePage() {
  const p = theme;
  const { t, lang } = useLang();
  const [entries, setEntries] = useState<DbEntry[] | null>(null);

  useEffect(() => {
    let alive = true;
    listEntries()
      .then((rows) => { if (alive) setEntries(rows); })
      .catch(() => { if (alive) setEntries([]); });
    return () => { alive = false; };
  }, []);

  const loading = entries === null;
  const count = entries?.length ?? 0;
  const isEmpty = !loading && count === 0;
  const dotCount = loading ? 56 : Math.max(6, Math.min(90, count));
  const dateStr = new Date().toLocaleDateString(lang === "en" ? "en-US" : "he-IL", { day: "numeric", month: "long", year: "numeric" });
  const recent = (entries ?? []).slice(0, 2);

  return (
    <main style={{ position: "relative", minHeight: "100svh", overflow: "hidden", background: p.bg, color: p.text }}>
      <StarField count={p.starCount} color={p.starColor} />

      <div style={{ position: "relative", display: "flex", flexDirection: "column", padding: "24px 18px 96px", minHeight: "100svh" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ position: "relative", width: 118 }}>
              <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1, direction: "ltr", textAlign: "left" }}>Dreamers</div>
              <svg viewBox="0 0 210 26" style={{ display: "block", width: "118px", height: "auto", marginTop: 2, overflow: "visible" }}>
                <defs>
                  <linearGradient id="hus" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="#5BC8FF" />
                    <stop offset="1" stopColor="#9A6CFF" />
                  </linearGradient>
                </defs>
                <path d="M6 14 C 55 3, 135 3, 186 11" fill="none" stroke="url(#hus)" strokeWidth="3.6" strokeLinecap="round" style={{ filter: "drop-shadow(0 0 5px rgba(140,160,255,0.7))" }} />
                <circle cx="196" cy="11" r="5.4" fill="#C9A9FF" style={{ filter: "drop-shadow(0 0 5px rgba(201,169,255,0.9))" }} />
                <circle cx="196" cy="11" r="2.6" fill="#fff" />
              </svg>
            </div>
            <div style={{ fontSize: 12.5, color: p.subtext, whiteSpace: "nowrap", marginTop: 4 }}>{t("brand.sub")}</div>
          </div>
        </div>

        {/* Title */}
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <div style={{ fontSize: 12, letterSpacing: 1, color: p.subtext }}>{dateStr}</div>
          <div style={{ fontSize: 25, fontWeight: 700, lineHeight: 1.1, marginTop: 7 }}>{t("home.weave")}</div>
          <div style={{ fontSize: 11.5, color: p.subtext, marginTop: 4 }}>{loading ? t("home.loading") : `${count} ${t("home.woven")}`}</div>
        </div>

        {/* Weave sphere */}
        <div style={{ position: "relative", flex: "0 0 auto", height: 346, marginTop: 6 }}>
          <div style={{ position: "absolute", inset: 0, background: p.coreGlow, pointerEvents: "none", opacity: isEmpty ? 0.4 : 1 }} />
          <div style={{ opacity: isEmpty ? 0.35 : 1, transition: "opacity 0.4s" }}>
            <WeaveSphere dots={p.dots} lineColor={p.lineColor} count={dotCount} frozen={isEmpty} />
          </div>
          {isEmpty && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 30px", pointerEvents: "none" }}>
              <div style={{ fontSize: 16.5, fontWeight: 700 }}>{t("home.emptyTitle")}</div>
              <div style={{ fontSize: 12.5, color: p.subtext, marginTop: 6, lineHeight: 1.5 }}>{t("home.emptyBody")}</div>
            </div>
          )}
        </div>

        {/* Recent */}
        {isEmpty ? (
          <Link href="/entry/new" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, marginTop: 14, height: 50, borderRadius: 16, textDecoration: "none", background: `linear-gradient(135deg, ${p.fabFrom}, ${p.fabTo})`, boxShadow: `0 12px 30px ${p.fabFrom}73` }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{t("home.emptyCta")}</span>
          </Link>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.4, color: p.subtext }}>{t("home.recently")}</div>
            {recent.map((e) => {
              const c = p.dots[e.type];
              const hexBg = `radial-gradient(circle at 50% 30%, ${mix(c, "#ffffff", 0.5)} 0%, ${c} 52%, ${mix(c, "#0a0512", 0.4)} 100%)`;
              const miniGlow = `drop-shadow(0 0 4px ${rgba(c, 0.95)}) drop-shadow(0 0 8px ${rgba(c, 0.45)})`;
              const time = new Date(e.created_at).toLocaleTimeString(lang === "en" ? "en-US" : "he-IL", { hour: "2-digit", minute: "2-digit" });
              return (
                <Link key={e.id} href={`/entry/${e.id}`} style={{ display: "flex", alignItems: "center", gap: 12, background: p.cardBg, border: `1px solid ${p.cardBorder}`, borderRadius: 15, padding: "12px 14px", textDecoration: "none", color: "inherit" }}>
                  <div style={{ filter: miniGlow, display: "flex", flex: "0 0 auto" }}>
                    <div style={{ width: 12, height: 13, clipPath: "polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)", background: hexBg }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.title}</div>
                    <div style={{ fontSize: 11.5, color: p.subtext, marginTop: 2 }}>{t(`diary.${e.type}`)}</div>
                  </div>
                  <div style={{ fontSize: 11.5, color: p.subtext, fontVariantNumeric: "tabular-nums" }}>{time}</div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav active="mind" />
    </main>
  );
}
