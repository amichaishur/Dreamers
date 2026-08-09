"use client";

import { useEffect, useMemo, useRef } from "react";
import { DiaryType } from "@/lib/theme";
import { WeaveEdge, WeaveItem } from "@/lib/weave";

type Props = {
  dots: Record<DiaryType, string>;
  items: WeaveItem[];
  edges: WeaveEdge[];
  dimOthers?: boolean;
  selected?: number | null;
  onSelect?: (i: number | null) => void;
  zoomRequest?: number;
};

/**
 * The living knowledge graph, built to the Claude Design handoff.
 *
 * Memories are sampled into two ellipsoid lobes split by a central fissure, so
 * the mass reads as a brain rather than a ball. The whole thing turns slowly,
 * each memory drifts on its own three frequencies, and selecting one pulls it to
 * the front while its neighbours gather and everything else is pushed out.
 *
 * Everything below runs on plain mutable objects and draws straight to canvas.
 * Nothing here belongs in React state: at 30fps it would tear the app apart.
 */

const FOCAL = 3.1;
const SEED = 20260806;

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * One definition of how big a memory draws, so labels and taps never drift off it.
 * Deliberately modest, and falling away faster with depth, so the near face reads
 * clearly instead of the whole field crowding forward.
 */
function radiusOf(w: number, s: number, near: number) {
  return (1.9 + w * 6.5) * s * (0.48 + near * 0.68);
}

/** Two lobes with a hollow midline. A ball would read as a planet, not a mind. */
function inLobe(x: number, y: number, z: number) {
  const fold = Math.abs(x) - 0.13;
  const a = ((fold > 0 ? fold : 0) / 0.9) ** 2 + (y / 0.72) ** 2 + (z / 0.82) ** 2;
  return a <= 1 && Math.abs(x) > 0.05;
}

type Node = {
  i: number;
  color: string;
  mine: boolean;
  label: string;
  w: number;              // importance 0..1, grows with how connected it is
  hx: number; hy: number; hz: number;   // home
  x: number; y: number; z: number;      // current
  tx: number; ty: number; tz: number;   // target
  ph: number; sp: number;
  dim: number; tdim: number;
  glow: number;
};

