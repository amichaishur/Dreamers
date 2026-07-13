"use client";

import { useEffect, useState } from "react";
import StarField from "@/components/StarField";
import BottomNav from "@/components/BottomNav";
import { useLang } from "@/lib/i18n";
import { DIARIES } from "@/lib/diary";
import { listStatsEntries, DbEntry } from "@/lib/supabase/data";
import { computeStats, LucidityPoint } from "@/lib/stats";

const BG = "linear-gradient(168deg,#0C0C1E 0%,#160F30 52%,#241A44 100%)";
const card: React.CSSProperties = { borderRadius: 22, background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.09)", marginBottom: 9 };
const DIARY_COLOR: Record<string, string> = Object.fromEntries(DIARIES.map((d) => [d.key, d.color]));

type LucRange = "month" | "year" | "5y";
const RANGE_DAYS: Record<LucRange, number> = { month: 30, year: 365, "5y": 1825 };

/** Stock-style lucidity graph: purple line + dots over time, 0-10 scale. */
function LucidityChart({ points, lang, t }: { points: LucidityPoint[]; lang: string; t: (k: string) => string }) {
  const [range, setRange] = useState<LucRange>("month");
  const now = Date.now();
  const winStart = now - RANGE_DAYS[range] * 86400000;
  const win = points.filter((pt) => pt.t >= winStart);
  const prev = points.filter((pt) => pt.t >= winStart - RANGE_DAYS[range] * 86400000 && pt.t < winStart);

  const avg = win.length ? win.reduce((s, x) => s + x.v, 0) / win.length : 0;
  const prevAvg = prev.length ? prev.reduce((s, x) => s + x.v, 0) / prev.length : 0;
  const changePct = prev.length && prevAvg > 0 ? Math.round(((avg - prevAvg) / prevAvg) * 100) : null;
  const latest = win.length ? win[win.length - 1].v : null;
  // Brand purple line (stock-style shape, our colours).
  const lineC = "#B79CEB";

  // Chart geometry (viewBox space)
  const W = 340, H = 150, padL = 22, padR = 34, padT = 12, padB = 22;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const t0 = win.length ? Math.min(win[0].t, now - RANGE_DAYS[range] * 86400000 * 0.15) : winStart;
  const t1 = now;
  const px = (tm: number) => padL + (t1 === t0 ? innerW / 2 : ((tm - t0) / (t1 - t0)) * innerW);
  const py = (v: number) => padT + (1 - v / 10) * innerH;
  const linePts = win.map((pt) => `${px(pt.t).toFixed(1)},${py(pt.v).toFixed(1)}`).join(" ");
  const areaPts = win.length ? `${px(win[0].t).toFixed(1)},${py(0).toFixed(1)} ${linePts} ${px(win[win.length - 1].t).toFixed(1)},${py(0).toFixed(1)}` : "";

  const ticks = [0, 0.33, 0.66].map((f) => {
    const tm = t0 + (t1 - t0) * f;
    return { x: px(tm), label: new Date(tm).toLocaleDateString(lang === "en" ? "en-US" : "he-IL", { day: "numeric", month: "numeric" }) };
  });

  const tab = (on: boolean): React.CSSProperties => ({ padding: "5px 11px", borderRadius: 9, fontSize: 11.5, fontWeight: on ? 700 : 500, border: on ? "1px solid rgba(191,211,255,0.4)" : "1px solid transparent", background: on ? "rgba(126,150,255,0.14)" : "transparent", color: on ? "#BFD3FF" : "rgba(236,231,250,0.5)", cursor: "pointer" });

  return (
    <div style={{ ...card, padding: "15px 18px 13px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#B79CEB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "0 0 auto" }}><polyline points="2 12 6 12 9 5 14 19 17 12 22 12" /></svg>
            <span style={{ fontSize: 15, fontWeight: 700 }}>{t("db.lucMeter")}</span>
          </div>
          <div style={{ fontSize: 11, color: "rgba(236,231,250,0.5)", marginTop: 2 }}>{t("db.lucSub")}</div>
        </div>
        <div style={{ display: "flex", gap: 2, padding: 3, borderRadius: 11, background: "rgba(0,0,0,0.25)", flex: "0 0 auto" }}>
          <button style={tab(range === "month")} onClick={() => setRange("month")}>{t("db.rMonth")}</button>
          <button style={tab(range === "year")} onClick={() => setRange("year")}>{t("db.rYear")}</button>
          <button style={tab(range === "5y")} onClick={() => setRange("5y")}>{t("db.r5y")}</button>
        </div>
      </div>

      {win.length === 0 ? (
        <div style={{ textAlign: "center", color: "rgba(236,231,250,0.45)", fontSize: 12.5, padding: "34px 0" }}>{t("db.lucEmpty")}</div>
      ) : (
        <>
          <div dir="ltr" style={{ width: "100%" }}>
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
              <defs>
                <linearGradient id="lucArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor={lineC} stopOpacity="0.28" />
                  <stop offset="1" stopColor={lineC} stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0, 2, 4, 6, 8, 10].map((v) => (
                <g key={v}>
                  <line x1={padL} x2={W - padR} y1={py(v)} y2={py(v)} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                  <text x={padL - 6} y={py(v) + 3} textAnchor="end" fontSize="8.5" fill="rgba(236,231,250,0.45)">{v}</text>
                </g>
              ))}
              {latest !== null && <line x1={padL} x2={W - padR} y1={py(latest)} y2={py(latest)} stroke={lineC} strokeWidth="0.7" strokeDasharray="2 3" opacity="0.5" />}
              {win.length > 1 && <polygon points={areaPts} fill="url(#lucArea)" />}
              {win.length > 1 && <polyline points={linePts} fill="none" stroke={lineC} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 4px ${lineC}99)` }} />}
              {win.length <= 45 && win.map((pt, i) => (
                <circle key={i} cx={px(pt.t)} cy={py(pt.v)} r={win.length > 25 ? 1.8 : 2.6} fill={lineC} stroke="#160F30" strokeWidth="1" />
              ))}
              {latest !== null && (
                <circle cx={px(win[win.length - 1].t)} cy={py(latest)} r={3.4} fill="#fff" stroke={lineC} strokeWidth="1.6" />
              )}
              {latest !== null && (
                <g>
                  <rect x={W - padR + 3} y={py(latest) - 9} width={28} height={18} rx={5} fill={lineC} />
                  <text x={W - padR + 17} y={py(latest) + 3.5} textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#0C0C1E">{Number.isInteger(latest) ? latest : latest.toFixed(1)}</text>
                </g>
              )}
              {ticks.map((tk, i) => (
                <text key={i} x={tk.x} y={H - 7} textAnchor="middle" fontSize="8.5" fill="rgba(236,231,250,0.42)">{tk.label}</text>
              ))}
              <text x={W - padR} y={H - 7} textAnchor="end" fontSize="8.5" fontWeight="700" fill="#BFD3FF">{t("db.today")}</text>
            </svg>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
            {changePct !== null ? (
              <span style={{ fontSize: 12.5, fontWeight: 700, color: changePct >= 0 ? "#7FD6A2" : "#F0A4A4" }}>
                {changePct >= 0 ? "↑" : "↓"} {Math.abs(changePct)}% <span style={{ fontWeight: 400, color: "rgba(236,231,250,0.55)" }}>{t("db.vsPrev")}</span>
              </span>
            ) : <span />}
            <span style={{ fontSize: 12.5, color: "rgba(236,231,250,0.55)" }}>
              {t("db.overallAvg")} <span style={{ fontSize: 15, fontWeight: 800, color: "#C9B6F2", fontVariantNumeric: "tabular-nums" }}>{avg.toFixed(1).replace(/\.0$/, "")}</span>
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { t, lang } = useLang();
  const [entries, setEntries] = useState<DbEntry[]>([]);

  useEffect(() => {
    let alive = true;
    listStatsEntries().then((rows) => { if (alive) setEntries(rows); }).catch(() => {});
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

  const mostActiveType = DIARIES.reduce((best, d) => (stats.byType[d.key] > stats.byType[best.key] ? d : best), DIARIES[0]);
  const hasMostActive = stats.byType[mostActiveType.key] > 0;

  const DREAM = "#B79CEB";
  const maxHist = Math.max(1, ...stats.lucidityHist);
  const hasLucid = stats.lucidityCount > 0;
  const wdLabels = lang === "en" ? ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] : ["א", "ב", "ג", "ד", "ה", "ו", "ש"];
  const maxWd = Math.max(1, ...stats.dreamsByWeekday);
  const peakWd = stats.dreamsByWeekday.indexOf(Math.max(...stats.dreamsByWeekday));

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

        {/* ---------- Dream metrics section ---------- */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, margin: "18px 2px 11px" }}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={DREAM} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 5px ${DREAM}aa)`, flex: "0 0 auto" }}><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.3px" }}>{t("db.dreamSection")}</div>
            <div style={{ fontSize: 11.5, color: "rgba(236,231,250,0.55)", marginTop: 1 }}>{t("db.dreamSectionSub")}</div>
          </div>
        </div>

        <LucidityChart points={stats.lucidityPoints} lang={lang} t={t} />

        {/* Lucidity distribution */}
        <div style={{ ...card, padding: "15px 18px 14px" }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{t("db.lucidDist")}</div>
          <div style={{ fontSize: 11, color: "rgba(236,231,250,0.5)", marginTop: 2, marginBottom: 14 }}>{t("db.lucidDistSub")}</div>
          {hasLucid ? (
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 4, height: 96 }}>
              {stats.lucidityHist.map((c, level) => {
                const col = `rgba(183,156,235,${(0.32 + 0.68 * (level / 10)).toFixed(2)})`;
                return (
                  <div key={level} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%", justifyContent: "flex-end" }}>
                    <div style={{ fontSize: 9.5, fontWeight: 700, color: c ? "#C9B6F2" : "rgba(236,231,250,0.3)", fontVariantNumeric: "tabular-nums" }}>{c || ""}</div>
                    <div style={{ width: "100%", maxWidth: 18, height: `${(4 + (c / maxHist) * 62).toFixed(0)}px`, borderRadius: 5, background: col, boxShadow: c ? `0 0 8px ${col}` : "none", transformOrigin: "bottom", animation: `growY 0.7s cubic-bezier(.2,.8,.2,1) ${(0.03 * level).toFixed(2)}s both` }} />
                    <div style={{ fontSize: 9.5, fontWeight: 600, color: "rgba(236,231,250,0.5)" }}>{level}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: "center", color: "rgba(236,231,250,0.45)", fontSize: 12.5, padding: "28px 0" }}>{t("db.dreamEmpty")}</div>
          )}
        </div>

        {/* Dreams by weekday */}
        {stats.dreamCount > 0 && (
          <div style={{ ...card, padding: "15px 18px 14px" }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{t("db.byWeekday")}</div>
            <div style={{ fontSize: 11, color: "rgba(236,231,250,0.5)", marginTop: 2, marginBottom: 14 }}>{t("db.byWeekdaySub")}</div>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 7, height: 92 }}>
              {stats.dreamsByWeekday.map((c, i) => {
                const peak = i === peakWd && c > 0;
                return (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, height: "100%", justifyContent: "flex-end" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: peak ? "#C9B6F2" : "rgba(236,231,250,0.5)", fontVariantNumeric: "tabular-nums" }}>{c || ""}</div>
                    <div style={{ width: "100%", maxWidth: 26, height: `${(4 + (c / maxWd) * 60).toFixed(0)}px`, borderRadius: 6, background: peak ? "linear-gradient(180deg,#D3C4F5,#9A8CFF)" : "linear-gradient(180deg,#8E7AC8,#6E5B9E)", boxShadow: peak ? "0 0 10px rgba(154,124,235,0.7)" : "none", transformOrigin: "bottom", animation: `growY 0.7s cubic-bezier(.2,.8,.2,1) ${(0.04 * i).toFixed(2)}s both` }} />
                    <div style={{ fontSize: 11, fontWeight: peak ? 700 : 500, color: peak ? "#C9B6F2" : "rgba(236,231,250,0.5)" }}>{wdLabels[i]}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
