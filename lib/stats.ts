import { DiaryType } from "@/lib/theme";
import type { DbEntry } from "@/lib/supabase/data";

export type LucidityPoint = { t: number; v: number }; // timestamp ms, value 0-10

export type Stats = {
  total: number;
  streak: number;
  thisMonth: number;
  byType: Record<DiaryType, number>;
  lucidityAvg: number;         // average 0-10 over dreams that have a value
  lucidityCount: number;       // how many dreams carry a lucidity value
  lucidityPoints: LucidityPoint[]; // chronological, for the lucidity graph
  weekly: number[]; // 8 buckets, index 7 = this week
  // Dream-focused
  dreamCount: number;          // entries of type "dream"
  dreamMonth: number;          // dreams logged this month
  lucidCount: number;          // dreams with lucidity >= 7
  maxLucidity: number;         // highest lucidity value logged (0 if none)
  lucidityHist: number[];      // length 11, index = level 0..10 → count
  dreamsByWeekday: number[];   // length 7, 0 = Sunday
};

export function computeStats(entries: DbEntry[]): Stats {
  const total = entries.length;

  const days = new Set(entries.map((e) => new Date(e.created_at).toDateString()));
  let streak = 0;
  const cursor = new Date();
  while (days.has(cursor.toDateString())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  const now = new Date();
  const thisMonth = entries.filter((e) => {
    const d = new Date(e.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const byType: Record<DiaryType, number> = { creation: 0, dream: 0, idea: 0, reality: 0, record: 0 };
  entries.forEach((e) => { byType[e.type]++; });

  const lucids = entries
    .filter((e) => e.lucidity != null && e.lucidity !== "")
    .map((e) => ({ t: new Date(e.created_at).getTime(), v: Number(e.lucidity) }))
    .filter((x) => !Number.isNaN(x.v))
    .sort((a, b) => a.t - b.t);
  const lucidityCount = lucids.length;
  const lucidityAvg = lucidityCount ? lucids.reduce((s, x) => s + x.v, 0) / lucidityCount : 0;
  const lucidityPoints = lucids;

  // Dream-focused metrics
  const dreams = entries.filter((e) => e.type === "dream");
  const dreamCount = dreams.length;
  const dreamMonth = dreams.filter((e) => {
    const d = new Date(e.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const lucidCount = lucids.filter((x) => x.v >= 7).length;
  const maxLucidity = lucids.reduce((m, x) => Math.max(m, x.v), 0);
  const lucidityHist = new Array(11).fill(0);
  lucids.forEach((x) => { const b = Math.max(0, Math.min(10, Math.round(x.v))); lucidityHist[b]++; });
  const dreamsByWeekday = new Array(7).fill(0);
  dreams.forEach((e) => { dreamsByWeekday[new Date(e.created_at).getDay()]++; });

  const msDay = 86400000;
  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);
  const weekly = new Array(8).fill(0);
  entries.forEach((e) => {
    const d = new Date(e.created_at);
    d.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((startToday.getTime() - d.getTime()) / msDay);
    const weekIdx = Math.floor(diffDays / 7);
    const idx = 7 - weekIdx;
    if (idx >= 0 && idx < 8) weekly[idx]++;
  });

  return {
    total, streak, thisMonth, byType, lucidityAvg, lucidityCount, lucidityPoints, weekly,
    dreamCount, dreamMonth, lucidCount, maxLucidity, lucidityHist, dreamsByWeekday,
  };
}
