import { DiaryType } from "@/lib/theme";

/**
 * The "brain" behind the weave: which memories are related, and why.
 *
 * Everything here is deterministic and runs on-device. No AI, no API calls.
 * Seven signals score each pair — shared rare words, shared phrases, shared
 * symbol families, closeness in time, recurring dates, same journal, similar
 * lucidity — and a link only exists once the combined score passes a threshold,
 * so the lines mean something instead of decorating the screen.
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

/**
 * The symbol lexicon: families of words that mean the same thing to a dream.
 * Two memories that never share a word still connect when they touch the same
 * family — "שחיתי בנהר" and "גלים בחוף" both live in water. The lists are plain
 * Hebrew (plus a few English strays) and are meant to be curated by Amichai;
 * adding a word here is all it takes to teach the weave a new symbol.
 */
const CONCEPTS: Record<string, string[]> = {
  "מים": ["מים", "ים", "נהר", "אגם", "גל", "גלים", "שחייה", "שחיתי", "לשחות", "טביעה", "טובע", "גשם", "מבול", "בריכה", "אוקיינוס", "חוף", "מעמקים", "צלילה", "water", "sea", "ocean"],
  "מעוף": ["טיסה", "לעוף", "עף", "עפה", "עפתי", "מעוף", "ריחוף", "לרחף", "מרחף", "מטוס", "כנפיים", "המראה", "flying", "flight"],
  "נפילה": ["נפילה", "ליפול", "נופל", "נופלת", "נפלתי", "צניחה", "תהום", "צוק", "falling"],
  "מרדף": ["מרדף", "רדיפה", "לברוח", "בריחה", "ברחתי", "בורח", "בורחת", "רודף", "נמלט", "מסתתר", "chase"],
  "משפחה": ["אמא", "אבא", "סבתא", "סבא", "אחות", "אחי", "משפחה", "הורים", "דודה", "דוד", "אימא"],
  "בית": ["בית", "דירה", "חדר", "ילדות", "מטבח", "חצר", "home"],
  "מוות": ["מוות", "מת", "מתה", "למות", "לוויה", "קבר", "אבל", "נפטר", "נפטרה", "death"],
  "לידה": ["תינוק", "תינוקת", "לידה", "היריון", "נולד", "נולדה", "baby"],
  "אור": ["אור", "זריחה", "שמש", "נר", "מנורה", "קרן", "זוהר", "מואר", "light"],
  "חושך": ["חושך", "חשוך", "צל", "צללים", "אפלה", "אפל", "עלטה", "dark", "darkness"],
  "חיות": ["כלב", "חתול", "נחש", "ציפור", "ציפורים", "סוס", "זאב", "דג", "דגים", "אריה", "פרפר", "עכביש"],
  "דרך": ["דרך", "כביש", "מסע", "נסיעה", "הליכה", "שביל", "צומת", "הלכתי", "journey", "road"],
  "שערים": ["דלת", "דלתות", "שער", "כניסה", "יציאה", "מפתח", "מנעול", "פתח", "door", "gate"],
  "לימודים": ["ספר", "לימודים", "כיתה", "מבחן", "מורה", "בחינה", "שיעור", "אוניברסיטה", "school", "exam"],
  "שיניים": ["שיניים", "שן", "teeth"],
  "קול": ["קול", "צעקה", "צעקתי", "שירה", "לשיר", "שרתי", "קריאה", "לחישה", "voice"],
  "עיר": ["עיר", "רחוב", "רחובות", "בניין", "בניינים", "כיכר", "city"],
  "יער": ["יער", "עצים", "עץ", "צמחייה", "שורשים", "forest", "tree"],
  "אש": ["אש", "שריפה", "להבה", "להבות", "עשן", "גחלים", "fire"],
  "שמיים": ["שמיים", "כוכבים", "כוכב", "ירח", "ענן", "עננים", "sky", "stars", "moon"],
  "זמן": ["זמן", "שעון", "מאחר", "מאחרת", "איחור", "איחרתי", "עבר", "עתיד", "time", "clock"],
  "מלחמה": ["מלחמה", "חייל", "חיילים", "קרב", "נשק", "אזעקה", "war"],
  "חתונה": ["חתונה", "כלה", "חתן", "טבעת", "wedding"],
  "אובדן": ["אבוד", "אבודה", "לאיבוד", "אבדתי", "איבדתי", "נעלם", "נעלמה", "lost"],
  "חיפוש": ["חיפוש", "לחפש", "מחפש", "מחפשת", "חיפשתי", "למצוא", "מצאתי", "search"],
  "מראה": ["מראה", "השתקפות", "בבואה", "מסתכל", "מסתכלת", "mirror", "reflection"],
  "נסיעה": ["מכונית", "אוטו", "רכב", "אוטובוס", "רכבת", "תחנה", "נהיגה", "נוהג", "נוהגת", "car", "train"],
  "שיחה": ["טלפון", "הודעה", "שיחה", "שיחת", "צלצול", "התקשר", "התקשרה", "phone", "call"],
};

/** word → family name, built once. */
const CONCEPT_OF = new Map<string, string>();
for (const [family, words] of Object.entries(CONCEPTS)) {
  for (const w of words) CONCEPT_OF.set(w, family);
}

