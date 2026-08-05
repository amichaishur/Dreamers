"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import StarField from "@/components/StarField";
import WeaveSphere from "@/components/WeaveSphere";
import WeaveGraph from "@/components/WeaveGraph";
import WeaveKnowledge from "@/components/WeaveKnowledge";
import BottomNav from "@/components/BottomNav";
import { theme } from "@/lib/theme";
import { useLang } from "@/lib/i18n";
import { listConsciousnessDots, listEntries, getProfile, MindDot, DbEntry, DbProfile } from "@/lib/supabase/data";
import { initialsFrom } from "@/lib/format";
import { WeaveItem, computeEdges } from "@/lib/weave";

// The weave renders one dot per memory, 1:1 with the number shown, up to this cap.
// Beyond it (a very large community) it samples down while always keeping your own,
// and each dot auto-shrinks so the sphere stays dense and beautiful as it grows.
const MAX_DOTS = 400;

/** Only while developing: deployed builds show the weave and nothing to switch. */
const SHOW_SHAPE_PICKER = process.env.NODE_ENV === "development";

export default function HomePage() {
  const p = theme;
  const { t, lang } = useLang();
  const [dots, setDots] = useState<MindDot[] | null>(null);
  const [own, setOwn] = useState<DbEntry[]>([]);
  const [profile, setProfile] = useState<DbProfile | null>(null);
  const [mode, setMode] = useState<"collective" | "mine">("collective");
  const [sel, setSel] = useState<number | null>(null);
  // The weave is the knowledge graph. The other two shapes stay reachable while
  // developing so they can still be compared, but anywhere the app is actually
  // deployed there is one weave and no switch.
  const [shape, setShape] = useState<"sphere" | "graph" | "knowledge">("knowledge");

  useEffect(() => {
    let alive = true;
    listConsciousnessDots().then((d) => { if (alive) setDots(d); }).catch(() => { if (alive) setDots([]); });
    listEntries().then((e) => { if (alive) setOwn(e); }).catch(() => {});
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

  // The map's memories. Only your own carry text on the device: the collective
  // weave deliberately ships nothing but an anonymous type per entry, so other
  // people's dreams can be counted and seen glowing but never read or linked by
  // content. Personal mode therefore shows the full relationship map; the
  // collective view shows the whole community as anonymous light.
  const items = useMemo<WeaveItem[]>(() => {
    if (mineMode) {
      return own.map((e) => ({
        id: e.id, title: e.title, body: e.body, type: e.type,
        createdAt: e.created_at, lucidity: e.lucidity, mine: true,
      }));
    }
    const mineIds = new Set(own.map((e) => e.id));
    const others = nodes.filter((d) => !d.mine).map((d, i) => ({
      id: `anon-${i}`, title: "", body: "", type: d.type,
      createdAt: new Date(0).toISOString(), lucidity: null, mine: false,
    }));
    const mine = own.map((e) => ({
      id: e.id, title: e.title, body: e.body, type: e.type,
      createdAt: e.created_at, lucidity: e.lucidity, mine: true,
    }));
    void mineIds;
    return [...mine, ...others];
  }, [mineMode, own, nodes]);

  // Relationships are computed on-device from the four rules. Entries without
  // text (everyone else's) simply never score, so they stay unlinked.
  const edges = useMemo(() => computeEdges(items), [items]);

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

        {/* The weave — a map you can move through */}
        <div style={{ position: "relative", flex: "1 1 auto", minHeight: 320, marginTop: 6 }}>
          <div style={{ position: "absolute", inset: 0, background: p.coreGlow, pointerEvents: "none", opacity: dimSphere ? 0.4 : 1 }} />
          <div style={{ position: "absolute", inset: 0, opacity: dimSphere ? 0.35 : 1, transition: "opacity 0.5s" }}>
            {loading ? (
              <WeaveSphere dots={p.dots} lineColor={p.lineColor} count={8} frozen />
            ) : shape === "sphere" ? (
              <WeaveSphere
                dots={p.dots}
                lineColor={p.lineColor}
                nodes={nodes}
                dotScale={dotScale}
                dimOthers={mineMode}
                frozen={isEmpty}
                interactive
              />
            ) : shape === "graph" ? (
              <WeaveGraph
                dots={p.dots}
                lineColor={p.lineColor}
                items={items}
                edges={edges}
                dimOthers={mineMode}
                showLabels={mineMode}
                selected={sel}
                onSelect={setSel}
              />
            ) : (
              <WeaveKnowledge
                dots={p.dots}
                items={items}
                edges={edges}
                dimOthers={mineMode}
                selected={sel}
                onSelect={setSel}
              />
            )}
          </div>

          {/* Shape switch — a development affordance for comparing the three */}
          {SHOW_SHAPE_PICKER && !loading && !isEmpty && (
            <div style={{ position: "absolute", top: 6, insetInlineEnd: 2, display: "flex", gap: 4, padding: 3, borderRadius: 999, background: "rgba(28,26,52,0.72)", border: `1px solid ${p.cardBorder}`, backdropFilter: "blur(8px)", zIndex: 2 }}>
              {([["sphere", t("mind.shapeSphere")], ["graph", t("mind.shapeGraph")], ["knowledge", t("mind.shapeKnowledge")]] as const).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => { setShape(k); setSel(null); }}
                  style={{ border: "none", cursor: "pointer", font: "inherit", fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 999, background: shape === k ? `linear-gradient(135deg, ${p.fabFrom}, ${p.fabTo})` : "transparent", color: shape === k ? "#fff" : p.subtext }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Tapped memory: title plus what it connects to and why */}
          {sel !== null && items[sel] && items[sel].mine && (
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "12px 14px", borderRadius: 16, background: "linear-gradient(180deg, rgba(20,18,44,0.86), rgba(11,11,26,0.95))", border: `1px solid ${p.cardBorder}`, backdropFilter: "blur(16px)", zIndex: 2 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: p.dots[items[sel].type], boxShadow: `0 0 7px ${p.dots[items[sel].type]}`, flex: "0 0 auto" }} />
                <Link href={`/entry/${items[sel].id}`} style={{ flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: 700, color: p.text, textDecoration: "none", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {items[sel].title}
                </Link>
                <button onClick={() => setSel(null)} aria-label={t("mind.close")} style={{ width: 24, height: 24, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.08)", color: p.subtext, cursor: "pointer", flex: "0 0 auto", fontSize: 13, lineHeight: 1 }}>×</button>
              </div>
              {(() => {
                const linked = edges.filter((e) => e.a === sel || e.b === sel).sort((x, y) => y.strength - x.strength).slice(0, 3);
                if (!linked.length) return <div style={{ fontSize: 11.5, color: p.subtext, marginTop: 6 }}>{t("mind.noLinks")}</div>;
                return (
                  <div style={{ marginTop: 7, display: "flex", flexDirection: "column", gap: 5 }}>
                    {linked.map((e, k) => {
                      const o = items[e.a === sel ? e.b : e.a];
                      return (
                        <div key={k} style={{ fontSize: 11.5, color: p.subtext, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          <span style={{ color: p.text }}>{o.title}</span>
                          {" · "}{e.reasons[0]}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

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
