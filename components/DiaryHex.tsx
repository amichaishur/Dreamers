import { diaryStyle } from "@/lib/diary";

export default function DiaryHex({ color, w = 39, h = 41 }: { color: string; w?: number; h?: number }) {
  const s = diaryStyle(color);
  const id = "hx" + color.replace("#", "");
  return (
    <div style={{ position: "relative", width: w, height: h, flex: "0 0 auto", filter: s.hexGlow }}>
      <svg width={w} height={h} viewBox="0 0 56 60" style={{ display: "block" }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={s.hexFrom} />
            <stop offset="1" stopColor={s.hexTo} />
          </linearGradient>
        </defs>
        <polygon points="28,8 47,19 47,41 28,52 9,41 9,19" fill={`url(#${id})`} stroke={`url(#${id})`} strokeWidth="13" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
