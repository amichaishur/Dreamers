"use client";

import { useEffect, useState } from "react";
import { theme } from "@/lib/theme";
import { useLang } from "@/lib/i18n";
import { listReactions, react, Reaction, ReactionKind } from "@/lib/supabase/data";
import { initialsFrom } from "@/lib/format";

const p = theme;

export const REACTION_COLOR: Record<ReactionKind, string> = {
  love: "#F08BA8",
  comment: "#9AB6FF",
  reflection: "#B79CEB",
  sync: "#F2C879",
};

export function ReactionIcon({ kind, size = 15, color, filled = false }: { kind: ReactionKind; size?: number; color?: string; filled?: boolean }) {
  const c = color ?? REACTION_COLOR[kind];
  const common = { width: size, height: size, viewBox: "0 0 24 24", stroke: c, strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (kind === "love") {
    return <svg {...common} fill={filled ? c : "none"}><path d="M12 20.3s-7.2-4.7-7.2-9.5a3.8 3.8 0 0 1 7.2-1.8 3.8 3.8 0 0 1 7.2 1.8c0 4.8-7.2 9.5-7.2 9.5Z" /></svg>;
  }
  if (kind === "comment") return <svg {...common} fill="none"><path d="M21 12a8 8 0 0 1-8 8H7l-4 3v-6.5A8 8 0 1 1 21 12Z" /></svg>;
  if (kind === "reflection") return <svg {...common} fill="none"><path d="M12 3v18" /><path d="M8 7 4 12l4 5" /><path d="M16 7l4 5-4 5" /></svg>;
  return <svg {...common} fill="none"><path d="M4 9a8 8 0 0 1 13.6-4.6L20 7" /><path d="M20 4v3h-3" /><path d="M20 15a8 8 0 0 1-13.6 4.6L4 17" /><path d="M4 20v-3h3" /></svg>;
}

/**
 * How a shared memory is answered: a heart, or words underneath it. Nothing more
 * complicated than that, and the box to write in is always open, so replying
 * takes one tap rather than two.
 */
export default function Reactions({ entryId, accent, onChanged }: { entryId: string; accent?: string; onChanged?: () => void }) {
  const { t, lang } = useLang();
  // A heart fills in the colour of the memory it belongs to, so the response
  // reads as part of that dream rather than a generic app control.
  const heartColor = accent ?? REACTION_COLOR.love;
  const [rows, setRows] = useState<Reaction[] | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listReactions(entryId).then(setRows).catch(() => setRows([]));
  }, [entryId]);

  const loved = (rows ?? []).some((r) => r.kind === "love" && r.mine);
  const loves = (rows ?? []).filter((r) => r.kind === "love").length;
  const comments = (rows ?? []).filter((r) => r.kind === "comment");

  const send = async (kind: ReactionKind, body = "") => {
    if (busy) return;
    setBusy(true);
    // The heart answers immediately; waiting on the network to colour it in
    // makes the tap feel broken.
    if (kind === "love") {
      setRows((prev) => {
        if (!prev) return prev;
        return loved
          ? prev.filter((r) => !(r.kind === "love" && r.mine))
          : [...prev, { id: `pending-${Date.now()}`, kind: "love", body: "", created_at: new Date().toISOString(), author_name: null, mine: true }];
      });
    }
    try {
      await react(entryId, kind, body);
      setRows(await listReactions(entryId));
      onChanged?.();
    } catch {
      setRows(await listReactions(entryId).catch(() => rows ?? []));
    }
    setDraft("");
    setBusy(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Heart and count */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <button
          onClick={() => send("love")}
          aria-pressed={loved}
          aria-label={t("rx.love")}
          style={{ display: "flex", alignItems: "center", gap: 7, background: "transparent", border: "none", padding: 0, cursor: "pointer", font: "inherit" }}
        >
          <ReactionIcon kind="love" size={23} filled={loved} color={loved ? heartColor : p.subtext} />
          {loves > 0 && (
            <span style={{ fontSize: 13.5, fontWeight: 700, color: loved ? heartColor : p.subtext, fontVariantNumeric: "tabular-nums" }}>{loves}</span>
          )}
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <ReactionIcon kind="comment" size={22} color={p.subtext} />
          {comments.length > 0 && (
            <span style={{ fontSize: 13.5, fontWeight: 700, color: p.subtext, fontVariantNumeric: "tabular-nums" }}>{comments.length}</span>
          )}
        </div>
      </div>

      {/* What people said */}
      {comments.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          {comments.map((r) => (
            <div key={r.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", flex: "0 0 auto", background: "linear-gradient(135deg,#6E8BFF,#9A6CFF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff" }}>
                {initialsFrom(r.author_name, r.author_name ?? "?")}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: p.text }}>{r.author_name ?? t("rx.someone")}</span>
                <span style={{ fontSize: 13, color: p.text, opacity: 0.86 }}> {r.body}</span>
                <div style={{ fontSize: 10.5, color: p.subtext, marginTop: 3 }}>
                  {new Date(r.created_at).toLocaleDateString(lang === "en" ? "en-US" : "he-IL", { day: "numeric", month: "short" })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Always open, so replying is one tap */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && draft.trim()) send("comment", draft.trim()); }}
          placeholder={t("rx.addComment")}
          style={{ flex: 1, minWidth: 0, height: 42, padding: "0 14px", borderRadius: 999, background: p.cardBg, border: `1px solid ${p.cardBorder}`, color: p.text, fontSize: 13.5, font: "inherit", outline: "none" }}
        />
        {draft.trim() && (
          <button
            onClick={() => send("comment", draft.trim())}
            disabled={busy}
            style={{ flex: "0 0 auto", padding: "0 16px", height: 42, borderRadius: 999, border: "none", cursor: "pointer", background: `linear-gradient(135deg, ${p.fabFrom}, ${p.fabTo})`, color: "#fff", fontSize: 13.5, fontWeight: 700, font: "inherit" }}
          >
            {busy ? t("rx.sending") : t("rx.send")}
          </button>
        )}
      </div>
    </div>
  );
}
