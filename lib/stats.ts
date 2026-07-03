import { DiaryType } from "@/lib/theme";
import type { DbEntry, Lucidity } from "@/lib/supabase/data";

export type Stats = {
  total: number;
  streak: number;
  thisMonth: number;
  byType: Record<DiaryType, number>;
  byLucidity: Record<Lucidity, number>;
  weekly: number[]; // 8 buckets, index 7 = this week
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

  const byType: Record<DiaryType, number> = { creation: 0, dream: 0, idea: 0, reality: 0 };
  entries.forEach((e) => { byType[e.type]++; });

  const byLucidity: Record<Lucidity, number> = { low: 0, med: 0, high: 0 };
  entries.forEach((e) => { if (e.lucidity) byLucidity[e.lucidity]++; });

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

  return { total, streak, thisMonth, byType, byLucidity, weekly };
}
