"use client";

import { createClient } from "./client";
import { DiaryType } from "@/lib/theme";

export type Lucidity = "low" | "med" | "high";
export type Visibility = "private" | "public" | "custom";

export type DbEntry = {
  id: string;
  type: DiaryType;
  title: string;
  body: string;
  lucidity: Lucidity | null;
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
  role: "user" | "admin";
  status: "pending" | "active" | "suspended";
  language: "he" | "en";
  created_at: string;
};

export async function getProfile(): Promise<DbProfile | null> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", auth.user.id).single();
  return (data as DbProfile) ?? null;
}

export async function listEntries(): Promise<DbEntry[]> {
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
  const supabase = createClient();
  const { data } = await supabase.from("entries").select("*").eq("id", id).maybeSingle();
  return (data as DbEntry) ?? null;
}

export async function uploadAttachment(file: File): Promise<string> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("not signed in");
  const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const path = `${auth.user.id}/${crypto.randomUUID()}-${safeName}`;
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
  visibility: Visibility;
  file?: File | null;
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
      visibility: input.visibility,
      media_url,
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
    visibility?: Visibility;
    media_url?: string | null;
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
  const supabase = createClient();
  const { data, error } = await supabase.rpc("list_shared_entries");
  if (error) throw error;
  return (data ?? []) as SharedEntry[];
}

export async function getSharedEntry(id: string): Promise<SharedEntry | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_shared_entry", { p_id: id });
  if (error) return null;
  const rows = (data ?? []) as SharedEntry[];
  return rows[0] ?? null;
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
