"use client";

import { useRef, useState } from "react";
import StarField from "@/components/StarField";
import DiaryHex from "@/components/DiaryHex";
import { theme } from "@/lib/theme";
import { DIARY_MAP, diaryStyle, DiaryKey } from "@/lib/diary";
import { useLang } from "@/lib/i18n";
import { Lucidity } from "@/lib/supabase/data";

const p = theme;

export type EntryFormValues = {
  title: string;
  body: string;
  lucidity: Lucidity;
  file: File | null;
  removeExisting: boolean;
  shared: boolean;
  anonymous: boolean;
  createdAt: string; // ISO, editable (defaults to now)
};

function pad(n: number) { return String(n).padStart(2, "0"); }
function toDateStr(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function toTimeStr(d: Date) { return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }

export default function EntryForm({
  diaryKey,
  initial,
  existingMediaName,
  headerKey,
  submitKey,
  onBack,
  onSubmit,
}: {
  diaryKey: DiaryKey;
  initial?: { title?: string; body?: string; lucidity?: Lucidity | null; shared?: boolean; anonymous?: boolean; createdAt?: string };
  existingMediaName?: string | null;
  headerKey: string; // e.g. "ef.newIn" or "ef.editIn"
  submitKey: string; // e.g. "ef.add" or "ef.save"
  onBack: () => void;
  onSubmit: (values: EntryFormValues) => Promise<void>;
}) {
  const { t } = useLang();
  const d = DIARY_MAP[diaryKey];
  const s = diaryStyle(d.color);
  const isDream = diaryKey === "dream";

  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [lucidity, setLucidity] = useState<Lucidity>(initial?.lucidity ?? "5");
  const [file, setFile] = useState<File | null>(null);
  const [removeExisting, setRemoveExisting] = useState(false);
  const [shared, setShared] = useState(initial?.shared ?? false);
  const [anonymous, setAnonymous] = useState(initial?.anonymous ?? false);
  const initDate = initial?.createdAt ? new Date(initial.createdAt) : new Date();
  const [dateStr, setDateStr] = useState(toDateStr(initDate));
  const [timeStr, setTimeStr] = useState(toTimeStr(initDate));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const dateRef = useRef<HTMLInputElement>(null);
  const timeRef = useRef<HTMLInputElement>(null);
  const openPicker = (r: React.RefObject<HTMLInputElement | null>) => {
    try { r.current?.showPicker(); } catch { r.current?.focus(); }
  };

  const field: React.CSSProperties = { padding: "13px 15px", borderRadius: 14, background: p.cardBg, border: `1px solid ${p.cardBorder}`, fontSize: 14.5, color: p.text, width: "100%", font: "inherit" };
  const label: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, color: p.subtext };
  const chip = (on: boolean): React.CSSProperties => ({ flex: 1, textAlign: "center", padding: 11, borderRadius: 13, fontSize: 13, fontWeight: on ? 700 : 500, background: on ? s.chipBg : p.cardBg, border: `1px solid ${on ? s.bordStrong : p.cardBorder}`, color: on ? s.nameColor : p.subtext, cursor: "pointer" });

  const showExisting = !!existingMediaName && !removeExisting && !file;
  const attachLabel = file ? file.name : showExisting ? existingMediaName! : t("ef.attachFile");

  const submit = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    setError("");
    const createdAt = new Date(`${dateStr}T${timeStr || "00:00"}`).toISOString();
    try {
      await onSubmit({ title: title.trim(), body: body.trim(), lucidity, file, removeExisting, shared, anonymous, createdAt });
    } catch {
      setError(t("ef.error"));
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "relative", minHeight: "100svh", overflow: "hidden", background: p.bg, color: p.text }}>
      <StarField count={60} color={p.starColor} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 200, background: s.topGlow, pointerEvents: "none" }} />

      <div style={{ position: "relative", minHeight: "100svh", display: "flex", flexDirection: "column", padding: "18px 18px 26px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 13, flex: "0 0 auto" }}>
          <button onClick={onBack} style={{ width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: p.cardBg, border: `1px solid ${p.cardBorder}`, flex: "0 0 auto", cursor: "pointer" }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={p.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 6 15 12 9 18" /></svg>
          </button>
          <DiaryHex color={d.color} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: p.subtext }}>{t(headerKey)}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.nameColor, lineHeight: 1.1, marginTop: 1 }}>{t(`diary.${diaryKey}`)}</div>
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 10, marginTop: 12, minHeight: 0 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={label}>{t("ef.name")}</div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("ef.namePh")} style={field} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={label}>{t("ef.detail")}</div>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder={t("ef.detailPh")} style={{ ...field, height: 70, fontSize: 14, lineHeight: 1.5, resize: "none" }} />
          </div>

          {isDream && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={label}>{t("ef.lucidity")}</div>
                <div style={{ fontSize: 10.5, color: s.nameColor, background: s.chipBg, border: `1px solid ${s.bord}`, padding: "1px 8px", borderRadius: 999 }}>{t("ef.forDreams")}</div>
                <span style={{ flex: 1 }} />
                <span style={{ fontSize: 22, fontWeight: 800, color: s.nameColor, fontVariantNumeric: "tabular-nums" }}>{Number(lucidity) || 0}<span style={{ fontSize: 12.5, fontWeight: 500, color: p.subtext }}> / 10</span></span>
              </div>
              <input type="range" min={0} max={10} step={1} value={Number(lucidity) || 0} onChange={(e) => setLucidity(e.target.value)} dir="rtl" style={{ width: "100%", accentColor: d.color, height: 6 }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: p.subtext }}>
                <span>{t("luc.scale0")}</span>
                <span>{t("luc.scale10")}</span>
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={label}>{t("ef.attach")}</div>
            <label style={{ display: "flex", alignItems: "center", gap: 13, padding: "13px 15px", borderRadius: 14, border: `1px dashed ${s.bordStrong}`, background: p.cardBg, cursor: "pointer" }}>
              <input type="file" accept="image/*,video/*,audio/*,.pdf,.doc,.docx" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setRemoveExisting(false); }} style={{ display: "none" }} />
              <div style={{ width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: s.chipBg, flex: "0 0 auto" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={s.nameColor} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16 V5" /><path d="M7.5 9.5 L12 5 l4.5 4.5" /><path d="M5 16 v2.5 a1.5 1.5 0 0 0 1.5 1.5 h11 a1.5 1.5 0 0 0 1.5 -1.5 V16" /></svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: p.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{attachLabel}</div>
                <div style={{ fontSize: 11.5, color: p.subtext, marginTop: 2 }}>{t("ef.attachSub")}</div>
              </div>
              {(file || showExisting) && (
                <button type="button" onClick={(e) => { e.preventDefault(); if (file) setFile(null); else setRemoveExisting(true); }} style={{ flex: "0 0 auto", fontSize: 11.5, fontWeight: 600, color: "#F0A4A4", background: "transparent", border: "none", cursor: "pointer" }}>{t("ef.remove")}</button>
              )}
            </label>
          </div>

          {/* Editable date + time (defaults to now, can log past entries) */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={label}>{t("ef.when")}</div>
            <div style={{ padding: "12px 14px", borderRadius: 14, background: p.cardBg, border: `1px solid ${p.cardBorder}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={s.nameColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "0 0 auto" }}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: p.text }}>{t("ef.whenTitle")}</div>
                  <div style={{ fontSize: 11.5, color: p.subtext, marginTop: 1 }}>{t("ef.whenSub")}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 9, marginTop: 11 }}>
                <div onClick={() => openPicker(dateRef)} style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 9, padding: "12px 14px", borderRadius: 14, background: p.cardBg, border: `1px solid ${p.cardBorder}`, cursor: "pointer" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={s.nameColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "0 0 auto" }}><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                  <input ref={dateRef} className="dt-native" type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} dir="ltr" style={{ flex: "0 0 auto", width: "auto", background: "transparent", border: "none", outline: "none", color: p.text, fontSize: 14, font: "inherit", padding: 0, colorScheme: "dark", textAlign: "right" }} />
                </div>
                <div onClick={() => openPicker(timeRef)} style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 9, padding: "12px 14px", borderRadius: 14, background: p.cardBg, border: `1px solid ${p.cardBorder}`, cursor: "pointer" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={s.nameColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "0 0 auto" }}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                  <input ref={timeRef} className="dt-native" type="time" value={timeStr} onChange={(e) => setTimeStr(e.target.value)} dir="ltr" style={{ flex: "0 0 auto", width: "auto", background: "transparent", border: "none", outline: "none", color: p.text, fontSize: 14, font: "inherit", padding: 0, colorScheme: "dark" }} />
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={label}>{t("share.title")}</div>
            <div style={{ display: "flex", gap: 9 }}>
              <button style={chip(!shared)} onClick={() => setShared(false)}>{t("share.keepPrivate")}</button>
              <button style={chip(shared)} onClick={() => setShared(true)}>{t("share.toCommunity")}</button>
            </div>
            {shared && (
              <div style={{ display: "flex", gap: 9 }}>
                <button style={chip(!anonymous)} onClick={() => setAnonymous(false)}>{t("share.withName")}</button>
                <button style={chip(anonymous)} onClick={() => setAnonymous(true)}>{t("share.anonymous")}</button>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: p.subtext }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={p.subtext} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "0 0 auto" }}>
                {shared
                  ? <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" /></>
                  : <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>}
              </svg>
              <span>{shared ? t("share.publicNote") : t(`ef.pn.${diaryKey}`)}</span>
            </div>
          </div>

          {error && <div style={{ fontSize: 12.5, color: "#F0A4A4", textAlign: "center" }}>{error}</div>}
        </div>

        <button onClick={submit} disabled={!title.trim() || saving} style={{ flex: "0 0 auto", marginTop: 11, padding: 14, borderRadius: 16, textAlign: "center", fontSize: 15.5, fontWeight: 700, color: "#fff", border: "none", cursor: !title.trim() || saving ? "default" : "pointer", opacity: !title.trim() || saving ? 0.6 : 1, background: `linear-gradient(135deg, ${p.fabFrom}, ${p.fabTo})`, boxShadow: `0 12px 30px ${p.fabFrom}73` }}>{saving ? t("ef.saving") : t(submitKey)}</button>
      </div>
    </div>
  );
}
