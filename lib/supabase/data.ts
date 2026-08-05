"use client";

import { createClient } from "./client";
import { DiaryType } from "@/lib/theme";

// Lucidity is a 0-10 scale stored as text ("0" = not lucid at all … "10" = fully lucid).
export type Lucidity = string;
export type Visibility = "private" | "public" | "custom";

/** Per-journal sub-type chosen with the buttons at the top of a form. */
export type EntryKind =
  | "sync" | "reality_check" | "anomaly"      // reality journal
  | "creation_seed" | "dream_seed"            // creation journal
  | null;

/** Per-journal extras that don't deserve their own column. */
export type SymbolType = "symbol" | "anchor" | "sign";
export type SymbolWhere = "reality" | "dream" | "creation" | "idea";
export type SymbolReturn = "first" | "several" | "ongoing";

export type EntryMeta = {
  symbolType?: SymbolType;       // a symbol, an anchor, or a sign
  symbolWhere?: SymbolWhere;     // which world you met it in
  symbolReturn?: SymbolReturn;   // first time, a few times, or it walks with you
};

export type DbEntry = {
  id: string;
  type: DiaryType;
  title: string;
  body: string;
  lucidity: Lucidity | null;
  awareness: Lucidity | null;
  kind: EntryKind;
  meta: EntryMeta;
  media_url: string | null;
  visibility: Visibility;
  shared_anonymous: boolean;
  shared_media_url: string | null;
  created_at: string;
};

export type SharedEntry = {
  id: string;
  type: DiaryType;
  title: string;
  body: string;
  lucidity: Lucidity | null;
  shared_media_url: string | null;
  created_at: string;
  shared_anonymous: boolean;
  author_name: string | null;
};

const YEAR_SECONDS = 60 * 60 * 24 * 365;

export type DbProfile = {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url?: string | null;
  role: "user" | "admin";
  status: "pending" | "active" | "suspended";
  language: "he" | "en";
  created_at: string;
};

export async function getProfile(): Promise<DbProfile | null> {
  if (demoEnabled()) return demoProfileObj();
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", auth.user.id).single();
  return (data as DbProfile) ?? null;
}

// Upload a profile photo to the public avatars bucket, return its public URL.
export async function uploadAvatar(file: File): Promise<string> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("not signed in");
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${auth.user.id}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type || "image/jpeg" });
  if (error) throw error;
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}

export async function setProfileAvatar(url: string | null): Promise<void> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("not signed in");
  const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", auth.user.id);
  if (error) throw error;
}

export async function listEntries(): Promise<DbEntry[]> {
  if (demoEnabled()) return demoPersonalEntries();
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  // Personal weave: only the user's own entries (belt-and-suspenders on top of RLS).
  const { data, error } = await supabase
    .from("entries")
    .select("*")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DbEntry[];
}

export async function getEntry(id: string): Promise<DbEntry | null> {
  if (demoEnabled()) return demoPersonalEntries().find((e) => e.id === id) ?? null;
  const supabase = createClient();
  const { data } = await supabase.from("entries").select("*").eq("id", id).maybeSingle();
  return (data as DbEntry) ?? null;
}