export default function WeaveKnowledge({
  dots, items, edges, dimOthers = false, selected = null, onSelect, zoomRequest = 0,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  // Opens close enough to read the structure. The weave runs past the edges at
  // this distance, which is what dragging is for.
  const zoom = useRef(1.5);
  // How far the weave has been dragged from centre, in screen pixels.
  const pan = useRef({ x: 0, y: 0 });
  // True only while a finger is actually moving the weave, which is when the
  // frame limiter steps aside so the drag tracks the finger.
  const dragging = useRef(false);
  const selRef = useRef<number | null>(selected);
  selRef.current = selected;
  const hoverRef = useRef<number | null>(null);

  const adjacency = useMemo(() => {
    const m = new Map<number, Set<number>>();
    edges.forEach((e) => {
      if (!m.has(e.a)) m.set(e.a, new Set());
      if (!m.has(e.b)) m.set(e.b, new Set());
      m.get(e.a)!.add(e.b);
      m.get(e.b)!.add(e.a);
    });
    return m;
  }, [edges]);

  const nodes = useMemo<Node[]>(() => {
    const rand = lcg(SEED);
    return items.map((it, i) => {
      // Rejection-sample into the lobes.
      let x = 0, y = 0, z = 0;
      for (let tries = 0; tries < 220; tries++) {
        const u = 0.28 + rand() * 0.72;
        const th = rand() * Math.PI * 2;
        const ph = Math.acos(2 * rand() - 1);
        const cx = Math.sin(ph) * Math.cos(th) * 1.02 * u;
        const cy = Math.cos(ph) * 0.74 * u;
        const cz = Math.sin(ph) * Math.sin(th) * 0.86 * u;
        if (inLobe(cx, cy, cz)) { x = cx; y = cy; z = cz; break; }
        x = cx; y = cy; z = cz;
      }
      const deg = adjacency.get(i)?.size ?? 0;
      return {
        i, color: dots[it.type] || "#9aa", mine: it.mine, label: it.title,
        // Importance is emergent: the more a memory connects, the larger it burns.
        w: Math.min(1, 0.2 + deg * 0.045 + (it.mine ? 0.16 : 0)),
        hx: x, hy: y, hz: z, x, y, z, tx: x, ty: y, tz: z,
        ph: rand() * Math.PI * 2, sp: 0.5 + rand() * 0.7,
        dim: 1, tdim: 1, glow: 0,
      };
    });
  }, [items, dots, adjacency]);

  // Selecting a memory reorganises the whole network around it.
  useEffect(() => {
    const sel = selected;
    if (sel === null || !nodes[sel]) {
      nodes.forEach((n) => { n.tx = n.hx; n.ty = n.hy; n.tz = n.hz; n.tdim = 1; });
      return;
    }
    const hop = new Map<number, number>([[sel, 0]]);
    let frontier = [sel];
    for (let d = 1; d <= 2 && frontier.length; d++) {
      const nextF: number[] = [];
      frontier.forEach((v) => (adjacency.get(v) ?? new Set()).forEach((w) => {
        if (!hop.has(w)) { hop.set(w, d); nextF.push(w); }
      }));
      frontier = nextF;
    }
    nodes.forEach((n) => {
      const d = hop.get(n.i);
      if (d === 0) { n.tx = 0; n.ty = 0; n.tz = 0.62; n.tdim = 1; return; }
      const len = Math.hypot(n.hx, n.hy, n.hz) || 1;
      const r = d === 1 ? 0.52 : d === 2 ? 0.88 : 1.28;
      n.tx = (n.hx / len) * r;
      n.ty = (n.hy / len) * r * 0.8;   // keep the mass wide rather than tall
      n.tz = (n.hz / len) * r;
      n.tdim = d === 1 ? 1 : d === 2 ? 0.6 : 0.16;
    });
  }, [selected, nodes, adjacency]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !nodes.length) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    let raf = 0, stopped = false, last = 0;
    const start = performance.now();

    const frame = (now: number) => {
      if (stopped) return;
      raf = requestAnimationFrame(frame);
      // ~30fps is plenty when it is drifting on its own, but a drag has to keep
      // up with the finger or it reads as broken.
      if (!dragging.current && now - last < 33) return;
      last = now;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      // Phones report 3x and up; honouring it is what keeps the small dots from
      // going soft once you have zoomed in on them.
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const W = canvas.clientWidth, H = canvas.clientHeight;
      if (!W || !H) return;
      if (canvas.width !== Math.round(W * dpr)) {
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      const t = reduce ? 0 : (now - start) / 1000;
      const sel = selRef.current, hov = hoverRef.current;
      const focus = hov ?? sel;
      const lit = new Set<number>();
      if (focus !== null) {
        lit.add(focus);
        (adjacency.get(focus) ?? new Set()).forEach((w) => lit.add(w));
      }

      const cx = W / 2 + pan.current.x, cy = H / 2 + pan.current.y;
      const R = Math.min(W, H) * 0.44 * zoom.current;
      const yaw = t * 0.075;
      const tilt = 0.30 + Math.sin(t * 0.06) * 0.05;
      const cyaw = Math.cos(yaw), syaw = Math.sin(yaw);
      const ctil = Math.cos(tilt), stil = Math.sin(tilt);

      type P = { n: Node; sx: number; sy: number; rz: number; near: number; s: number };
      const proj: P[] = [];
      for (const n of nodes) {
        // Ease toward target; nothing ever jumps.
        n.x += (n.tx - n.x) * 0.055;
        n.y += (n.ty - n.y) * 0.055;
        n.z += (n.tz - n.z) * 0.055;
        n.dim += (n.tdim - n.dim) * 0.06;
        n.glow += ((lit.has(n.i) ? 1 : 0) - n.glow) * 0.16;

        // Drift is an offset at draw time, never accumulated: three frequencies
        // per axis is what stops the whole field pulsing in unison.
        const d = reduce ? 0 : 0.035 * n.sp;
        const px = n.x + Math.sin(t * 0.29 * n.sp + n.ph) * d;
        const py = n.y + Math.cos(t * 0.24 * n.sp + n.ph * 1.7) * d;
        const pz = n.z + Math.sin(t * 0.21 * n.sp + n.ph * 2.3) * d;

        const x1 = px * cyaw - pz * syaw, z1 = px * syaw + pz * cyaw;
        const y2 = py * ctil - z1 * stil, z2 = py * stil + z1 * ctil;
        const s = FOCAL / (FOCAL + z2);
        proj.push({
          n, sx: cx + x1 * s * R, sy: cy + y2 * s * R, rz: z2,
          near: Math.max(0, Math.min(1, (z2 + 1.1) / 2.2)), s,
        });
      }
      const byId = new Map(proj.map((p) => [p.n.i, p]));

      // Edges first, unsorted: layering them all under the nodes is what gives
      // the network its haze.
      ctx.lineCap = "round";
      for (const e of edges) {
        const A = byId.get(e.a), B = byId.get(e.b);
        if (!A || !B) continue;
        const dimA = A.n.dim, dimB = B.n.dim;
        if (Math.min(dimA, dimB) < 0.03) continue;
        const nearAvg = (A.near + B.near) / 2;
        const on = lit.has(e.a) && lit.has(e.b);
        const a = on ? 0.55 + nearAvg * 0.35 : (0.045 + nearAvg * 0.11) * Math.min(dimA, dimB);
        ctx.strokeStyle = on ? `rgba(224,214,255,${a})` : `rgba(158,164,232,${a})`;
        ctx.lineWidth = on ? 1.5 : 0.4 + nearAvg * 0.7;
        ctx.beginPath(); ctx.moveTo(A.sx, A.sy); ctx.lineTo(B.sx, B.sy); ctx.stroke();
      }

      // Nodes far to near, so the ones closest to you sit on top.
      proj.sort((a, b) => a.rz - b.rz);
      for (const p of proj) {
        const n = p.n;
        // Only your own memories carry light; everyone else's stay quiet points.
        const own = n.mine ? 1 : dimOthers ? 0.16 : 0.26;
        const vis = n.dim * Math.max(own, n.glow);
        if (vis < 0.02) continue;
        const glowK = 1 + n.glow * 0.7;
        const r = radiusOf(n.w, p.s, p.near) * (1 + n.glow * 0.5);
        const a = Math.min(1, vis * (0.30 + p.near * 0.62) * (focus === null ? 1 : lit.has(n.i) ? 1 : 0.62));
        const c = n.color;

        // Far nodes get a wider, softer halo: haze without the cost of a blur.
        const hr = r * (5.4 - p.near * 2.1) * (1 + n.glow * 0.7);
        const ha = Math.min(0.62, a * (0.30 + n.w * 0.30 + n.glow * 0.45) * glowK);
        const halo = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, Math.max(0.5, hr));
        halo.addColorStop(0, hex(c, ha));
        halo.addColorStop(0.45, hex(c, ha * 0.28));
        halo.addColorStop(1, hex(c, 0));
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(p.sx, p.sy, Math.max(0.5, hr), 0, Math.PI * 2); ctx.fill();

        const white = 0.35 + p.near * 0.4;
        const core = ctx.createRadialGradient(p.sx - r * 0.28, p.sy - r * 0.32, 0, p.sx, p.sy, Math.max(0.5, r));
        core.addColorStop(0, `rgba(255,255,255,${Math.min(0.95, a * white * 1.5)})`);
        core.addColorStop(0.5, hex(c, a));
        core.addColorStop(1, hex(shade(c, 0.6), a * 0.55));
        ctx.fillStyle = core;
        ctx.beginPath(); ctx.arc(p.sx, p.sy, Math.max(0.5, r), 0, Math.PI * 2); ctx.fill();
      }

      // Labels last, only where they earn their place, and never for other people.
      ctx.textAlign = "center";
      ctx.shadowColor = "rgba(8,6,22,0.95)";
      ctx.shadowBlur = 9;
      // Names appear only where the finger is. Left on, they turn the weave into
      // a list; asked for, they answer.
      if (focus !== null) {
        for (const p of proj) {
          const n = p.n;
          if (!n.mine || !n.label || !lit.has(n.i)) continue;
          const isFocus = focus === n.i;
          const fs = (isFocus ? 17 : 12.5) * (0.86 + p.near * 0.3);
          ctx.font = `${isFocus ? 700 : 400} ${fs}px Heebo, system-ui, sans-serif`;
          ctx.direction = "rtl";
          ctx.fillStyle = isFocus ? "rgba(255,255,255,0.98)" : "rgba(255,255,255,0.72)";
          ctx.fillText(n.label, p.sx, p.sy + radiusOf(n.w, p.s, p.near) + fs * 0.92);
        }
      }
      ctx.shadowBlur = 0;

      hit.current = proj;
    };

    raf = requestAnimationFrame(frame);
    return () => { stopped = true; cancelAnimationFrame(raf); };
  }, [nodes, edges, adjacency, dimOthers]);

  const hit = useRef<{ n: Node; sx: number; sy: number; rz: number; near: number; s: number }[]>([]);

  // Pointer: hover to light a memory and its links, tap to reorganise around it.
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const pick = (mx: number, my: number) => {
      let best: number | null = null, bd = 26;
      for (const p of hit.current) {
        if (p.n.dim < 0.2) continue;
        const r = radiusOf(p.n.w, p.s, p.near);
        const d = Math.hypot(p.sx - mx, p.sy - my);
        if (d < Math.max(12, r * 2.4) && d < bd) { bd = d; best = p.n.i; }
      }
      return best;
    };
    // Zoom is pinch and wheel; one finger drags the weave around.
    const active = new Map<number, { x: number; y: number }>();
    let pinch = 0, zAtPinch = 1;
    // How far this press has travelled. Under the threshold it was a tap on a
    // memory; over it, the person was moving the weave and means no selection.
    let travelled = 0;
    const TAP_SLOP = 6;
    const clampZ = (v: number) => Math.max(0.55, Math.min(3, v));

    const down = (e: PointerEvent) => {
      active.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
      travelled = 0;
      if (active.size === 2) {
        const [a, b] = [...active.values()];
        pinch = Math.hypot(a.x - b.x, a.y - b.y);
        zAtPinch = zoom.current;
      } else {
        // Capture keeps the drag alive if the finger leaves the canvas. Not every
        // pointer can be captured, and failing to is not a reason to stop.
        try { canvas.setPointerCapture(e.pointerId); } catch { /* drag still works */ }
      }
    };
    const move = (e: PointerEvent) => {
      const prev = active.get(e.pointerId);
      if (prev) active.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
      if (active.size === 2) {
        const [a, b] = [...active.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch > 0) zoom.current = clampZ((zAtPinch * d) / pinch);
        return;
      }
      // A held finger moves the weave; a hovering mouse just lights things up.
      if (prev) {
        const dx = e.offsetX - prev.x, dy = e.offsetY - prev.y;
        travelled += Math.hypot(dx, dy);
        if (travelled > TAP_SLOP) {
          dragging.current = true;
          // Bounded, so the weave can never be flung somewhere you can't find it.
          const mx = canvas.clientWidth * 0.75, my = canvas.clientHeight * 0.75;
          pan.current = {
            x: Math.max(-mx, Math.min(mx, pan.current.x + dx)),
            y: Math.max(-my, Math.min(my, pan.current.y + dy)),
          };
          hoverRef.current = null;
          canvas.style.cursor = "grabbing";
        }
        return;
      }
      const id = pick(e.offsetX, e.offsetY);
      hoverRef.current = id;
      canvas.style.cursor = id === null ? "grab" : "pointer";
    };
    const leave = () => { hoverRef.current = null; };
    const up = (e: PointerEvent) => {
      const wasPinching = active.size === 2;
      const wasDragging = dragging.current;
      active.delete(e.pointerId);
      try { if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId); } catch { /* nothing held */ }
      pinch = 0;
      dragging.current = false;
      canvas.style.cursor = "grab";
      if (!wasPinching && !wasDragging) onSelect?.(pick(e.offsetX, e.offsetY));
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      zoom.current = clampZ(zoom.current * (e.deltaY < 0 ? 1.12 : 0.89));
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerleave", leave);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("wheel", wheel, { passive: false });
    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerleave", leave);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("wheel", wheel);
    };
  }, [onSelect]);

  const lastZoom = useRef(zoomRequest);
  useEffect(() => {
    const delta = zoomRequest - lastZoom.current;
    lastZoom.current = zoomRequest;
    if (!delta) return;
    const step = delta > 0 ? 1.3 : 1 / 1.3;
    zoom.current = Math.max(0.55, Math.min(3, zoom.current * Math.pow(step, Math.abs(delta))));
  }, [zoomRequest]);

  return <canvas ref={ref} style={{ position: "relative", width: "100%", height: "100%", display: "block", touchAction: "none", cursor: "grab" }} />;
}

function rgbOf(hexStr: string) {
  const n = parseInt(hexStr.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function hex(c: string, a: number) {
  const [r, g, b] = rgbOf(c);
  return `rgba(${r},${g},${b},${a})`;
}
function shade(c: string, k: number) {
  const [r, g, b] = rgbOf(c);
  const to2 = (v: number) => Math.round(v * k).toString(16).padStart(2, "0");
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}
