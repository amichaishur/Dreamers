"use client";

import { useEffect, useRef } from "react";
import { DiaryType } from "@/lib/theme";
import { rgba, mix } from "@/lib/color";

export type SphereNode = { type: DiaryType; mine: boolean };

type Props = {
  dots: Record<DiaryType, string>;
  lineColor: string;
  count?: number;
  dotScale?: number;
  frozen?: boolean;
  nodes?: SphereNode[];      // real entries; when present drives count + colors
  dimOthers?: boolean;       // "my consciousness" mode: dim non-mine dots
};

// Spread mine dots evenly around the sphere so they don't clump at one pole.
function arrange(nodes: SphereNode[]): SphereNode[] {
  const N = nodes.length;
  const mine: SphereNode[] = [];
  const other: SphereNode[] = [];
  nodes.forEach((n) => (n.mine ? mine : other).push(n));
  const out = new Array<SphereNode | undefined>(N);
  const taken = new Set<number>();
  const m = mine.length;
  mine.forEach((n, k) => {
    let slot = Math.round((k + 0.5) * (N / Math.max(1, m))) % N;
    while (taken.has(slot)) slot = (slot + 1) % N;
    taken.add(slot);
    out[slot] = n;
  });
  let oi = 0;
  for (let s = 0; s < N; s++) if (!out[s]) out[s] = other[oi++];
  return out as SphereNode[];
}

function geometry(N: number) {
  const golden = Math.PI * (3 - Math.sqrt(5));
  const pos: { x: number; y: number; z: number }[] = [];
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const t = golden * i;
    pos.push({ x: Math.cos(t) * r, y, z: Math.sin(t) * r });
  }
  const seen = new Set<string>();
  const edges: [number, number][] = [];
  for (let i = 0; i < N; i++) {
    const d: [number, number][] = [];
    for (let j = 0; j < N; j++) {
      if (i === j) continue;
      const a = pos[i], b = pos[j];
      d.push([(a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2, j]);
    }
    d.sort((p, q) => p[0] - q[0]);
    for (let k = 0; k < 2; k++) {
      const j = d[k][1], lo = Math.min(i, j), hi = Math.max(i, j), key = lo + "-" + hi;
      if (!seen.has(key)) { seen.add(key); edges.push([lo, hi]); }
    }
  }
  return { pos, edges };
}

export default function WeaveSphere({ dots, lineColor, count = 56, dotScale = 1, frozen = false, nodes, dimOthers = false }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const nodeKey = nodes ? nodes.map((n) => (n.mine ? "1" : "0") + n.type[0]).join("") : "";

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const forceStatic =
      typeof window !== "undefined" && new URLSearchParams(window.location.search).has("shot");
    const isFrozen = frozen || forceStatic;
    const types: DiaryType[] = ["creation", "dream", "idea", "reality"];
    const arranged = nodes && nodes.length ? arrange(nodes) : null;
    const N = arranged ? arranged.length : count;
    const colorArr = arranged ? arranged.map((n) => dots[n.type] || "#9aa") : null;
    const briArr = arranged ? arranged.map((n) => (dimOthers && !n.mine ? 0.22 : 1)) : null;
    const geo = geometry(N);
    let raf = 0;
    let stopped = false;

    const draw = (time: number) => {
      if (stopped) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) { raf = requestAnimationFrame(draw); return; }
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const { pos, edges } = geo;
      const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.4;
      const rotY = time * 0.00015, tilt = 0.45;
      const cosY = Math.cos(rotY), sinY = Math.sin(rotY), cosT = Math.cos(tilt), sinT = Math.sin(tilt);

      const proj = pos.map((p, i) => {
        const x1 = p.x * cosY - p.z * sinY, z1 = p.x * sinY + p.z * cosY, y1 = p.y;
        const y2 = y1 * cosT - z1 * sinT, z2 = y1 * sinT + z1 * cosT;
        const color = colorArr ? colorArr[i] : dots[types[i % 4]] || "#9aa";
        const bri = briArr ? briArr[i] : 1;
        return { sx: cx + x1 * R, sy: cy + y2 * R, depth: (z2 + 1) / 2, color, bri, seed: ((i * 37) % 100) / 15 };
      });

      ctx.globalCompositeOperation = "source-over";
      ctx.lineWidth = 1;
      for (const [a, b] of edges) {
        const A = proj[a], B = proj[b], dep = (A.depth + B.depth) / 2;
        const eb = (A.bri + B.bri) / 2;
        // Faint mesh: a subtle background weave texture that never spotlights specific
        // dots. Depth gives gentle variation; brightness barely nudges it so "my" dots
        // aren't visibly wired together into a constellation.
        ctx.strokeStyle = rgba(lineColor, (0.008 + dep * 0.026) * (0.5 + 0.5 * eb));
        ctx.beginPath(); ctx.moveTo(A.sx, A.sy); ctx.lineTo(B.sx, B.sy); ctx.stroke();
      }

      const order = proj.map((_, i) => i).sort((a, b) => proj[a].depth - proj[b].depth);
      ctx.globalCompositeOperation = "lighter";
      for (const i of order) {
        const p = proj[i], dep = p.depth;
        const shim = 0.88 + 0.12 * Math.sin(time * 0.0017 + p.seed);
        const size = (4 + dep * dep * 11) * (0.95 + 0.05 * shim) * dotScale * (0.6 + 0.4 * p.bri);
        const a = Math.min(1, (0.13 + dep * dep * 0.92) * shim * p.bri);
        const pastel = mix(p.color, "#ffffff", 0.28);
        const g = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, Math.max(0.5, size));
        g.addColorStop(0, rgba(pastel, a));
        g.addColorStop(0.3, rgba(pastel, a * 0.72));
        g.addColorStop(0.58, rgba(p.color, a * 0.3));
        g.addColorStop(1, rgba(p.color, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.sx, p.sy, Math.max(0.5, size), 0, Math.PI * 2); ctx.fill();
        const core = mix(p.color, "#ffffff", 0.62);
        const cr = size * 0.42;
        const cg = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, Math.max(0.5, cr));
        cg.addColorStop(0, rgba(core, Math.min(1, a * 1.45)));
        cg.addColorStop(0.55, rgba(core, a * 0.5));
        cg.addColorStop(1, rgba(core, 0));
        ctx.fillStyle = cg;
        ctx.beginPath(); ctx.arc(p.sx, p.sy, Math.max(0.5, cr), 0, Math.PI * 2); ctx.fill();
        if (dep > 0.4) {
          const tr = size * 0.16;
          ctx.fillStyle = rgba("#ffffff", Math.min(0.95, (dep - 0.3) * 1.0) * shim * p.bri);
          ctx.beginPath(); ctx.arc(p.sx, p.sy, Math.max(0.4, tr), 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.globalCompositeOperation = "source-over";
      if (!isFrozen) raf = requestAnimationFrame(draw);
    };

    if (isFrozen) {
      const t = setTimeout(() => draw(9000), 60);
      return () => { stopped = true; clearTimeout(t); };
    }
    raf = requestAnimationFrame(draw);
    return () => { stopped = true; cancelAnimationFrame(raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dots, lineColor, count, dotScale, frozen, nodeKey, dimOthers]);

  return <canvas ref={ref} style={{ position: "relative", width: "100%", height: "100%", display: "block" }} />;
}
