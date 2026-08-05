"use client";

import { useEffect, useMemo, useRef } from "react";
import { DiaryType } from "@/lib/theme";
import { rgba, mix } from "@/lib/color";
import { WeaveEdge, WeaveItem, layoutGraph } from "@/lib/weave";

type Props = {
  dots: Record<DiaryType, string>;
  lineColor: string;
  items: WeaveItem[];
  edges: WeaveEdge[];
  dimOthers?: boolean;        // "my consciousness": others fade back
  showLabels?: boolean;       // draw titles (only ever for the viewer's own memories)
  selected?: number | null;
  onSelect?: (i: number | null) => void;
  /** Signed counter from external +/- buttons: increment to zoom in, decrement to zoom out. */
  zoomRequest?: number;
};

/**
 * The weave as a map you can move through: same glowing memories as always,
 * laid out by how they relate to each other instead of on a sphere, with
 * pinch/wheel zoom and drag to pan.
 *
 * The dot rendering below is intentionally identical to WeaveSphere so the
 * memories look exactly like they always have.
 */
export default function WeaveGraph({
  dots, lineColor, items, edges, dimOthers = false, showLabels = false, selected = null, onSelect, zoomRequest = 0,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  // View transform lives in a ref so panning never re-renders React.
  const view = useRef({ z: 1, ox: 0, oy: 0 });
  const selRef = useRef<number | null>(selected);
  selRef.current = selected;

  // Journal type doubles as the lobe for memories that have no links of their own,
  // so the map still forms clusters instead of one even field.
  const groups = useMemo(() => {
    const order: string[] = [];
    return items.map((it) => {
      let k = order.indexOf(it.type);
      if (k < 0) { k = order.length; order.push(it.type); }
      return k;
    });
  }, [items]);
  const pts = useMemo(() => layoutGraph(items.length, edges, groups), [items.length, edges, groups]);
  const degree = useMemo(() => {
    const d = new Array(items.length).fill(0);
    edges.forEach((e) => { d[e.a]++; d[e.b]++; });
    return d;
  }, [items.length, edges]);

  /**
   * The web itself. Rule-based links carry meaning, but a memory whose text we
   * never receive (everyone else's, in the collective view) would otherwise float
   * alone and the map would read as scattered dots. So every memory is also tied
   * to its nearest neighbours with faint threads: structure you can see, drawn
   * quieter than the links that actually mean something.
   */
  const mesh = useMemo(() => {
    const out: [number, number][] = [];
    if (pts.length < 3) return out;
    const seen = new Set<string>();
    const linked = new Set(edges.map((e) => `${Math.min(e.a, e.b)}-${Math.max(e.a, e.b)}`));
    for (let i = 0; i < pts.length; i++) {
      const near: [number, number][] = [];
      for (let j = 0; j < pts.length; j++) {
        if (i === j) continue;
        const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
        near.push([dx * dx + dy * dy, j]);
      }
      near.sort((a, b) => a[0] - b[0]);
      for (let k = 0; k < Math.min(3, near.length); k++) {
        const j = near[k][1];
        const key = `${Math.min(i, j)}-${Math.max(i, j)}`;
        if (seen.has(key) || linked.has(key)) continue;
        seen.add(key);
        out.push([i, j]);
      }
    }
    return out;
  }, [pts, edges]);

  // Tapping lights up whatever a memory touches, meaningful link or plain thread.
  const neighbours = useMemo(() => {
    const m = new Map<number, Set<number>>();
    const add = (a: number, b: number) => {
      if (!m.has(a)) m.set(a, new Set());
      if (!m.has(b)) m.set(b, new Set());
      m.get(a)!.add(b);
      m.get(b)!.add(a);
    };
    edges.forEach((e) => add(e.a, e.b));
    mesh.forEach(([a, b]) => add(a, b));
    return m;
  }, [edges, mesh]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !pts.length) return;
    const maxDeg = Math.max(1, ...degree);
    let raf = 0;
    let stopped = false;

    const draw = (time: number) => {
      if (stopped) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      // Cap at 3x so memories stay crisp when zoomed right in.
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) { raf = requestAnimationFrame(draw); return; }
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const { z, ox, oy } = view.current;
      const cx = w / 2, cy = h / 2;
      const sel = selRef.current;
      const proj = pts.map((p, i) => ({
        sx: cx + (p.x + ox) * z,
        sy: cy + (p.y + oy) * z,
        color: dots[items[i].type] || "#9aa",
        // Only your own memories carry light. Everyone else's are present as
        // quiet points, so the collective weave reads as your thread running
        // through it rather than a wall of equal glow.
        bri: items[i].mine ? 1 : dimOthers ? 0.12 : 0.2,
        seed: ((i * 37) % 100) / 15,
        // Well-connected memories read as brighter and larger: a recurring theme
        // literally grows into a bigger star.
        weight: 0.72 + 0.62 * (degree[i] / maxDeg),
      }));

      // The quiet web first, then the links that mean something, then the glow.
      ctx.globalCompositeOperation = "source-over";
      ctx.lineWidth = Math.max(0.4, 0.7 * Math.min(z, 2));
      for (const [a, b] of mesh) {
        const A = proj[a], B = proj[b];
        const near = sel !== null && (a === sel || b === sel);
        const eb = (A.bri + B.bri) / 2;
        ctx.strokeStyle = rgba(lineColor, near ? 0.5 : (0.05 + 0.09 * eb) * (sel === null ? 1 : 0.45));
        ctx.beginPath(); ctx.moveTo(A.sx, A.sy); ctx.lineTo(B.sx, B.sy); ctx.stroke();
      }
      for (const e of edges) {
        const A = proj[e.a], B = proj[e.b];
        const eb = (A.bri + B.bri) / 2;
        const hot = sel !== null && (e.a === sel || e.b === sel);
        const base = hot ? 0.62 : (0.035 + Math.min(0.075, e.strength * 0.02)) * eb;
        ctx.strokeStyle = hot ? rgba("#E2D6FF", base) : rgba(lineColor, base);
        ctx.lineWidth = Math.max(0.4, (hot ? 1.5 : 0.7) * Math.min(z, 2));
        ctx.beginPath(); ctx.moveTo(A.sx, A.sy); ctx.lineTo(B.sx, B.sy); ctx.stroke();
      }

      // Memories, drawn additively so neighbouring glows melt together.
      const order = proj.map((_, i) => i).sort((a, b) => proj[a].weight - proj[b].weight);
      ctx.globalCompositeOperation = "lighter";
      for (const i of order) {
        const p = proj[i];
        // Tapping a memory lights it up, whoever it belongs to, along with
        // whatever it is linked to.
        const lit = sel !== null && (i === sel || neighbours.get(sel)?.has(i));
        const faded = sel !== null && !lit;
        const bri = lit ? 1 : p.bri * (faded ? 0.34 : 1);
        // Flat map, so every memory sits at the sphere's bright front face.
        const dep = 0.94;
        const shim = 0.88 + 0.12 * Math.sin(time * 0.0017 + p.seed);
        // Size stays put; only the light changes, so quiet memories still hold
        // their place in the shape.
        const size = (4 + dep * dep * 11) * (0.95 + 0.05 * shim) * z * p.weight * (0.66 + 0.34 * bri);
        const a = Math.min(1, (0.13 + dep * dep * 0.92) * shim * bri);
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
        const tr = size * 0.16;
        ctx.fillStyle = rgba("#ffffff", Math.min(0.95, (dep - 0.3) * 1.0) * shim * bri);
        ctx.beginPath(); ctx.arc(p.sx, p.sy, Math.max(0.4, tr), 0, Math.PI * 2); ctx.fill();
      }

      // Titles last, in normal blending so they stay legible over the glow.
      ctx.globalCompositeOperation = "source-over";
      if (showLabels || sel !== null) {
        for (const i of order) {
          const p = proj[i], it = items[i];
          if (!it.mine) continue;                       // never label someone else's memory
          const isSel = sel === i;
          const show = isSel || (showLabels && (z > 1.15 || degree[i] >= Math.max(3, maxDeg * 0.6)));
          if (!show || p.bri < 0.5) continue;
          const size = (4 + 0.94 * 0.94 * 11) * z * p.weight;
          const fs = Math.min(14, 10.5 * Math.max(1, z * 0.85));
          ctx.font = `600 ${fs}px Heebo, system-ui, sans-serif`;
          ctx.textAlign = "center";
          const tw = ctx.measureText(it.title).width;
          ctx.fillStyle = "rgba(8,6,20,0.72)";
          ctx.fillRect(p.sx - tw / 2 - 6, p.sy - size * 0.55 - fs - 9, tw + 12, fs + 5);
          ctx.fillStyle = "rgba(236,231,250,0.96)";
          ctx.fillText(it.title, p.sx, p.sy - size * 0.55 - 11);
        }
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => { stopped = true; cancelAnimationFrame(raf); };
  }, [dots, lineColor, items, edges, pts, mesh, degree, neighbours, dimOthers, showLabels]);

  // ---- Pan, zoom, tap ----
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const active = new Map<number, { x: number; y: number }>();
    let last: { x: number; y: number } | null = null;
    let pinch = 0, zAtPinch = 1, travelled = 0;

    const clampZ = (v: number) => Math.max(0.5, Math.min(4, v));

    const down = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId);
      active.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
      last = { x: e.offsetX, y: e.offsetY };
      travelled = 0;
      if (active.size === 2) {
        const [a, b] = [...active.values()];
        pinch = Math.hypot(a.x - b.x, a.y - b.y);
        zAtPinch = view.current.z;
      }
    };
    const move = (e: PointerEvent) => {
      if (!active.has(e.pointerId)) return;
      active.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
      if (active.size === 2) {
        const [a, b] = [...active.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch > 0) view.current.z = clampZ((zAtPinch * d) / pinch);
        return;
      }
      if (!last) return;
      const dx = e.offsetX - last.x, dy = e.offsetY - last.y;
      travelled += Math.abs(dx) + Math.abs(dy);
      last = { x: e.offsetX, y: e.offsetY };
      view.current.ox += dx / view.current.z;
      view.current.oy += dy / view.current.z;
    };
    const up = (e: PointerEvent) => {
      active.delete(e.pointerId);
      pinch = 0;
      if (travelled < 6 && onSelect) {
        const { z, ox, oy } = view.current;
        const cx = canvas.clientWidth / 2, cy = canvas.clientHeight / 2;
        let best: number | null = null, bd = 26;
        pts.forEach((p, i) => {
          if (dimOthers && !items[i].mine) return;
          const d = Math.hypot(cx + (p.x + ox) * z - e.offsetX, cy + (p.y + oy) * z - e.offsetY);
          if (d < bd) { bd = d; best = i; }
        });
        onSelect(best);
      }
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      view.current.z = clampZ(view.current.z * (e.deltaY < 0 ? 1.12 : 0.89));
    };

    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("wheel", wheel, { passive: false });
    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("wheel", wheel);
    };
  }, [pts, items, dimOthers, onSelect]);

  // External +/- buttons.
  const lastZoomReq = useRef(zoomRequest);
  useEffect(() => {
    const delta = zoomRequest - lastZoomReq.current;
    lastZoomReq.current = zoomRequest;
    if (!delta) return;
    const factor = delta > 0 ? 1.3 : 1 / 1.3;
    view.current.z = Math.max(0.5, Math.min(4, view.current.z * Math.pow(factor, Math.abs(delta))));
  }, [zoomRequest]);

  return (
    <canvas
      ref={ref}
      style={{ position: "relative", width: "100%", height: "100%", display: "block", touchAction: "none", cursor: "grab" }}
    />
  );
}
