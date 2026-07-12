"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import StarField from "@/components/StarField";
import WeaveSphere from "@/components/WeaveSphere";
import BottomNav from "@/components/BottomNav";
import { theme } from "@/lib/theme";
import { useLang } from "@/lib/i18n";
import { listConsciousnessDots, getProfile, MindDot, DbProfile } from "@/lib/supabase/data";
import { initialsFrom } from "@/lib/format";

// The weave renders one dot per memory, 1:1 with the number shown, up to this cap.
// Beyond it (a very large community) it samples down while always keeping your own,
// and each dot auto-shrinks so the sphere stays dense and beautiful as it grows.
const MAX_DOTS = 400;

export default function HomePage() {
  const p = theme;
  const { t, lang } = useLang();
  const [dots, setDots] = useState<MindDot[] | null>(null);
  const [profile, setProfile] = useState<DbProfile | null>(null);
  const [mode, setMode] = useState<"collective" | "mine">("collective");

  useEffect(() => {
    let alive = true;
    listConsciousnessDots().then((d) => { if (alive) setDots(d); }).catch(() => { if (alive) setDots([]); });
    getProfile().then((pr) => { if (alive) setProfile(pr); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const loading = dots === null;
  const total = dots?.length ?? 0;
  const mineCount = dots ? dots.filter((d) => d.mine).length : 0;
  const isEmpty = !loading && total === 0;
  const dateStr = new Date().toLocaleDateString(lang === "en" ? "en-US" : "he-IL", { day: "numeric", month: "long", year: "numeric" });

  // Everyone's dots (capped, mine-first from the RPC so the cap keeps my own).
  const nodes = useMemo(() => (dots ? dots.slice(0, MAX_DOTS) : []), [dots]);
  // Dots shrink as the weave grows so it stays dense and clean, never cluttered.
  const dotScale = useMemo(() => Math.max(0.5, Math.min(1.15, Math.sqrt(110 / Math.max(1, nodes.length)))), [nodes.length]);
  const dimSphere = loading || isEmpty;
  const mineMode = mode === "mine";

  const countText = loading
    ? t("home.loading")
    : mineMode
      ? `${mineCount} ${t("home.woven")}`
      : `${total} ${t("mind.collectiveWoven")}`;

  return (
    <main style={{ position: "relative", minHeight: "100svh", overflow: "hidden", background: p.bg, color: p.text }}>
      <StarField count={p.starCount} color={p.starColor} />

      <div style={{ position: "relative", display: "flex", flexDirection: "column", padding: "24px 18px 92px", minHeight: "100svh" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
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

          <Link href="/profile" aria-label={t("nav.profile")} style={{ position: "relative", width: 46, height: 46, flex: "0 0 auto", textDecoration: "none" }}>
            <div style={{ position: "absolute", inset: -5, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,92,196,0.45), transparent 68%)" }} />
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" referrerPolicy="no-referrer" style={{ position: "relative", width: 46, height: 46, borderRadius: "50%", objectFit: "cover", boxShadow: "0 6px 18px rgba(0,0,0,0.35), inset 0 1px 1px rgba(255,255,255,0.25)" }} />
            ) : (
              <div style={{ position: "relative", width: 46, height: 46, borderRadius: "50%", background: "linear-gradient(135deg,#6E8BFF,#9A6CFF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 700, color: "#fff", boxShadow: "0 6px 18px rgba(0,0,0,0.35), inset 0 1px 1px rgba(255,255,255,0.3)" }}>
                {initialsFrom(profile?.display_name ?? null, profile?.email ?? "")}
              </div>
            )}
          </Link>
        </div>

        {/* Title */}
        <div style={{ textAlign: "center", marginTop: 18 }}>
          <div style={{ fontSize: 12, letterSpacing: 1, color: p.subtext }}>{dateStr}</div>
          <div style={{ fontSize: 25, fontWeight: 700, lineHeight: 1.1, marginTop: 7 }}>{t("home.weave")}</div>
          <div style={{ fontSize: 11.5, color: p.subtext, marginTop: 4 }}>{countText}</div>
        </div>

        {/* Weave sphere — fills the screen */}
        <div style={{ position: "relative", flex: "1 1 auto", minHeight: 320, marginTop: 6 }}>
          <div style={{ position: "absolute", inset: 0, background: p.coreGlow, pointerEvents: "none", opacity: dimSphere ? 0.4 : 1 }} />
          <div style={{ position: "absolute", inset: 0, opacity: dimSphere ? 0.35 : 1, transition: "opacity 0.5s" }}>
            {loading ? (
              <WeaveSphere dots={p.dots} lineColor={p.lineColor} count={8} frozen />
            ) : (
              <WeaveSphere dots={p.dots} lineColor={p.lineColor} nodes={nodes} dotScale={dotScale} dimOthers={mineMode} frozen={isEmpty} />
            )}
          </div>
          {isEmpty && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 30px", pointerEvents: "none" }}>
              <div style={{ fontSize: 16.5, fontWeight: 700 }}>{t("home.emptyTitle")}</div>
              <div style={{ fontSize: 12.5, color: p.subtext, marginTop: 6, lineHeight: 1.5 }}>{t("home.emptyBody")}</div>
            </div>
          )}
        </div>

        {/* Consciousness toggle — small, above the nav */}
        {isEmpty ? (
          <Link href="/entry/new" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, marginTop: 8, height: 50, borderRadius: 16, textDecoration: "none", background: `linear-gradient(135deg, ${p.fabFrom}, ${p.fabTo})`, boxShadow: `0 12px 30px ${p.fabFrom}73` }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{t("home.emptyCta")}</span>
          </Link>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, marginTop: 8 }}>
            <div style={{ display: "flex", background: "rgba(0,0,0,0.28)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 999, padding: 3, width: 218 }}>
              {(["collective", "mine"] as const).map((m) => {
                const on = mode === m;
                return (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    style={{
                      flex: 1, border: "none", cursor: "pointer", font: "inherit", fontSize: 12, fontWeight: 700, padding: "7px 0", borderRadius: 999,
                      background: on ? `linear-gradient(135deg, ${p.fabFrom}, ${p.fabTo})` : "transparent",
                      color: on ? "#fff" : "rgba(233,236,255,0.6)",
                      boxShadow: on ? "0 5px 14px rgba(120,110,255,0.38)" : "none",
                    }}
                  >
                    {m === "collective" ? t("mind.collectiveShort") : t("mind.mineShort")}
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 11, color: p.subtext, height: 14 }}>{mineMode ? t("mind.mineHint") : ""}</div>
          </div>
        )}
      </div>

      <BottomNav active="mind" />
    </main>
  );
}
