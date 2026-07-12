"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import StarField from "@/components/StarField";
import DiaryHex from "@/components/DiaryHex";
import BottomNav from "@/components/BottomNav";
import { theme, DiaryType } from "@/lib/theme";
import { diaryStyle } from "@/lib/diary";
import { useLang } from "@/lib/i18n";
import { listSharedEntries, getCommunityStats, SharedEntry, CommunityStats } from "@/lib/supabase/data";

const p = theme;
const TYPES: DiaryType[] = ["reality", "idea", "dream", "creation", "record"];
type Filter = DiaryType | "all";

export default function CommunityPage() {
  const { t, lang } = useLang();
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<SharedEntry[] | null>(null);
  const [stats, setStats] = useState<CommunityStats | null>(null);

  useEffect(() => {
    let alive = true;
    listSharedEntries().then((r) => { if (alive) setRows(r); }).catch(() => { if (alive) setRows([]); });
    getCommunityStats().then((s) => { if (alive) setStats(s); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const loading = rows === null;

  const filtered = useMemo(() => {
    const all = rows ?? [];
    const q = query.trim().toLowerCase();
    return all.filter((e) => {
      if (filter !== "all" && e.type !== filter) return false;
      if (q) {
        const who = e.shared_anonymous ? "" : e.author_name ?? "";
        if (!(`${e.title} ${e.body} ${who}`.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [rows, filter, query]);

  const activeColor = filter === "all" ? p.fabTo : p.dots[filter];
  const activeLabel = filter === "all" ? t("cm.allDreams") : t(`diary.${filter}`);

  return (
    <main style={{ position: "relative", minHeight: "100svh", overflow: "hidden", background: p.bg, color: p.text }}>
      <StarField count={70} color={p.starColor} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 240, background: p.coreGlow, pointerEvents: "none", opacity: 0.7 }} />

      <div style={{ position: "relative", padding: "26px 18px 96px" }}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.3px" }}>{t("cm.title")}</div>
          <div style={{ fontSize: 13, color: p.subtext, marginTop: 3 }}>{t("cm.sub")}</div>
        </div>

        {/* Metric strip */}
        <div style={{ display: "flex", gap: 9, marginBottom: 16 }}>
          {([
            { v: stats?.shared, label: t("cm.statShared"), color: "#B79CEB" },
            { v: stats?.members, label: t("cm.statMembers"), color: "#6FA8DC" },
            { v: stats?.week, label: t("cm.statWeek"), color: "#7FD6A2" },
          ] as const).map((s, i) => (
            <div key={i} style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: `1px solid ${p.cardBorder}`, borderRadius: 13, padding: "11px 8px", textAlign: "center" }}>
              <div style={{ fontSize: 21, fontWeight: 800, lineHeight: 1, color: s.color }}>{stats === null ? "·" : s.v}</div>
              <div style={{ fontSize: 10.5, color: p.subtext, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Smart search */}
        <div style={{ position: "relative", marginBottom: 12 }}>
          <span style={{ position: "absolute", insetInlineStart: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", display: "flex" }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={p.subtext} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></svg>
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("jr.search")}
            style={{ width: "100%", height: 46, borderRadius: 14, border: `1px solid ${p.cardBorder}`, background: p.cardBg, color: p.text, fontSize: 14.5, font: "inherit", outline: "none", paddingInlineStart: 40, paddingInlineEnd: query ? 40 : 14 }}
          />
          {query && (
            <button onClick={() => setQuery("")} aria-label="clear" style={{ position: "absolute", insetInlineEnd: 10, top: "50%", transform: "translateY(-50%)", width: 26, height: 26, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.08)", color: p.subtext, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6 L18 18 M18 6 L6 18" /></svg>
            </button>
          )}
        </div>

        {/* Dropdown filter */}
        <div style={{ position: "relative", marginBottom: 16, zIndex: 20 }}>
          <button
            onClick={() => setOpen((o) => !o)}
            style={{ width: "100%", height: 46, borderRadius: 14, border: `1px solid ${p.cardBorder}`, background: p.cardBg, color: p.text, font: "inherit", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, padding: "0 14px" }}
          >
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: activeColor, boxShadow: `0 0 7px ${activeColor}`, flex: "0 0 auto" }} />
            <span style={{ flex: 1, textAlign: "start", fontSize: 14.5, fontWeight: 700 }}>{activeLabel}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={p.subtext} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}><polyline points="6 9 12 15 18 9" /></svg>
          </button>
          {open && (
            <>
              <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 10 }} />
              <div style={{ position: "absolute", top: 52, insetInlineStart: 0, insetInlineEnd: 0, zIndex: 30, borderRadius: 14, overflow: "hidden", background: "linear-gradient(180deg, rgba(26,24,48,0.98), rgba(11,11,26,0.99))", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 18px 44px rgba(0,0,0,0.55)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}>
                {(["all", ...TYPES] as Filter[]).map((k) => {
                  const color = k === "all" ? p.fabTo : p.dots[k];
                  const label = k === "all" ? t("cm.allDreams") : t(`diary.${k}`);
                  const active = filter === k;
                  return (
                    <button
                      key={k}
                      onClick={() => { setFilter(k); setOpen(false); }}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "13px 15px", border: "none", borderBottom: k === "record" ? "none" : "1px solid rgba(255,255,255,0.06)", background: active ? "rgba(255,255,255,0.08)" : "transparent", color: p.text, font: "inherit", cursor: "pointer" }}
                    >
                      <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, boxShadow: `0 0 7px ${color}`, flex: "0 0 auto" }} />
                      <span style={{ flex: 1, textAlign: "start", fontSize: 14.5, fontWeight: active ? 700 : 500 }}>{label}</span>
                      {active && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* List — same look as journals, community entries only */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((e) => {
            const color = p.dots[e.type];
            const s = diaryStyle(color);
            const date = new Date(e.created_at).toLocaleDateString(lang === "en" ? "en-US" : "he-IL", { day: "numeric", month: "short" });
            const who = e.shared_anonymous ? t("jr.byAnon") : e.author_name ? `${t("jr.by")} ${e.author_name}` : null;
            return (
              <Link key={e.id} href={`/d/${e.id}`} style={{ display: "flex", alignItems: "center", gap: 12, background: p.cardBg, border: `1px solid ${p.cardBorder}`, borderRadius: 16, padding: "13px 14px", textDecoration: "none", color: "inherit" }}>
                <DiaryHex color={color} w={30} h={32} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.title}</div>
                  <div style={{ fontSize: 12, color: s.nameColor, marginTop: 2 }}>{t(`diary.${e.type}`)}{who ? ` · ${who}` : ""}</div>
                </div>
                <div style={{ fontSize: 12, color: p.subtext, fontVariantNumeric: "tabular-nums" }}>{date}</div>
              </Link>
            );
          })}
          {!loading && filtered.length === 0 && (
            <div style={{ textAlign: "center", color: p.subtext, fontSize: 13.5, padding: "44px 0" }}>
              {query.trim() ? t("jr.noResults") : t("cm.empty")}
            </div>
          )}
        </div>
      </div>

      <BottomNav active="community" />
    </main>
  );
}
