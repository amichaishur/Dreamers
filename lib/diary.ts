import { rgba, mix } from "./color";

export type DiaryKey = "creation" | "dream" | "idea" | "reality";

export const DIARIES: { key: DiaryKey; name: string; hint: string; color: string }[] = [
  { key: "creation", name: "יצירה", hint: "מה שיצרתי או בניתי", color: "#6FA8DC" },
  { key: "dream", name: "חלום", hint: "מסעות הלילה והתת־מודע", color: "#B79CEB" },
  { key: "idea", name: "רעיון", hint: "ניצוצות והברקות שצפו", color: "#7FD6A2" },
  { key: "reality", name: "מציאות", hint: "רגעים מהיום שחלף", color: "#F2C879" },
];

export const DIARY_MAP = Object.fromEntries(DIARIES.map((d) => [d.key, d])) as Record<DiaryKey, (typeof DIARIES)[number]>;

export function diaryStyle(color: string) {
  return {
    nameColor: mix(color, "#ffffff", 0.42),
    hexFrom: mix(color, "#ffffff", 0.32),
    hexTo: mix(color, "#0a0520", 0.18),
    hexGlow: `drop-shadow(0 6px 13px ${rgba(color, 0.5)}) drop-shadow(0 0 9px ${rgba(color, 0.55)})`,
    chipBg: rgba(color, 0.16),
    bord: rgba(color, 0.32),
    bordStrong: rgba(color, 0.5),
    cardBg: `linear-gradient(158deg, ${rgba(color, 0.16)}, rgba(255,255,255,0.02))`,
    rowGlow: `radial-gradient(circle at 90% 50%, ${rgba(color, 0.17)}, transparent 62%)`,
    topGlow: `radial-gradient(ellipse 70% 100% at 50% 0%, ${rgba(color, 0.16)}, transparent 70%)`,
  };
}
