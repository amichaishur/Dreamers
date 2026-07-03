"use client";

import { useEffect, useState } from "react";

type Star = {
  left: string;
  top: string;
  size: string;
  o: number;
  dur: string;
  delay: string;
  glow: string;
};

export default function StarField({ count, color }: { count: number; color: string }) {
  const [stars, setStars] = useState<Star[]>([]);

  useEffect(() => {
    const arr: Star[] = [];
    for (let i = 0; i < count; i++) {
      const sz = Math.random() * 1.7 + 0.9;
      arr.push({
        left: (Math.random() * 100).toFixed(2) + "%",
        top: (Math.random() * 100).toFixed(2) + "%",
        size: sz.toFixed(1) + "px",
        o: +(Math.random() * 0.55 + 0.35).toFixed(2),
        dur: (Math.random() * 3 + 2.5).toFixed(2) + "s",
        delay: (Math.random() * 4).toFixed(2) + "s",
        glow: (sz * 1.9).toFixed(1) + "px",
      });
    }
    setStars(arr);
  }, [count]);

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {stars.map((s, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            borderRadius: "50%",
            background: "#fff",
            opacity: s.o,
            boxShadow: `0 0 ${s.glow} ${color}`,
            animation: `twinkle ${s.dur} ease-in-out infinite`,
            animationDelay: s.delay,
            ["--o" as string]: s.o,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
