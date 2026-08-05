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

/**
 * Force-directed layout: linked memories pull together, everything repels so
 * nothing overlaps. Runs once up front (not per frame) and is deterministic,
 * so the map looks the same every time you open it.
 */
export function layoutGraph(n: number, edges: WeaveEdge[], seedRadius = 150): Pt[] {
  if (n === 0) return [];
  // Golden-angle seeding gives an even, non-clumped starting spread.
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const ang = i * 2.399963;
    const rr = Math.sqrt((i + 0.7) / n);
    pts.push({ x: Math.cos(ang) * rr * seedRadius, y: Math.sin(ang) * rr * seedRadius * 0.9 });
  }

  const deg = new Array(n).fill(0);
  edges.forEach((e) => { deg[e.a]++; deg[e.b]++; });

  // Spacing scales with how many memories there are, so a big weave stays as
  // readable as a small one instead of turning into a solid blob.
  const minGap = Math.max(30, 96 - n * 0.55);

  for (let iter = 0; iter < 400; iter++) {
    const cool = 1 - iter / 520;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = pts[j].x - pts[i].x, dy = pts[j].y - pts[i].y;
        const d = Math.hypot(dx, dy) || 0.01;
        if (d < minGap) {
          const f = ((minGap - d) / d) * 0.055 * cool;
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
      const rest = Math.max(minGap * 0.62, minGap * 1.15 - e.strength * 7);
      const f = ((d - rest) / d) * 0.05 * cool;
      a.x += dx * f; a.y += dy * f;
      b.x -= dx * f; b.y -= dy * f;
    }
    // Gentle pull to centre keeps unconnected memories from drifting off-screen.
    for (let i = 0; i < n; i++) { pts[i].x *= 0.9975; pts[i].y *= 0.9975; }
  }

  // Normalise to a fixed radius so the weave always fills the view nicely,
  // whether it holds 8 memories or 800.
  let maxR = 0;
  for (const p of pts) maxR = Math.max(maxR, Math.hypot(p.x, p.y));
  if (maxR > 0) {
    const k = seedRadius / maxR;
    for (const p of pts) { p.x *= k; p.y *= k; }
  }
  return pts;
}
