"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import StarField from "@/components/StarField";
import DiaryHex from "@/components/DiaryHex";
import { theme } from "@/lib/theme";
import { DIARY_MAP, diaryStyle } from "@/lib/diary";
import { getEntry, getAttachmentUrl, deleteEntry, setEntrySharing, DbEntry } from "@/lib/supabase/data";
import { rgba } from "@/lib/color";
import { useLang } from "@/lib/i18n";

const p = theme;
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|avif|heic)$/i;

export default function EntryPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { t, lang } = useLang();
  const [e, setEntry] = useState<DbEntry | null | undefined>(undefined);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  const onDelete = async () => {
    if (deleting) return;
    if (!window.confirm(t("se.deleteConfirm"))) return;
    setDeleting(true);
    try {
      await deleteEntry(params.id);
      router.push("/journals");
      router.refresh();
    } catch {
      setDeleting(false);
    }
  };

  const shareLink = () => `${window.location.origin}/d/${params.id}`;

  const onShare = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const updated = await setEntrySharing(params.id, { shared: true, anonymous: false });
      setEntry(updated);
    } finally {
      setSharing(false);
    }
  };

  const onUnshare = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const updated = await setEntrySharing(params.id, { shared: false, anonymous: false });
      setEntry(updated);
    } finally {
      setSharing(false);
    }
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareLink());
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard blocked — ignore */ }
  };

  const onWhatsApp = () => {
    const text = `${t("share.waText")} ${e?.title ?? ""}\n${shareLink()}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  useEffect(() => {
    let alive = true;
    getEntry(params.id).then((row) => {
      if (!alive) return;
      setEntry(row);
      if (row?.media_url) getAttachmentUrl(row.media_url).then((url) => { if (alive) setMediaUrl(url); });
    });
    return () => { alive = false; };
  }, [params.id]);

  if (e === undefined) {
    return <main style={{ position: "relative", minHeight: "100svh", background: p.bg }} />;
  }

  if (!e) {
    return (
      <main style={{ position: "relative", minHeight: "100svh", background: p.bg, color: p.text, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24 }}>
        <StarField count={50} color={p.starColor} />
        <div style={{ position: "relative", fontSize: 17, fontWeight: 600 }}>{t("se.notFound")}</div>
        <Link href="/journals" style={{ position: "relative", color: "#BFD3FF", fontSize: 14 }}>{t("se.back")}</Link>
      </main>
    );
  }

  const d = DIARY_MAP[e.type];
  const s = diaryStyle(d.color);
  const dateStr = new Date(e.created_at).toLocaleDateString(lang === "en" ? "en-US" : "he-IL", { day: "numeric", month: "long", year: "numeric" });
  const timeStr = new Date(e.created_at).toLocaleTimeString(lang === "en" ? "en-US" : "he-IL", { hour: "2-digit", minute: "2-digit" });
  const isImage = e.media_url ? IMAGE_EXT.test(e.media_url) : false;
  const fileName = e.media_url ? e.media_url.split("/").pop() : null;

  return (
    <main style={{ position: "relative", minHeight: "100svh", overflow: "hidden", background: p.bg, color: p.text }}>
      <StarField count={60} color={p.starColor} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 210, background: s.topGlow, pointerEvents: "none" }} />

      <div style={{ position: "relative", padding: "18px 18px 40px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
          <Link href="/journals" style={{ width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: p.cardBg, border: `1px solid ${p.cardBorder}`, flex: "0 0 auto" }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={p.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 6 15 12 9 18" /></svg>
          </Link>
          <DiaryHex color={d.color} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: p.subtext }}>{t("se.journal")} {t(`diary.${e.type}`)}</div>
            <div style={{ fontSize: 12, color: p.subtext, marginTop: 1 }}>{dateStr} · {timeStr}</div>
          </div>
        </div>

        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.3px", lineHeight: 1.2 }}>{e.title}</div>

        {e.body && (
          <div style={{ padding: "16px 16px", borderRadius: 16, background: p.cardBg, border: `1px solid ${p.cardBorder}`, fontSize: 15, lineHeight: 1.75, color: "rgba(233,236,255,0.9)", whiteSpace: "pre-wrap" }}>{e.body}</div>
        )}

        {e.media_url && (
          isImage && mediaUrl ? (
            <a href={mediaUrl} target="_blank" rel="noreferrer" style={{ display: "block", borderRadius: 16, overflow: "hidden", border: `1px solid ${p.cardBorder}` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediaUrl} alt={fileName ?? ""} style={{ width: "100%", display: "block", maxHeight: 320, objectFit: "cover" }} />
            </a>
          ) : (
            <a href={mediaUrl ?? "#"} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 15px", borderRadius: 14, background: p.cardBg, border: `1px solid ${p.cardBorder}`, textDecoration: "none", color: "inherit" }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: s.chipBg, flex: "0 0 auto" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={s.nameColor} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
              </div>
              <div style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{fileName}</div>
            </a>
          )
        )}

        {e.type === "dream" && e.lucidity && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 15px", borderRadius: 14, background: s.chipBg, border: `1px solid ${s.bord}` }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: d.color, boxShadow: `0 0 7px ${d.color}` }} />
            <span style={{ fontSize: 13.5, fontWeight: 500, color: p.subtext }}>{t("ef.lucidity")}</span>
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: s.nameColor, fontVariantNumeric: "tabular-nums" }}>{e.lucidity} / 10</span>
          </div>
        )}

        {/* Sharing */}
        {e.visibility === "public" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "14px 15px", borderRadius: 16, background: "rgba(127,214,162,0.08)", border: "1px solid rgba(127,214,162,0.28)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7FD6A2" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" /></svg>
              <span style={{ flex: 1, fontSize: 12.5, color: "rgba(233,236,255,0.75)" }}>{t("share.publicNote")}</span>
            </div>
            <div style={{ display: "flex", gap: 9 }}>
              <button onClick={onWhatsApp} style={{ flex: 1, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, background: "rgba(37,211,102,0.16)", border: "1px solid rgba(37,211,102,0.4)", cursor: "pointer" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366"><path d="M17.5 14.4c-.3-.2-1.7-.9-2-1-.3-.1-.5-.2-.7.2s-.8 1-.9 1.1c-.2.2-.3.2-.6.1-.3-.2-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.5-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5s-.7-1.6-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3z" /><path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.8 4.9-1.3A10 10 0 1 0 12 2zm0 18.3c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.3 8.3 0 1 1 12 20.3z" /></svg>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#8FE7B0" }}>{t("share.whatsapp")}</span>
              </button>
              <button onClick={onCopy} style={{ flex: "0 0 auto", height: 44, padding: "0 15px", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, background: p.cardBg, border: `1px solid ${p.cardBorder}`, cursor: "pointer" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={p.text} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: p.text }}>{copied ? t("share.copied") : t("share.copyLink")}</span>
              </button>
            </div>
            <button onClick={onUnshare} disabled={sharing} style={{ alignSelf: "flex-start", fontSize: 12, fontWeight: 600, color: "rgba(240,164,164,0.9)", background: "transparent", border: "none", cursor: sharing ? "default" : "pointer", padding: "2px 0" }}>{t("share.unshare")}</button>
          </div>
        ) : (
          <button onClick={onShare} disabled={sharing} style={{ width: "100%", height: 48, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "rgba(127,214,162,0.1)", border: "1px solid rgba(127,214,162,0.3)", cursor: sharing ? "default" : "pointer", opacity: sharing ? 0.6 : 1 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7FD6A2" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" /></svg>
            <span style={{ fontSize: 14.5, fontWeight: 700, color: "#8FE7B0" }}>{t("share.shareBtn")}</span>
          </button>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <Link href={`/entry/${e.id}/edit`} style={{ flex: 1, height: 50, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, textDecoration: "none", background: `linear-gradient(135deg, ${p.fabFrom}, ${p.fabTo})`, boxShadow: `0 10px 26px ${rgba(p.fabFrom, 0.4)}` }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
            <span style={{ fontSize: 14.5, fontWeight: 700, color: "#fff" }}>{t("se.edit")}</span>
          </Link>
          <button onClick={onDelete} disabled={deleting} style={{ flex: "0 0 auto", minWidth: 48, height: 50, padding: "0 14px", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, background: "rgba(232,124,124,0.1)", border: "1px solid rgba(232,124,124,0.26)", cursor: deleting ? "default" : "pointer", opacity: deleting ? 0.6 : 1 }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#F0A4A4" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
            {deleting && <span style={{ fontSize: 13, color: "#F0B4B4" }}>{t("se.deleting")}</span>}
          </button>
        </div>
      </div>
    </main>
  );
}
