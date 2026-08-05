import { DiaryType } from "@/lib/theme";

/**
 * The "brain" behind the weave: which memories are related, and why.
 *
 * Everything here is deterministic and runs on-device. No AI, no API calls.
 * Four rules score each pair; a link only exists once the combined score passes
 * a threshold, so the lines mean something instead of decorating the screen.
 */

export type WeaveItem = {
  id: string;
  title: string;
  body: string;
  type: DiaryType;
  createdAt: string;
  lucidity: string | null;
  mine: boolean;
};

export type WeaveEdge = { a: number; b: number; strength: number; reasons: string[] };

const STOP = new Set([
  "של", "את", "על", "עם", "אני", "זה", "לא", "יש", "היה", "היו", "אבל", "כמו", "מה", "כל",
  "לי", "הוא", "היא", "אז", "גם", "רק", "עוד", "כי", "ואז", "הייתי", "בתוך", "שם", "אחרי",
  "לפני", "כאילו", "ממש", "מאוד", "אותי", "אותו", "אותה", "הזה", "הזאת", "היום", "אחד",
  "the", "and", "was", "with", "that", "this", "for", "from", "were", "had",
]);

/** Meaningful words only: 3+ chars, no stopwords, punctuation stripped. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

const DAY = 86400000;

/**
 * Rule weights. Shared rare words dominate on purpose: they are the only signal
 * that reflects what a memory is actually about. The rest are supporting hints,
 * each too weak on its own to draw a line.
 */
const W_WORDS = 2.6;
const W_SAME_NIGHT = 1.5;
const W_NEAR_DAYS = 0.9;
const W_SAME_TYPE = 0.5;
const W_LUCIDITY = 0.5;
const THRESHOLD = 1.4;

export function computeEdges(items: WeaveItem[]): WeaveEdge[] {
  const toks = items.map((it) => tokenize(`${it.title} ${it.body}`));

  // Document frequency, so a word shared by everyone counts for almost nothing
  // while a rare one (a person, a place) counts a lot. Classic TF-IDF intuition.
  const df = new Map<string, number>();
  toks.forEach((ws) => {
    new Set(ws).forEach((w) => df.set(w, (df.get(w) ?? 0) + 1));
  });

  const times = items.map((it) => new Date(it.createdAt).getTime());
  const luc = items.map((it) => (it.lucidity == null || it.lucidity === "" ? NaN : Number(it.lucidity)));
  const edges: WeaveEdge[] = [];

  for (let i = 0; i < items.length; i++) {
    const setI = new Set(toks[i]);
    // A memory with no text on this device (someone else's, in the collective view)
    // can never be related to anything: we deliberately never receive its content.
    // Without this guard the weak rules alone would link every anonymous entry to
    // every other one and collapse the whole map into a single blob.
    if (!toks[i].length) continue;
    for (let j = i + 1; j < items.length; j++) {
      if (!toks[j].length) continue;
      const reasons: string[] = [];
      let score = 0;

      // 1. Shared rare words
      const shared: string[] = [];
      for (const w of new Set(toks[j])) {
        if (setI.has(w) && (df.get(w) ?? 0) <= Math.max(2, Math.round(items.length * 0.25))) shared.push(w);
      }
      if (shared.length) {
        let s = 0;
        for (const w of shared) s += 1 / (df.get(w) ?? 1);
        score += s * W_WORDS;
        shared.sort((a, b) => (df.get(a) ?? 0) - (df.get(b) ?? 0));
        reasons.push(`מילים משותפות: ${shared.slice(0, 3).join(", ")}`);
      }

      // 2. Time proximity
      const days = Math.abs(times[i] - times[j]) / DAY;
      if (days < 1) {
        score += W_SAME_NIGHT;
        reasons.push("קרבה בזמן: אותו יום");
      } else if (days <= 2) {
        score += W_NEAR_DAYS;
        reasons.push(`קרבה בזמן: ${Math.round(days)} ימים`);
      }

      // 3. Same journal
      if (items[i].type === items[j].type) {
        score += W_SAME_TYPE;
        reasons.push("אותו יומן");
      }

      // 4. Similar lucidity, dreams only
      if (
        items[i].type === "dream" && items[j].type === "dream" &&
        !Number.isNaN(luc[i]) && !Number.isNaN(luc[j]) &&
        Math.abs(luc[i] - luc[j]) <= 1 && luc[i] >= 7
      ) {
        score += W_LUCIDITY;
        reasons.push(`צלילות דומה: ${luc[i]} ו ${luc[j]}`);
      }

      if (score >= THRESHOLD) edges.push({ a: i, b: j, strength: score, reasons });
    }
  }
  return edges;
}

export type Pt = { x: number; y: number };

/** Deterministic pseudo-random, so the map looks the same every time you open it. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Force-directed layout. Related memories pull together and everything repels,
 * but the important part is what it must NOT look like: a tidy disc. Memories
 * are grouped into lobes (linked ones by what they share, the rest by journal),
 * each lobe gets its own off-centre anchor, and the result is scaled per axis.
 * That gives the uneven, brain-like sprawl of a knowledge graph rather than a ball.
 */
