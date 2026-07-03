"use client";

import WeaveSphere from "@/components/WeaveSphere";
import { theme } from "@/lib/theme";
import { rgba, mix } from "@/lib/color";

/**
 * WeaveJoin — variant B from the Claude Design export.
 * A hexagon spirals inward and blooms into a dot of the same color,
 * merging into the weave sphere. Used on the entry-reveal screen.
 */
export default function WeaveJoin({ color, dur = 4.4, size = 240 }: { color: string; dur?: number; size?: number }) {
  const p = theme;
  const hexLite = mix(color, "#ffffff", 0.55);
  const hexDeep = mix(color, "#000000", 0.32);
  const ring = rgba(color, 0.42);
  const glow70 = rgba(color, 0.7);
  const glow40 = rgba(color, 0.4);
  const glow34 = rgba(color, 0.34);
  const d = `${dur}s`;
  const sphere = Math.round(size * 0.958);

  return (
    <div style={{ position: "relative", width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* ambient glow */}
      <div style={{ position: "absolute", width: sphere, height: sphere, borderRadius: "50%", background: `radial-gradient(circle, ${glow34}, transparent 66%)`, animation: `wjGlow 3.6s ease-in-out infinite` }} />

      {/* sphere */}
      <div style={{ position: "relative", width: sphere, height: sphere }}>
        <WeaveSphere dots={p.dots} lineColor={p.lineColor} count={54} />
      </div>

      {/* B: spiral hexagon */}
      <div style={{ position: "absolute", left: "50%", top: "50%", width: 0, height: 0, animation: `wjSpiral ${d} cubic-bezier(.3,.1,.4,1) infinite` }}>
        <div style={{ position: "absolute", left: 95, top: -16, filter: `drop-shadow(0 0 9px ${glow70}) drop-shadow(0 0 18px ${glow40})` }}>
          <div style={{ width: 28, height: 31, clipPath: "polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)", background: `linear-gradient(150deg, ${hexLite}, ${color} 55%, ${hexDeep})` }} />
        </div>
      </div>

      {/* merges into a dot of the same color */}
      <div style={{ position: "absolute", width: 60, height: 60, borderRadius: "50%", border: `1.5px solid ${ring}`, animation: `wjBloomRing ${d} ease-out infinite` }} />
      <div style={{ position: "absolute", width: 17, height: 17, borderRadius: "50%", background: `radial-gradient(circle at 38% 32%, #fff, ${hexLite} 50%, ${color} 100%)`, boxShadow: `0 0 14px ${glow70}, 0 0 26px ${glow40}`, animation: `wjBloom ${d} cubic-bezier(.2,.8,.2,1) infinite` }} />
    </div>
  );
}