export async function uploadAttachment(file: File): Promise<string> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("not signed in");
  const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
  // Random, non-identifying path. The media bucket's RLS authorises on the storage
  // `owner` column (= uploader), NOT on the path, so the path must not carry the
  // user id — otherwise a shared entry's signed URL would reveal who wrote it,
  // defeating anonymous sharing.
  const path = `${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage.from("media").upload(path, file);
  if (error) throw error;
  return path;
}

export async function getAttachmentUrl(path: string): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.storage.from("media").createSignedUrl(path, 3600);
  if (error) return null;
  return data.signedUrl;
}

export async function createEntry(input: {
  type: DiaryType;
  title: string;
  body: string;
  lucidity?: Lucidity | null;
  awareness?: Lucidity | null;
  kind?: EntryKind;
  meta?: EntryMeta;
  visibility: Visibility;
  file?: File | null;
  created_at?: string;
}): Promise<DbEntry> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("not signed in");

  let media_url: string | null = null;
  if (input.file) media_url = await uploadAttachment(input.file);

  const { data, error } = await supabase
    .from("entries")
    .insert({
      user_id: auth.user.id,
      type: input.type,
      title: input.title,
      body: input.body,
      lucidity: input.lucidity ?? null,
      awareness: input.awareness ?? null,
      kind: input.kind ?? null,
      meta: input.meta ?? {},
      visibility: input.visibility,
      media_url,
      ...(input.created_at ? { created_at: input.created_at } : {}),
    })
    .select()
    .single();

  if (error) throw error;
  return data as DbEntry;
}

export async function updateEntry(
  id: string,
  patch: {
    title?: string;
    body?: string;
    lucidity?: Lucidity | null;
    awareness?: Lucidity | null;
    kind?: EntryKind;
    meta?: EntryMeta;
    visibility?: Visibility;
    media_url?: string | null;
    created_at?: string;
  }
): Promise<DbEntry> {
  const supabase = createClient();
  const { data, error } = await supabase.from("entries").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data as DbEntry;
}

export async function deleteEntry(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("entries").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Community sharing ----------

export async function setEntrySharing(id: string, opts: { shared: boolean; anonymous: boolean }): Promise<DbEntry> {
  const supabase = createClient();
  const patch: {
    visibility: Visibility;
    shared_anonymous: boolean;
    shared_media_url?: string | null;
  } = {
    visibility: opts.shared ? "public" : "private",
    shared_anonymous: opts.shared ? opts.anonymous : false,
  };

  if (opts.shared) {
    // Refresh a long-lived signed URL so the public page/feed can load the image
    // without access to the private bucket. Cleared when unsharing.
    const { data: cur } = await supabase.from("entries").select("media_url").eq("id", id).single();
    const mediaPath = (cur as { media_url: string | null } | null)?.media_url ?? null;
    if (mediaPath) {
      const { data: signed } = await supabase.storage.from("media").createSignedUrl(mediaPath, YEAR_SECONDS);
      patch.shared_media_url = signed?.signedUrl ?? null;
    } else {
      patch.shared_media_url = null;
    }
  } else {
    patch.shared_media_url = null;
  }

  const { data, error } = await supabase.from("entries").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data as DbEntry;
}

export async function listSharedEntries(): Promise<SharedEntry[]> {
  if (demoEnabled()) return demoSharedList();
  const supabase = createClient();
  const { data, error } = await supabase.rpc("list_shared_entries");
  if (error) throw error;
  return (data ?? []) as SharedEntry[];
}

export async function getSharedEntry(id: string): Promise<SharedEntry | null> {
  if (demoEnabled()) return demoSharedList().find((e) => e.id === id) ?? null;
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_shared_entry", { p_id: id });
  if (error) return null;
  const rows = (data ?? []) as SharedEntry[];
  return rows[0] ?? null;
}

// ---------- Community reactions ----------

export type ReactionKind = "love" | "comment" | "reflection" | "sync";
export type Reaction = {
  id: string;
  kind: ReactionKind;
  body: string;
  created_at: string;
  author_name: string | null;
  mine: boolean;
};
export type ReactionCounts = {
  entry_id: string;
  loves: number;
  comments: number;
  reflections: number;
  syncs: number;
  i_loved: boolean;
};
export type InboxItem = {
  id: string;
  entry_id: string;
  entry_title: string;
  entry_type: DiaryType;
  kind: ReactionKind;
  body: string;
  created_at: string;
  author_name: string | null;
  unread: boolean;
};

export async function listReactions(entryId: string): Promise<Reaction[]> {
  if (demoEnabled()) return demoReactions(entryId);
  const supabase = createClient();
  const { data, error } = await supabase.rpc("list_reactions", { p_entry: entryId });
  if (error) return [];
  return (data ?? []) as Reaction[];
}

/** Respond to a shared memory. Sending 'love' twice takes it back. */
export async function react(entryId: string, kind: ReactionKind, body = ""): Promise<void> {
  if (demoEnabled()) { demoReact(entryId, kind, body); return; }
  const supabase = createClient();
  const { error } = await supabase.rpc("react", { p_entry: entryId, p_kind: kind, p_body: body });
  if (error) throw error;
}

export async function listReactionCounts(): Promise<Map<string, ReactionCounts>> {
  if (demoEnabled()) return demoCounts();
  const supabase = createClient();
  const { data, error } = await supabase.rpc("reaction_counts");
  const m = new Map<string, ReactionCounts>();
  if (error) return m;
  ((data ?? []) as ReactionCounts[]).forEach((r) => m.set(r.entry_id, r));
  return m;
}

export async function listInbox(): Promise<InboxItem[]> {
  if (demoEnabled()) return demoInbox();
  const supabase = createClient();
  const { data, error } = await supabase.rpc("my_inbox");
  if (error) return [];
  return (data ?? []) as InboxItem[];
}

export async function markInboxRead(): Promise<void> {
  if (demoEnabled()) return;
  const supabase = createClient();
  await supabase.rpc("mark_inbox_read");
}

export type MindDot = { type: DiaryType; mine: boolean };

// Preview-only demo mode. Enabled with ?demo (persisted), disabled with ?nodemo.
// Never active on the production host — purely for showing a populated weave in preview.
// Showcase = a login-free preview deployment (set NEXT_PUBLIC_SHOWCASE=1 on the
// preview Netlify site). Everything runs on demo data so the client can browse
// every screen without signing in. Production never sets this.
export const SHOWCASE = process.env.NEXT_PUBLIC_SHOWCASE === "1";

// Demo/showcase data may ONLY appear when SHOWCASE is set (the preview site) or on a
// local dev host. Any real domain — production or a future custom domain — always
// shows real customer data, so demo can never leak to live users.
function isLocalHost(h: string): boolean {
  return h === "localhost" || h === "127.0.0.1" || h.endsWith(".local")
    || /^192\.168\./.test(h) || /^10\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h);
}

export function demoEnabled(): boolean {
  if (SHOWCASE) return true;
  if (typeof window === "undefined") return false;
  if (!isLocalHost(window.location.hostname)) return false; // real domains → always real data
  // Local dev: demo on by default, toggle with ?demo / ?nodemo (persisted).
  const s = window.location.search;
  if (s.includes("nodemo")) { window.localStorage.setItem("dreamers_demo_off", "1"); return false; }
  if (s.includes("demo")) { window.localStorage.removeItem("dreamers_demo_off"); return true; }
  if (window.localStorage.getItem("dreamers_demo_off") === "1") return false;
  return true;
}

// ---- Demo content for showcase / preview ----
const DEMO_TITLES = ["טיסה מעל הים", "בית הילדות", "מבוך אינסופי", "שיחה עם סבתא", "נפילה איטית", "יער זוהר", "מרוץ בזמן", "דלת נסתרת", "ריקוד על המים", "עיר תת־ימית", "כנפיים חדשות", "גשר הכוכבים", "חדר ללא קירות", "אור בקצה", "מסע אל השחר"];
const DEMO_AUTHORS = ["מיכל", "יונתן", "נועה", "דניאל", "תמר", "איתי", null, "שירה", null, "אורי"];

function demoDateISO(daysAgo: number, hour = 3): string {
  return new Date(Date.now() - daysAgo * 86400000 - hour * 3600000).toISOString();
}

function demoPersonalEntries(): DbEntry[] {
  const types: DiaryType[] = ["dream", "dream", "idea", "dream", "creation", "dream", "reality", "dream", "idea", "record", "dream", "creation", "dream", "reality", "dream"];
  return types.map((type, i) => ({
    id: `demo-p-${i}`,
    type,
    title: DEMO_TITLES[i % DEMO_TITLES.length],
    body: "רשומה לדוגמה במצב תצוגה.",
    lucidity: type === "dream" ? String(Math.max(0, Math.min(10, Math.round(5 + 3 * Math.sin(i * 1.1))))) : null,
    awareness: type === "dream" ? String(Math.max(0, Math.min(10, Math.round(5 + 3 * Math.sin(i * 0.8 + 1))))) : null,
    kind: type === "reality" ? (["sync", "reality_check", "anomaly"] as const)[i % 3] : null,
    meta: {},
    media_url: null,
    visibility: i % 5 === 0 ? "public" : "private",
    shared_anonymous: false,
    shared_media_url: null,
    created_at: demoDateISO(i * 2 + (i % 3)),
  }));
}

/**
 * Preview reactions live in memory for the session, so hearting and commenting
 * actually behave in a demo instead of silently doing nothing.
 */
const demoStore = new Map<string, Reaction[]>();

function demoReactions(entryId: string): Reaction[] {
  const existing = demoStore.get(entryId);
  if (existing) return existing;
  const bodies = ["גם אני חלמתי משהו דומה בדיוק באותו שבוע.", "זה נגע בי. תודה ששיתפת.", "הסמל הזה חוזר גם אצלי."];
  const n = (entryId.charCodeAt(entryId.length - 1) % 3) + 1;
  const seeded: Reaction[] = Array.from({ length: n }, (_, i) => ({
    id: `demo-r-${entryId}-${i}`,
    // Every comment carries words; a comment with nothing in it says nothing.
    kind: i === 0 ? "love" : "comment",
    body: i === 0 ? "" : bodies[i % bodies.length],
    created_at: demoDateISO(i),
    author_name: DEMO_AUTHORS[i % DEMO_AUTHORS.length] ?? "מיכל",
    mine: false,
  }));
  demoStore.set(entryId, seeded);
  return seeded;
}

function demoReact(entryId: string, kind: ReactionKind, body: string) {
  const rows = demoReactions(entryId).slice();
  if (kind === "love") {
    const at = rows.findIndex((r) => r.kind === "love" && r.mine);
    if (at >= 0) rows.splice(at, 1);
    else rows.push({ id: `demo-mine-${Date.now()}`, kind: "love", body: "", created_at: new Date().toISOString(), author_name: "אורח/ת", mine: true });
  } else {
    rows.push({ id: `demo-mine-${Date.now()}`, kind, body, created_at: new Date().toISOString(), author_name: "אורח/ת", mine: true });
  }
  demoStore.set(entryId, rows);
}

function demoCounts(): Map<string, ReactionCounts> {
  const m = new Map<string, ReactionCounts>();
  demoSharedList().forEach((e, i) => {
    m.set(e.id, {
      entry_id: e.id,
      loves: (i * 3) % 5,
      comments: i % 3,
      reflections: (i + 1) % 3,
      syncs: i % 2,
      i_loved: i % 4 === 0,
    });
  });
  return m;
}

function demoInbox(): InboxItem[] {
  const mine = demoPersonalEntries().filter((e) => e.visibility === "public");
  const kinds: ReactionKind[] = ["love", "comment"];
  const bodies = ["גם אני חלמתי משהו דומה.", "זה נגע בי מאוד.", "הסמל הזה חוזר גם אצלי.", ""];
  return mine.flatMap((e, i) =>
    kinds.slice(0, (i % 3) + 2).map((kind, k) => ({
      id: `demo-i-${i}-${k}`,
      entry_id: e.id,
      entry_title: e.title,
      entry_type: e.type,
      kind,
      body: kind === "love" ? "" : bodies[k % bodies.length],
      created_at: demoDateISO(i + k),
      author_name: DEMO_AUTHORS[(i + k) % DEMO_AUTHORS.length] ?? "יונתן",
      unread: i + k < 4,
    }))
  );
}

function demoSharedList(): SharedEntry[] {
  const types: DiaryType[] = ["dream", "creation", "dream", "idea", "dream", "reality", "dream", "record", "creation", "dream", "idea", "dream"];
  return types.map((type, i) => {
    const author = DEMO_AUTHORS[i % DEMO_AUTHORS.length];
    return {
      id: `demo-s-${i}`,
      type,
      title: DEMO_TITLES[(i + 3) % DEMO_TITLES.length],
      body: "חלום ששותף לקהילה במצב תצוגה. הפרטים המלאים נראים רק בקהילה.",
      lucidity: type === "dream" ? String(Math.max(0, Math.min(10, Math.round(6 + 3 * Math.sin(i * 0.9))))) : null,
      shared_media_url: null,
      created_at: demoDateISO(i + 1),
      shared_anonymous: author === null,
      author_name: author,
    };
  });
}

function demoProfileObj(): DbProfile {
  return { id: "demo-user", email: "guest@dreamers.app", display_name: "אורח/ת", avatar_url: null, role: "user", status: "active", language: "he", created_at: demoDateISO(120) };
}

const DEMO_TYPES: DiaryType[] = ["dream", "creation", "idea", "reality", "record"];
function demoDots(mine = 15, others = 180): MindDot[] {
  const out: MindDot[] = [];
  for (let i = 0; i < mine; i++) out.push({ type: DEMO_TYPES[i % 5], mine: true });
  for (let i = 0; i < others; i++) out.push({ type: DEMO_TYPES[(i * 3 + 1) % 5], mine: false });
  return out;
}

// Every entry as an anonymous dot (type + is-it-mine). No content — for the weave only.
export async function listConsciousnessDots(): Promise<MindDot[]> {
  if (demoEnabled()) return demoDots();
  const supabase = createClient();
  const { data, error } = await supabase.rpc("consciousness_dots");
  if (error) return [];
  return (data ?? []) as MindDot[];
}

// Rich sample history for the dashboard preview: ~2 years of dreams with a
// wandering lucidity so the meter reads like a live stock chart. Never linked
// anywhere and never touches the DB — purely to demo the charts.
function demoStatsEntries(): DbEntry[] {
  const now = Date.now();
  const N = 280;
  const others: DiaryType[] = ["creation", "idea", "reality", "record"];
  const out: DbEntry[] = [];
  for (let i = 0; i < N; i++) {
    const frac = i / (N - 1);
    const daysAgo = Math.round(Math.pow(1 - frac, 1.5) * 730);
    const t = now - daysAgo * 86400000 - (i % 24) * 3600000;
    const isDream = i % 4 !== 0;
    const type: DiaryType = isDream ? "dream" : others[i % others.length];
    const raw = 5 + 3 * Math.sin(i * 0.17) + 1.8 * Math.sin(i * 0.045) + ((i % 9) - 4) * 0.35;
    const v = Math.max(0, Math.min(10, Math.round(raw)));
    // Awareness tracks lucidity loosely: often present even when a dream is not lucid.
    const aw = Math.max(0, Math.min(10, Math.round(raw * 0.75 + 1.6 + Math.sin(i * 0.31))));
    out.push({
      id: `demo-${i}`, type, title: "חלום לדוגמה", body: "",
      lucidity: isDream ? String(v) : null,
      awareness: isDream ? String(aw) : null,
      kind: null, meta: {}, media_url: null,
      visibility: "private", shared_anonymous: false, shared_media_url: null,
      created_at: new Date(t).toISOString(),
    });
  }
  return out;
}

// Dashboard data source — demo history in preview, real entries otherwise.
export async function listStatsEntries(): Promise<DbEntry[]> {
  if (demoEnabled()) return demoStatsEntries();
  return listEntries();
}

export type CommunityStats = { members: number; shared: number; week: number };

export async function getCommunityStats(): Promise<CommunityStats> {
  if (demoEnabled()) return { members: 42, shared: 180, week: 12 };
  const supabase = createClient();
  const { data, error } = await supabase.rpc("community_stats");
  const row = (Array.isArray(data) ? data[0] : data) as CommunityStats | undefined;
  if (error || !row) return { members: 0, shared: 0, week: 0 };
  return { members: row.members ?? 0, shared: row.shared ?? 0, week: row.week ?? 0 };
}

// ---------- Admin (real users) ----------

export async function listProfiles(): Promise<DbProfile[]> {
  const supabase = createClient();
  // RLS: admins can select all profiles (profiles_select_self = self OR is_admin()).
  const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as DbProfile[];
}

export async function setUserStatus(id: string, status: "active" | "suspended" | "pending"): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("profiles").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function setUserRole(id: string, role: "admin" | "user"): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
  if (error) throw error;
}

export async function removeUser(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("profiles").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Invitations & codes (admin controls who joins) ----------

export type Invitation = { id: string; email: string; status: "pending" | "accepted"; role: "user" | "admin"; created_at: string };
export type InviteCode = { id: string; code: string; single_use: boolean; max_uses: number | null; used_count: number; expires_at: string | null; created_at: string };

export async function listInvitations(): Promise<Invitation[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("invitations").select("id,email,status,role,created_at").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Invitation[];
}

/** Pre-approve an email, optionally as admin. Returns "added" or "exists". */
export async function createInvitation(email: string, role: "user" | "admin" = "user"): Promise<"added" | "exists"> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const clean = email.trim().toLowerCase();
  const { error } = await supabase.from("invitations").insert({ email: clean, invited_by: auth.user?.id ?? null, status: "pending", role });
  if (error) {
    if (error.code === "23505") return "exists"; // unique_violation
    throw error;
  }
  return "added";
}

/** Change the role a pending invitation will grant on join (e.g. promote to admin before they log in). */
export async function setInvitationRole(id: string, role: "user" | "admin"): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("invitations").update({ role }).eq("id", id);
  if (error) throw error;
}

export async function revokeInvitation(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("invitations").delete().eq("id", id);
  if (error) throw error;
}

function genCode(len = 6): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no I/L/O/0/1
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => alphabet[n % alphabet.length]).join("");
}

/** Create a shareable invite code. group=false → single use; days=null → no expiry. */
export async function createInviteCode(opts: { group: boolean; days: number | null }): Promise<InviteCode> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const code = genCode();
  const expires_at = opts.days ? new Date(Date.now() + opts.days * 86400000).toISOString() : null;
  const { data, error } = await supabase
    .from("invite_codes")
    .insert({ code, single_use: !opts.group, max_uses: null, expires_at, created_by: auth.user?.id ?? null })
    .select()
    .single();
  if (error) throw error;
  return data as InviteCode;
}