export function layoutGraph(n: number, edges: WeaveEdge[], groups?: number[], seedRadius = 150): Pt[] {
  if (n === 0) return [];
  const rand = rng(n * 7919 + edges.length * 104729);

  // Lobes: linked memories share one (via connected components), and anything
  // unlinked falls back to the group it was handed (its journal).
  const lobe = new Array(n).fill(-1);
  const adj = new Map<number, number[]>();
  edges.forEach((e) => {
    if (!adj.has(e.a)) adj.set(e.a, []);
    if (!adj.has(e.b)) adj.set(e.b, []);
    adj.get(e.a)!.push(e.b);
    adj.get(e.b)!.push(e.a);
  });
  let next = 0;
  for (let i = 0; i < n; i++) {
    if (lobe[i] !== -1 || !adj.has(i)) continue;
    const id = next++;
    const stack = [i];
    while (stack.length) {
      const v = stack.pop()!;
      if (lobe[v] !== -1) continue;
      lobe[v] = id;
      (adj.get(v) ?? []).forEach((w) => { if (lobe[w] === -1) stack.push(w); });
    }
  }
  // Unlinked memories fall back to their journal, then those buckets are broken
  // into smaller knots of uneven size. One lobe per journal would just draw five
  // even blobs; many uneven ones is what reads as a mind rather than a diagram.
  const fallbackBase = next;
  const bucket = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    if (lobe[i] !== -1) continue;
    const g = groups?.[i] ?? 0;
    if (!bucket.has(g)) bucket.set(g, []);
    bucket.get(g)!.push(i);
  }
  let sub = fallbackBase;
  bucket.forEach((members) => {
    let at = 0;
    while (at < members.length) {
      const take = Math.max(3, Math.round(4 + rand() * 11));
      const id = sub++;
      for (let k = at; k < Math.min(members.length, at + take); k++) lobe[members[k]] = id;
      at += take;
    }
  });
  const lobeIds = [...new Set(lobe)];

  // Anchors are scattered by rejection sampling, not spaced around a ring, and
  // the field they land in is deliberately wider than it is tall. Even spacing is
  // exactly what would pull the whole thing back into a disc.
  const anchor = new Map<number, Pt>();
  const placed: Pt[] = [];
  const spanX = seedRadius * 1.75, spanY = seedRadius * 1.05;
  lobeIds.forEach((id) => {
    let best: Pt | null = null, bestGap = -1;
    for (let tries = 0; tries < 24; tries++) {
      const c = { x: (rand() - 0.5) * 2 * spanX, y: (rand() - 0.5) * 2 * spanY };
      let gap = Infinity;
      for (const q of placed) gap = Math.min(gap, Math.hypot(c.x - q.x, c.y - q.y));
      if (placed.length === 0) { best = c; break; }
      if (gap > bestGap) { bestGap = gap; best = c; }
    }
    placed.push(best!);
    anchor.set(id, best!);
  });

  // Lobes differ in how tightly they hold, so some read as dense knots and
  // others as loose drifts.
  const spread = new Map<number, number>();
  lobeIds.forEach((id) => spread.set(id, 0.55 + rand() * 1.15));

  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const c = anchor.get(lobe[i])!;
    const sp = spread.get(lobe[i])!;
    pts.push({ x: c.x + (rand() - 0.5) * 90 * sp, y: c.y + (rand() - 0.5) * 90 * sp });
  }

  // Personal space varies per memory. Pushing everything apart by the same
  // distance is what crystallises a big weave into visible rows and diamonds,
  // so each one keeps its own slightly different distance.
  // Density belongs to the lobe: some knots sit tight, others breathe. Uniform
  // spacing everywhere is the other half of what makes a big weave look like a grid.
  const baseGap = Math.max(26, 74 - n * 0.28);
  const gap = Array.from({ length: n }, (_, i) =>
    baseGap * (spread.get(lobe[i]) ?? 1) * (0.78 + rand() * 0.5)
  );

  // A big weave settles for fewer rounds on purpose. Left to run, repulsion keeps
  // optimising until every memory sits the same distance from its neighbours and
  // the whole thing turns into graph paper. Stopping early keeps the scatter it
  // started with; a small weave has room to arrange itself properly.
  const rounds = n > 120 ? 110 : n > 60 ? 260 : 420;
  for (let iter = 0; iter < rounds; iter++) {
    const cool = 1 - iter / (rounds * 1.35);
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = pts[j].x - pts[i].x, dy = pts[j].y - pts[i].y;
        const d = Math.hypot(dx, dy) || 0.01;
        const want = (gap[i] + gap[j]) / 2;
        if (d < want) {
          const f = ((want - d) / d) * 0.05 * cool;
          pts[i].x -= dx * f; pts[i].y -= dy * f;
          pts[j].x += dx * f; pts[j].y += dy * f;
        }
      }
    }
    for (const e of edges) {
      const a = pts[e.a], b = pts[e.b];
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 0.01;
      // Stronger links sit closer, so clusters read as themes at a glance.
      const rest = Math.max(baseGap * 0.62, baseGap * 1.15 - e.strength * 7);
      const f = ((d - rest) / d) * 0.05 * cool;
      a.x += dx * f; a.y += dy * f;
      b.x -= dx * f; b.y -= dy * f;
    }
    // Each memory drifts toward its own lobe, not toward the middle of the screen,
    // with a little wander so the settling never locks into a grid.
    for (let i = 0; i < n; i++) {
      const c = anchor.get(lobe[i])!;
      pts[i].x += (c.x - pts[i].x) * 0.006 * cool + (rand() - 0.5) * 1.6 * cool;
      pts[i].y += (c.y - pts[i].y) * 0.006 * cool + (rand() - 0.5) * 1.6 * cool;
    }
  }

  // Fit to the view with a single scale for both axes: scaling each axis
  // separately would stretch the sprawl back into a tidy square.
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const k = (seedRadius * 2) / Math.max(maxX - minX, maxY - minY, 1);
  for (const p of pts) { p.x = (p.x - cx) * k; p.y = (p.y - cy) * k; }
  return pts;
}
