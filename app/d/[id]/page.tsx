"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import StarField from "@/components/StarField";
import DiaryHex from "@/components/DiaryHex";
import { theme } from "@/lib/theme";
import { DIARY_MAP, diaryStyle } from "@/lib/diary";
import { getSharedEntry, SharedEntry } from "@/lib/supabase/data";
import { initialsFrom } from "@/lib/format";
import { useLang } from "@/lib/i18n";

const p = theme;

function Wordmark() {
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.3px", lineHeight: 1, direction: "ltr" }}>Dreamers</div>
      <svg viewBox="0 0 210 26" style={{ display: "block", width: "128px", height: "auto", marginTop: 2, overflow: "visible" }}>
        <defs>
          <linearGradient id="dsus" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#5BC8FF" />
            <stop offset="1" stopColor="#9A6CFF" />
          </linearGradient>
        </defs>
        <path d="M6 14 C 55 3, 135 3, 186 11" fill="none" stroke="url(#dsus)" strokeWidth="3.6" strokeLinecap="round" style={{ filter: "drop-shadow(0 0 5px rgba(140,160,255,0.7))" }} />
        <circle cx="196" cy="11" r="5.4" fill="#C9A9FF" style={{ filter: "drop-shadow(0 0 5px rgba(201,169,255,0.9))" }} />
        <circle cx="196" cy="11" r="2.6" fill="#fff" />
      </svg>
    </div>
  );
}

export default function SharedDreamPage() {
  const params = useParams<{ id: string }>();
  const { t, lang } = useLang();
  const [e, setE] = useState<SharedEntry | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    getSharedEntry(params.id).then((row) => { if (alive) setE(row); });
    return () => { alive = false; };
  }, [params.id]);

  if (e === undefined) {
    return <main style={{ minHeight: "100svh", background: p.bg, color: p.text, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{t("se.loading")}</main>;
  }

  if (!e) {
    return (
      <main style={{ position: "relative", minHeight: "100svh", background: p.bg, color: p.text, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: 24 }}>
        <StarField count={50} color={p.starColor} />
        <div style={{ position: "relative" }}><Wordmark /></div>
        <div style={{ position: "relative", fontSize: 15.5, fontWeight: 600, textAlign: "center", maxWidth: 300 }}>{t("sd.notFound")}</div>
        <Link href="/welcome" style={{ position: "relative", color: "#BFD3FF", fontSize: 14 }}>{t("sd.join")}</Link>
      </main>
    );
  }

  const d = DIARY_MAP[e.type];
  const s = diaryStyle(d.color);
  const dateStr = new Date(e.created_at).toLocaleDateString(lang === "en" ? "en-US" : "he-IL", { day: "numeric", month: "long", year: "numeric" });
  const timeStr = new Date(e.created_at).toLocaleTimeString(lang === "en" ? "en-US" : "he-IL", { hour: "2-digit", minute: "2-digit" });
  const name = e.author_name;
  const authorLabel = name ? name : t("sd.anonymous");
  const authorInitials = name ? initialsFrom(name) : "•";

  return (
    <main style={{ position: "relative", minHeight: "100svh", overflow: "hidden", background: p.bg, color: p.text }}>
      <StarField count={70} color={p.starColor} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 220, background: s.topGlow, pointerEvents: "none" }} />

      <div style={{ position: "relative", padding: "22px 18px 40px", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* brand */}
        <div style={{ display: "flex", justifyContent: "center", paddingBottom: 4 }}><Wordmark /></div>

        {/* author */}
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div style={{ width: 40, height: 40, flex: "0 0 auto", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg,#6E8BFF,#9A6CFF)" }}>{authorInitials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11.5, color: p.subtext }}>{t("sd.sharedBy")}</div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{authorLabel}</div>
          </div>
          <DiaryHex color={d.color} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: s.nameColor, background: s.chipBg, border: `1px solid ${s.bord}`, padding: "3px 10px", borderRadius: 999 }}>{t(`diary.${e.type}`)}</span>
          <span style={{ fontSize: 12, color: p.subtext }}>{dateStr} · {timeStr}</span>
        </div>

        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.3px", lineHeight: 1.2 }}>{e.title}</div>

        {e.body && (
          <div style={{ padding: "16px 16px", borderRadius: 16, background: p.cardBg, border: `1px solid ${p.cardBorder}`, fontSize: 15, lineHeight: 1.75, color: "rgba(233,236,255,0.9)", whiteSpace: "pre-wrap" }}>{e.body}</div>
        )}

        {e.shared_media_url && (
          <div style={{ borderRadius: 16, overflow: "hidden", border: `1px solid ${p.cardBorder}` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={e.shared_media_url} alt={e.title} style={{ width: "100%", display: "block", maxHeight: 360, objectFit: "cover" }} />
          </div>
        )}

        {e.type === "dream" && e.lucidity && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 15px", borderRadius: 14, background: s.chipBg, border: `1px solid ${s.bord}` }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: d.color, boxShadow: `0 0 7px ${d.color}` }} />
            <span style={{ fontSize: 13.5, fontWeight: 500, color: p.subtext }}>{t("ef.lucidity")}</span>
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: s.nameColor, fontVariantNumeric: "tabular-nums" }}>{e.lucidity} / 10</span>
          </div>
        )}

        {/* CTA */}
        <Link href="/welcome" style={{ marginTop: 6, height: 52, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 9, textDecoration: "none", background: `linear-gradient(135deg, ${p.fabFrom}, ${p.fabTo})`, boxShadow: `0 12px 30px ${p.fabFrom}66` }}>
          <span style={{ fontSize: 15.5, fontWeight: 700, color: "#fff" }}>{t("sd.join")}</span>
        </Link>
        <div style={{ textAlign: "center", fontSize: 12, color: p.subtext }}>{t("sd.brand")}</div>
      </div>
    </main>
  );
}
