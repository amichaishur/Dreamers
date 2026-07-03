"use client";

import { useEffect, useState } from "react";
import StarField from "@/components/StarField";
import BottomNav from "@/components/BottomNav";
import { useLang } from "@/lib/i18n";
import { DIARIES } from "@/lib/diary";
import { listEntries, DbEntry } from "@/lib/supabase/data";
import { computeStats } from "@/lib/stats";

const BG = "linear-gradient(168deg,#0C0C1E 0%,#160F30 52%,#241A44 100%)";
const card: React.CSSProperties = { borderRadius: 22, background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.09)", marginBottom: 9 };
const DIARY_COLOR: Record<string, string> = Object.fromEntries(DIARIES.map((d) => [d.key, d.color]));

export default function DashboardPage() {
  const { t, lang } = useLang();
  const [entries, setEntries] = useState<DbEntry[]>([]);

  useEffect(() => {
    let alive = true;
    listEntries().then((rows) => { if (alive) setEntries(rows); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const stats = computeStats(entries);
  const maxWeekly = Math.max(1, ...stats.weekly);
  const weeks = stats.weekly.map((v, i) => {
    const now = i === stats.weekly.length - 1;
    const labelDate = new Date();
    labelDate.setDate(labelDate.getDate() - (7 - i) * 7);
    const label = now ? t("db.thisWeek") : labelDate.toLocaleDateString(lang === "en" ? "en-US" : "he-IL", { day: "numeric", month: "numeric" });
    return {
      count: v,
      h: (4 + (v / maxWeekly) * 66).toFixed(0) + "px",
      label,
      lblColor: now ? "#BFD3FF" : "rgba(236,231,250,0.42)",
      lblWeight: now ? 700 : 400,
      numColor: now ? "#BFD3FF" : "rgba(236,231,250,0.5)",
      bar: now ? "linear-gradient(180deg,#CFE0FF,#7E96FF)" : "linear-gradient(180deg,#9A8CFF,#6E8BFF)",
      barGlow: now ? "rgba(126,150,255,0.85)" : "rgba(124,110,255,0.5)",
      delay: (0.05 * i).toFixed(2) + "s",
    };
  });
  const avgPerWeek = (stats.weekly.reduce((a, b) => a + b, 0) / 8).toFixed(1).replace(/\.0$/, "");

  const donutTotal = Math.max(1, stats.total);
  let acc = 0;
  const segments = DIARIES.map((d) => {
    const count = stats.byType[d.key];
    const start = (acc / donutTotal) * 360;
    acc += count;
    const end = (acc / donutTotal) * 360;
    return `${d.color} ${start.toFixed(1)}deg ${end.toFixed(1)}deg`;
  });
  const conic = `conic-gradient(${segments.join(",")})`;

  const maxLuc = Math.max(1, stats.byLucidity.low, stats.byLucidity.med, stats.byLucidity.high);
  const clarity = (["high", "med", "low"] as const).map((k) => ({ key: k, count: stats.byLucidity[k], w: `${Math.round((stats.byLucidity[k] / maxLuc) * 100)}%` }));

  const mostActiveType = DIARIES.reduce((best, d) => (stats.byType[d.key] > stats.byType[best.key] ? d : best), DIARIES[0]);
  const hasMostActive = stats.byType[mostActiveType.key] > 0;

  return (
    <main style={{ position: "relative", minHeight: "100svh", overflow: "hidden", background: BG, color: "#ECE7FA" }}>
      <div style={{ position: "absolute", top: -110, left: "50%", transform: "translateX(-50%)", width: 440, height: 380, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,92,196,0.26), transparent 68%)", pointerEvents: "none" }} />
      <StarField count={70} color="rgba(220,226,255,0.85)" />

      <div style={{ position: "relative", padding: "18px 20px 96px" }}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 27, fontWeight: 800, letterSpacing: "-0.4px" }}>{t("db.title")}</div>
          <div style={{ fontSize: 12.5, color: "rgba(236,231,250,0.55)", marginTop: 2 }}>{t("db.sub")}</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 9 }}>
          {[
            { v: String(stats.total), label: t("db.total"), glow: "rgba(124,92,196,0.5)", numStyle: { background: "linear-gradient(135deg,#B79CEB,#6FA8DC)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" } as React.CSSProperties },
            { v: String(stats.streak), label: t("db.streak"), glow: "rgba(242,200,121,0.4)", numStyle: { color: "#F2C879" } },
            { v: String(stats.thisMonth), label: t("db.month"), glow: "rgba(127,214,162,0.4)", numStyle: { color: "#7FD6A2" } },
          ].map((m, i) => (
            <div key={i} style={{ position: "relative", padding: "13px 12px", borderRadius: 18, background: "rgba(255,255,255,0.055)", border: "1px solid rgba(255,255,255,0.1)", textAlign: "center", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: -18, left: "50%", transform: "translateX(-50%)", width: 60, height: 40, background: `radial-gradient(circle, ${m.glow}, transparent 70%)` }} />
              <div style={{ position: "relative", fontSize: 30, fontWeight: 800, lineHeight: 1, ...m.numStyle }}>{m.v}</div>
              <div style={{ position: "relative", fontSize: 11.5, color: "rgba(236,231,250,0.62)", marginTop: 7 }}>{m.label}</div>
            </div>
          ))}
        </div>

        <div style={{ ...card, padding: "15px 18px 16px" }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 13 }}>{t("db.byJournal")}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ position: "relative", width: 104, height: 104, flex: "0 0 auto" }}>
              <div style={{ position: "absolute", inset: -8, borderRadius: "50%", background: conic, filter: "blur(11px)", opacity: 0.55, animation: "spinSlow 26s linear infinite" }} />
              <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: conic }} />
              <div style={{ position: "absolute", inset: 18, borderRadius: "50%", background: "#120C26", boxShadow: "inset 0 1px 6px rgba(0,0,0,0.5)" }} />
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{stats.total}</div>
                <div style={{ fontSize: 10, color: "rgba(236,231,250,0.55)", marginTop: 2 }}>{t("db.memories")}</div>
              </div>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 9 }}>
              {DIARIES.map((d) => (
                <div key={d.key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: d.color, boxShadow: `0 0 7px ${d.color}`, flex: "0 0 auto" }} />
                  <span style={{ fontSize: 13.5, fontWeight: 600, flex: "0 0 auto" }}>{t(`diary.${d.key}`)}</span>
                  <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: d.color, fontVariantNumeric: "tabular-nums" }}>{stats.byType[d.key]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ ...card, padding: "15px 18px" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{t("db.avgWeek")}</div>
            <div style={{ fontSize: 11, color: "rgba(236,231,250,0.5)" }}>{t("db.last8")}</div>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 38, fontWeight: 800, lineHeight: 1, background: "linear-gradient(135deg,#CFE0FF,#7E96FF)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>{avgPerWeek}</span>
            <span style={{ fontSize: 13, color: "rgba(236,231,250,0.6)" }}>{t("db.perWeek")}</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 7, height: 94 }}>
            {weeks.map((w, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, height: "100%", justifyContent: "flex-end" }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: w.numColor, fontVariantNumeric: "tabular-nums" }}>{w.count}</div>
                <div style={{ width: "100%", maxWidth: 22, height: w.h, borderRadius: 6, background: w.bar, boxShadow: `0 0 9px ${w.barGlow}`, transformOrigin: "bottom", animation: `growY 0.8s cubic-bezier(.2,.8,.2,1) ${w.delay} both` }} />
                <div style={{ fontSize: 9.5, fontWeight: w.lblWeight, color: w.lblColor, whiteSpace: "nowrap" }}>{w.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...card, padding: "14px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 13 }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#B79CEB", boxShadow: "0 0 7px rgba(183,156,235,0.8)" }} />
            <div style={{ fontSize: 15, fontWeight: 700 }}>{t("db.clarity")}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {clarity.map((c) => (
              <div key={c.key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 500, width: 62, flex: "0 0 auto", color: "rgba(236,231,250,0.82)" }}>{t(`luc.${c.key}`)}</span>
                <div style={{ flex: 1, height: 9, borderRadius: 5, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
                  <div style={{ width: c.w, height: "100%", borderRadius: 5, background: "linear-gradient(90deg, rgba(183,156,235,0.55), #B79CEB)", boxShadow: "0 0 8px rgba(183,156,235,0.5)" }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#C9B6F2", width: 18, textAlign: "start", flex: "0 0 auto", fontVariantNumeric: "tabular-nums" }}>{c.count}</span>
              </div>
            ))}
          </div>
        </div>

        {hasMostActive && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, padding: 11, borderRadius: 16, background: "rgba(183,156,235,0.08)", border: "1px solid rgba(183,156,235,0.2)", fontSize: 13.5, color: "rgba(236,231,250,0.72)" }}>
            <svg width="17" height="19" viewBox="0 0 24 26" fill="none" stroke="#C9B6F2" strokeWidth="1.9" strokeLinejoin="round" style={{ filter: "drop-shadow(0 0 5px rgba(183,156,235,0.7))", flex: "0 0 auto" }}><path d="M12 1.6 21.4 7v12L12 24.4 2.6 19V7z" /></svg>
            <span>{t("db.mostActive")} <span style={{ color: "#C9B6F2", fontWeight: 700 }}>{t(`diary.${mostActiveType.key}`)}</span></span>
          </div>
        )}
      </div>

      <BottomNav active="dash" />
    </main>
  );
}