const HEB_PREFIX = new Set(["ה", "ו", "ב", "ל", "כ", "ש", "מ"]);

/**
 * Find the family of a word, forgiving Hebrew prefixes: "לים" and "בבית" reach
 * their families without a stemmer, by peeling at most two attached letters.
 */
function familyOf(word: string): string | undefined {
  let w = word;
  for (let peel = 0; peel < 3; peel++) {
    const hit = CONCEPT_OF.get(w);
    if (hit) return hit;
    // Peel down to two letters, no further: "הים" and "לים" must still reach "ים".
    if (w.length < 3 || !HEB_PREFIX.has(w[0])) return undefined;
    w = w.slice(1);
  }
  return undefined;
}

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
const W_PHRASE = 3.2;
const W_CONCEPT = 2.8;
const W_SAME_NIGHT = 1.5;
const W_NEAR_DAYS = 0.9;
const W_RECUR_DATE = 0.45;
const W_SAME_TYPE = 0.5;
const W_LUCIDITY = 0.5;
const THRESHOLD = 1.4;

/** Adjacent meaningful words, so "בית ספר" is one idea rather than two. */
function bigrams(ws: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < ws.length - 1; i++) out.push(`${ws[i]} ${ws[i + 1]}`);
  return out;
}

export function computeEdges(items: WeaveItem[]): WeaveEdge[] {
  const toks = items.map((it) => tokenize(`${it.title} ${it.body}`));
  const grams = toks.map(bigrams);
  const fams = toks.map((ws) => {
    const s = new Set<string>();
    for (const w of ws) {
      const f = familyOf(w);
      if (f) s.add(f);
    }
    return s;
  });

  // Document frequency, so a word shared by everyone counts for almost nothing
  // while a rare one (a person, a place) counts a lot. Classic TF-IDF intuition.
  // Phrases and symbol families are weighed the same way: a family half the
  // journal touches ("בית") says far less than one only two memories share.
  const df = new Map<string, number>();
  toks.forEach((ws) => {
    new Set(ws).forEach((w) => df.set(w, (df.get(w) ?? 0) + 1));
  });
  const dfGram = new Map<string, number>();
  grams.forEach((gs) => {
    new Set(gs).forEach((g) => dfGram.set(g, (dfGram.get(g) ?? 0) + 1));
  });
  const dfFam = new Map<string, number>();
  fams.forEach((fs) => {
    fs.forEach((f) => dfFam.set(f, (dfFam.get(f) ?? 0) + 1));
  });

  const times = items.map((it) => new Date(it.createdAt).getTime());
  const dates = items.map((it) => new Date(it.createdAt));
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

      // 1b. Shared phrases — a two-word idea both memories say the same way is
      // stronger evidence than either of its halves alone.
      const gramsI = new Set(grams[i]);
      const sharedGrams: string[] = [];
      for (const g of new Set(grams[j])) {
        if (gramsI.has(g)) sharedGrams.push(g);
      }
      if (sharedGrams.length) {
        let s = 0;
        for (const g of sharedGrams) s += 1 / (dfGram.get(g) ?? 1);
        score += s * W_PHRASE;
        sharedGrams.sort((a, b) => (dfGram.get(a) ?? 0) - (dfGram.get(b) ?? 0));
        reasons.push(`ביטוי משותף: ${sharedGrams[0]}`);
      }

      // 1c. Shared symbol families — no common word needed; swimming a river and
      // waves on a beach both live in water. Rarity-weighted like everything else.
      const sharedFams: string[] = [];
      fams[j].forEach((f) => { if (fams[i].has(f)) sharedFams.push(f); });
      if (sharedFams.length) {
        let s = 0;
        // Square-root damping, gentler than the word rule: a symbol a handful of
        // memories touch still draws a line, one half the journal touches fades.
        for (const f of sharedFams) s += 1 / Math.sqrt(dfFam.get(f) ?? 1);
        score += s * W_CONCEPT;
        sharedFams.sort((a, b) => (dfFam.get(a) ?? 0) - (dfFam.get(b) ?? 0));
        reasons.push(`סמל משותף: ${sharedFams.slice(0, 2).join(", ")}`);
      }

      // 2. Time proximity
      const days = Math.abs(times[i] - times[j]) / DAY;
      if (days < 1) {
        score += W_SAME_NIGHT;
        reasons.push("קרבה בזמן: אותו יום");
      } else if (days <= 2) {
        score += W_NEAR_DAYS;
        reasons.push(`קרבה בזמן: ${Math.round(days)} ימים`);
      } else if (days >= 20 && dates[i].getDate() === dates[j].getDate()) {
        // 2b. Recurring dates: the same day of the month, months apart — and the
        // same calendar date a year later is the strongest echo of all. A soft
        // signal either way, never enough to draw a link on its own.
        const anniversary = dates[i].getMonth() === dates[j].getMonth();
        score += W_RECUR_DATE;
        reasons.push(anniversary ? "אותו תאריך, שנה אחרת" : `תאריך חוזר: ${dates[i].getDate()} בחודש`);
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
