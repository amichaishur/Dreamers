"use client";

import { useEffect, useState } from "react";
import { theme } from "@/lib/theme";
import { useLang } from "@/lib/i18n";
import { listReactions, react, Reaction, ReactionKind } from "@/lib/supabase/data";
import { initialsFrom } from "@/lib/format";

const p = theme;

/** The three kinds you write words with. Love is a separate, wordless tap. */
const WORDED: ReactionKind[] = ["comment", "reflection", "sync"];

export const REACTION_COLOR: Record<ReactionKind, string> = {
  love: "#F08BA8",
  comment: "#9AB6FF",
  reflection: "#B79CEB",
  sync: "#F2C879",
};

export function ReactionIcon({ kind, size = 15, color }: { kind: ReactionKind; size?: number; color?: string }) {
  const c = color ?? REACTION_COLOR[kind];
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: c, strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (kind === "love") return <svg {...common}><path d="M12 20s-7-4.6-7-9.3A3.7 3.7 0 0 1 12 8a3.7 3.7 0 0 1 7 2.7c0 4.7-7 9.3-7 9.3Z" /></svg>;
  if (kind === "comment") return <svg {...common}><path d="M21 12a8 8 0 0 1-8 8H7l-4 3v-6.5A8 8 0 1 1 21 12Z" /></svg>;
  if (kind === "reflection") return <svg {...common}><path d="M12 3v18" /><path d="M8 7 4 12l4 5" /><path d="M16 7l4 5-4 5" /></svg>;
  return <svg {...common}><path d="M4 9a8 8 0 0 1 13.6-4.6L20 7" /><path d="M20 4v3h-3" /><path d="M20 15a8 8 0 0 1-13.6 4.6L4 17" /><path d="M4 20v-3h3" /></svg>;
}

/**
 * How a shared memory is answered: a heart, or words that name what it stirred.
 * Loads on demand so the community list stays light.
 */
export default function Reactions({
  entryId,
  compact = false,
  onChanged,
}: {
  entryId: string;
  compact?: boolean;
  onChanged?: () => void;
}) {
  const { t, lang } = useLang();
  const [rows, setRows] = useState<Reaction[] | null>(null);
  const [writing, setWriting] = useState<ReactionKind | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => { listReactions(entryId).then(setRows).catch(() => setRows([])); };
  useEffect(load, [entryId]);

  const loved = (rows ?? []).some((r) => r.kind === "love" && r.mine);
  const loves = (rows ?? []).filter((r) => r.kind === "love").length;
  const words = (rows ?? []).filter((r) => r.kind !== "love");

  const send = async (kind: ReactionKind, body = "") => {
    if (busy) return;
    setBusy(true);
    try {
      await react(entryId, kind, body);
      const fresh = await listReactions(entryId);
      setRows(fresh);
      onChanged?.();
    } catch { /* the button simply doesn't take */ }
    setWriting(null);
    setDraft("");
    setBusy(false);
  };

  const btn = (on: boolean, c: string): React.CSSProperties => ({
    display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 999,
    background: on ? `${c}22` : p.cardBg, border: `1px solid ${on ? `${c}66` : p.cardBorder}`,
    color: on ? c : p.subtext, font: "inherit", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        <button onClick={() => send("love")} style={btn(loved, REACTION_COLOR.love)} aria-pressed={loved}>
          <ReactionIcon kind="love" color={loved ? REACTION_COLOR.love : p.subtext} />
          {t("rx.love")}{loves > 0 ? ` ${loves}` : ""}
        </button>
        {WORDED.map((k) => (
          <button key={k} onClick={() => setWriting(writing === k ? null : k)} style={btn(writing === k, REACTION_COLOR[k])}>
            <ReactionIcon kind={k} color={writing === k ? REACTION_COLOR[k] : p.subtext} />
            {t(`rx.${k}`)}
          </button>
        ))}
      </div>

      {writing && (
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <div style={{ fontSize: 11.5, color: p.subtext }}>{t(`rx.${writing}.ask`)}</div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t("rx.placeholder")}
            autoFocus
            style={{ width: "100%", height: 64, padding: "11px 13px", borderRadius: 13, background: p.cardBg, border: `1px solid ${p.cardBorder}`, color: p.text, fontSize: 13.5, font: "inherit", lineHeight: 1.5, resize: "none", outline: "none" }}
          />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-start" }}>
            <button
              onClick={() => draft.trim() && send(writing, draft.trim())}
              disabled={!draft.trim() || busy}
              style={{ padding: "8px 18px", borderRadius: 12, border: "none", cursor: draft.trim() ? "pointer" : "default", opacity: draft.trim() ? 1 : 0.5, background: `linear-gradient(135deg, ${p.fabFrom}, ${p.fabTo})`, color: "#fff", fontSize: 13, fontWeight: 700, font: "inherit" }}
            >
              {busy ? t("rx.sending") : t("rx.send")}
            </button>
            <button onClick={() => { setWriting(null); setDraft(""); }} style={{ padding: "8px 14px", borderRadius: 12, border: `1px solid ${p.cardBorder}`, background: "transparent", color: p.subtext, fontSize: 13, cursor: "pointer", font: "inherit" }}>
              {t("rx.cancel")}
            </button>
          </div>
        </div>
      )}

      {!compact && words.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 2 }}>
          {words.map((r) => (
            <div key={r.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", flex: "0 0 auto", background: `${REACTION_COLOR[r.kind]}22`, border: `1px solid ${REACTION_COLOR[r.kind]}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: REACTION_COLOR[r.kind] }}>
                {initialsFrom(r.author_name, r.author_name ?? "?")}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: p.text }}>{r.author_name ?? t("rx.someone")}</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, color: REACTION_COLOR[r.kind], background: `${REACTION_COLOR[r.kind]}1a`, border: `1px solid ${REACTION_COLOR[r.kind]}33`, padding: "1px 7px", borderRadius: 999 }}>
                    <ReactionIcon kind={r.kind} size={10} />
                    {t(`rx.${r.kind}`)}
                  </span>
                  <span style={{ fontSize: 10.5, color: p.subtext }}>
                    {new Date(r.created_at).toLocaleDateString(lang === "en" ? "en-US" : "he-IL", { day: "numeric", month: "short" })}
                  </span>
                </div>
                {r.body && <div style={{ fontSize: 13, color: p.text, opacity: 0.86, marginTop: 3, lineHeight: 1.5 }}>{r.body}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {!compact && rows !== null && words.length === 0 && !writing && (
        <div style={{ fontSize: 11.5, color: p.subtext }}>{t("rx.beFirst")}</div>
      )}
    </div>
  );
}
