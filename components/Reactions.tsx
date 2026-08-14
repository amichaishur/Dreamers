"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { theme } from "@/lib/theme";
import { useLang } from "@/lib/i18n";
import { listReactions, react, deleteReaction, editReaction, Reaction, ReactionKind } from "@/lib/supabase/data";
import { initialsFrom } from "@/lib/format";

const p = theme;

/** Four answers, four colours, far enough apart to tell at a glance. */
export const REACTION_COLOR: Record<ReactionKind, string> = {
  love: "#F08BA8",
  comment: "#9AB6FF",
  reflection: "#B79CEB",
  sync: "#F59A3C",
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

/** The three ways of answering in words. A heart is the fourth, and wordless. */
const TEXT_KINDS = ["comment", "sync", "reflection"] as const;
type TextKind = (typeof TEXT_KINDS)[number];

/**
 * How a shared memory is answered: a heart, or words underneath it. The words
 * come in three flavours — a plain response, a sync, a reflection — which behave
 * identically and differ only in colour and icon, so the thread stays one
 * conversation rather than three. The box to write in is always open, so
 * replying takes one tap rather than two.
 */
export default function Reactions({ entryId, accent, onChanged }: { entryId: string; accent?: string; onChanged?: () => void }) {
  const { t, lang } = useLang();
  // A heart fills in the colour of the memory it belongs to, so the response
  // reads as part of that dream rather than a generic app control.
  const heartColor = accent ?? REACTION_COLOR.love;
  const [rows, setRows] = useState<Reaction[] | null>(null);
  const [draft, setDraft] = useState("");
  const [kind, setKind] = useState<TextKind>("comment");
  const [busy, setBusy] = useState(false);
  // The id of my response being rewritten, if any. The composer is reused for
  // it — same box, same button — so editing feels like writing, not like a mode.
  const [editing, setEditing] = useState<string | null>(null);
  const draftRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    listReactions(entryId).then(setRows).catch(() => setRows([]));
  }, [entryId]);

  // The box grows with the words in it, up to five lines, then scrolls. A long
  // thought in a single fixed line disappears as it is being written.
  useLayoutEffect(() => {
    const el = draftRef.current;
    if (!el) return;
    el.style.height = "auto";
    const cs = getComputedStyle(el);
    const line = parseFloat(cs.lineHeight) || 20;
    const pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    const min = line + pad;
    const max = line * 5 + pad;
    el.style.height = `${Math.min(max, Math.max(min, el.scrollHeight))}px`;
    el.style.overflowY = el.scrollHeight > max ? "auto" : "hidden";
  }, [draft]);

  const loved = (rows ?? []).some((r) => r.kind === "love" && r.mine);
  const loves = (rows ?? []).filter((r) => r.kind === "love").length;
  // One thread, oldest first, whichever way each person chose to answer.
  const said = (rows ?? [])
    .filter((r): r is Reaction & { kind: TextKind } => (TEXT_KINDS as readonly string[]).includes(r.kind))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  const send = async (kind: ReactionKind, body = "") => {
    if (busy) return;
    setBusy(true);
    // Rewriting something already said: same composer, different destination.
    if (editing && kind !== "love") {
      try {
        await editReaction(editing, body);
        setRows(await listReactions(entryId));
        onChanged?.();
      } catch {
        setRows(await listReactions(entryId).catch(() => rows ?? []));
      }
      setEditing(null);
      setDraft("");
      setBusy(false);
      return;
    }
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
        {TEXT_KINDS.map((k) => {
          const n = said.filter((r) => r.kind === k).length;
          // Lit when the kind holds something, and also while you are writing one
          // — so choosing "sync" below turns the sync icon up here orange, and it
          // is obvious which of the three you are about to send.
          const lit = n > 0 || kind === k;
          return (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 7 }} title={t(`rx.${k}`)}>
              <ReactionIcon kind={k} size={22} color={lit ? REACTION_COLOR[k] : p.subtext} />
              {n > 0 && (
                <span style={{ fontSize: 13.5, fontWeight: 700, color: REACTION_COLOR[k], fontVariantNumeric: "tabular-nums" }}>{n}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* What people said */}
      {said.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          {said.map((r) => (
            <div key={r.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", flex: "0 0 auto", background: "linear-gradient(135deg,#6E8BFF,#9A6CFF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff" }}>
                {initialsFrom(r.author_name, r.author_name ?? "?")}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: p.text }}>{r.author_name ?? t("rx.someone")}</span>
                <span style={{ fontSize: 13, color: p.text, opacity: 0.86 }}> {r.body}</span>
                {/* What I said stays mine to change or take back */}
                {r.mine && (
                  <span style={{ display: "inline-flex", gap: 4, marginInlineStart: 8, verticalAlign: "middle" }}>
                    <button
                      onClick={() => { setEditing(r.id); setKind(r.kind as TextKind); setDraft(r.body); draftRef.current?.focus(); }}
                      aria-label={t("rx.edit")}
                      style={{ width: 24, height: 24, borderRadius: 8, border: "none", background: "rgba(255,255,255,0.07)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={p.subtext} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
                    </button>
                    <button
                      onClick={async () => {
                        if (busy) return;
                        setBusy(true);
                        // Vanishes immediately; the network catches up behind it.
                        setRows((prev) => prev?.filter((x) => x.id !== r.id) ?? prev);
                        if (editing === r.id) { setEditing(null); setDraft(""); }
                        try { await deleteReaction(r.id); onChanged?.(); } catch { /* restored below */ }
                        setRows(await listReactions(entryId).catch(() => rows ?? []));
                        setBusy(false);
                      }}
                      aria-label={t("rx.delete")}
                      style={{ width: 24, height: 24, borderRadius: 8, border: "none", background: "rgba(232,124,124,0.1)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#E8A0A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg>
                    </button>
                  </span>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
                  {/* Which kind of answer this was, said quietly rather than as a badge */}
                  <ReactionIcon kind={r.kind} size={11} color={REACTION_COLOR[r.kind]} />
                  <span style={{ fontSize: 10.5, color: REACTION_COLOR[r.kind], fontWeight: 600 }}>{t(`rx.${r.kind}`)}</span>
                  <span style={{ fontSize: 10.5, color: p.subtext }}>·</span>
                  <span style={{ fontSize: 10.5, color: p.subtext }}>
                    {new Date(r.created_at).toLocaleDateString(lang === "en" ? "en-US" : "he-IL", { day: "numeric", month: "short" })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Always open, so replying is one tap */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {/* Which kind of answer this is. Picking one only changes its colour and
            what the box asks you — the reply itself works the same either way. */}
        <div style={{ display: "flex", gap: 7 }}>
          {TEXT_KINDS.map((k) => {
            const on = kind === k;
            const c = REACTION_COLOR[k];
            return (
              <button
                key={k}
                onClick={() => setKind(k)}
                aria-pressed={on}
                style={{
                  display: "flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 999,
                  cursor: "pointer", font: "inherit", fontSize: 12, fontWeight: 700,
                  background: on ? `${c}26` : "transparent",
                  border: `1px solid ${on ? c : p.cardBorder}`,
                  color: on ? c : p.subtext,
                }}
              >
                <ReactionIcon kind={k} size={13} color={on ? c : p.subtext} />
                {t(`rx.${k}`)}
              </button>
            );
          })}
        </div>
        {editing && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: REACTION_COLOR[kind] }}>
            <span>{t("rx.editing")}</span>
            <button
              onClick={() => { setEditing(null); setDraft(""); }}
              style={{ border: "none", background: "transparent", color: p.subtext, cursor: "pointer", font: "inherit", fontSize: 11.5, textDecoration: "underline", padding: 0 }}
            >
              {t("rx.cancel")}
            </button>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
          <textarea
            ref={draftRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends; Shift+Enter makes a line. On phones the keyboard
              // has no such distinction and the send button does the work.
              if (e.key === "Enter" && !e.shiftKey && draft.trim()) { e.preventDefault(); send(kind, draft.trim()); }
            }}
            placeholder={t(`rx.${kind}.ask`)}
            rows={1}
            style={{ flex: 1, minWidth: 0, padding: "11px 14px", borderRadius: 18, background: p.cardBg, border: `1px solid ${editing ? REACTION_COLOR[kind] : p.cardBorder}`, color: p.text, fontSize: 13.5, lineHeight: 1.45, font: "inherit", outline: "none", resize: "none", overflowY: "hidden" }}
          />
          {draft.trim() && (
            <button
              onClick={() => send(kind, draft.trim())}
              disabled={busy}
              style={{ flex: "0 0 auto", padding: "0 16px", height: 42, borderRadius: 999, border: "none", cursor: "pointer", background: REACTION_COLOR[kind], color: "#15112B", fontSize: 13.5, fontWeight: 700, font: "inherit" }}
            >
              {busy ? t("rx.sending") : editing ? t("rx.update") : t("rx.send")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
