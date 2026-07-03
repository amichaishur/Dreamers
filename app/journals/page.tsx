"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import StarField from "@/components/StarField";
import DiaryHex from "@/components/DiaryHex";
import BottomNav from "@/components/BottomNav";
import { theme } from "@/lib/theme";
import { DIARIES, DIARY_MAP, diaryStyle, DiaryKey } from "@/lib/diary";
import { useLang } from "@/lib/i18n";
import { listEntries, listSharedEntries, DbEntry, SharedEntry } from "@/lib/supabase/data";
import { initialsFrom } from "@/lib/format";

const p = theme;
type View = "mine" | "community";

export default function JournalsPage() {
  const [view, setView] = useState<View>("mine");
  const [filter, setFilter] = useState<DiaryKey | "all">("all");
  const [mine, setMine] = useState<DbEntry[] | null>(null);
  const [community, setCommunity] = useState<SharedEntry[] | null>(null);
  const { t, lang } = useLang();

  useEffect(() => {
    let alive = true;
    listEntries().then((rows) => { if (alive) setMine(rows); }).catch(() => { if (alive) setMine([]); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (view !== "community" || community !== null) return;
    let alive = true;
    listSharedEntries().then((rows) => { if (alive) setCommunity(rows); }).catch(() => { if (alive) setCommunity([]); });
    return () => { alive = false; };
  }, [view, community]);

  const seg = (active: boolean): React.CSSProperties => ({
    flex: 1, textAlign: "center", padding: 9, borderRadius: 10, fontSize: 13.5, fontWeight: active ? 700 : 500,
    border: "none", cursor: "pointer",
    background: active ? "linear-gradient(135deg,#6E8BFF,#9A6CFF)" : "transparent",
    color: active ? "#fff" : p.subtext,
  });

  const chip = (active: boolean, color?: string): React.CSSProperties => ({
    display: "flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: 999, fontSize: 13, fontWeight: 600,
    whiteSpace: "nowrap", cursor: "pointer", flex: "0 0 auto",
    border: `1px solid ${active ? (color ? diaryStyle(color).bordStrong : "rgba(191,211,255,0.5)") : p.cardBorder}`,
    background: active ? (color ? diaryStyle(color).chipBg : "rgba(191,211,255,0.14)") : p.cardBg,
    color: active ? (color ? diaryStyle(color).nameColor : "#BFD3FF") : p.subtext,
  });

  const mineList = (mine ?? []).filter((e) => filter === "all" || e.type === filter);
  const commList = (community ?? []).filter((e) => filter === "all" || e.type === filter);
  const loading = view === "mine" ? mine === null : community === null;

  return (
    <main style={{ position: "relative", minHeight: "100svh", overflow: "hidden", background: p.bg, color: p.text }}>
      <StarField count={70} color={p.starColor} />

      <div style={{ position: "relative", padding: "26px 18px 96px" }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.3px" }}>{t("jr.title")}</div>
          <div style={{ fontSize: 12.5, color: p.subtext, marginTop: 3 }}>{t("jr.sub")}</div>
        </div>

        {/* Mine / Community */}
        <div style={{ display: "flex", gap: 6, padding: 4, borderRadius: 13, background: "rgba(0,0,0,0.25)", marginBottom: 14 }}>
          <button onClick={() => setView("mine")} style={seg(view === "mine")}>{t("jr.mine")}</button>
          <button onClick={() => setView("community")} style={seg(view === "community")}>{t("jr.community")}</button>
        </div>

        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 16 }}>
          <button onClick={() => setFilter("all")} style={chip(filter === "all")}>{t("jr.all")}</button>
          {DIARIES.map((d) => (
            <button key={d.key} onClick={() => setFilter(d.key)} style={chip(filter === d.key, d.color)}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: d.color, boxShadow: `0 0 6px ${d.color}` }} />
              {t(`diary.${d.key}`)}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {view === "mine" && mineList.map((e) => {
            const d = DIARY_MAP[e.type];
            const time = new Date(e.created_at).toLocaleTimeString(lang === "en" ? "en-US" : "he-IL", { hour: "2-digit", minute: "2-digit" });
            return (
              <Link key={e.id} href={`/entry/${e.id}`} style={{ display: "flex", alignItems: "center", gap: 12, background: p.cardBg, border: `1px solid ${p.cardBorder}`, borderRadius: 15, padding: "12px 14px", textDecoration: "none", color: "inherit" }}>
                <DiaryHex color={d.color} w={26} h={28} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.title}</div>
                  <div style={{ fontSize: 11.5, color: p.subtext, marginTop: 2 }}>{t(`diary.${e.type}`)}{e.visibility === "public" ? " · " + t("jr.community") : ""}</div>
                </div>
                <div style={{ fontSize: 11.5, color: p.subtext, fontVariantNumeric: "tabular-nums" }}>{time}</div>
              </Link>
            );
          })}

          {view === "community" && commList.map((e) => {
            const d = DIARY_MAP[e.type];
            const name = e.author_name;
            const byline = name ? `${t("jr.by")} ${name}` : t("jr.byAnon");
            const avatarInitials = name ? initialsFrom(name) : "•";
            const time = new Date(e.created_at).toLocaleTimeString(lang === "en" ? "en-US" : "he-IL", { hour: "2-digit", minute: "2-digit" });
            return (
              <Link key={e.id} href={`/d/${e.id}`} style={{ display: "flex", alignItems: "center", gap: 12, background: p.cardBg, border: `1px solid ${p.cardBorder}`, borderRadius: 15, padding: "12px 14px", textDecoration: "none", color: "inherit" }}>
                <DiaryHex color={d.color} w={26} h={28} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.title}</div>
                  <div style={{ fontSize: 11.5, color: p.subtext, marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 16, height: 16, borderRadius: "50%", flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8.5, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg,#6E8BFF,#9A6CFF)" }}>{avatarInitials}</span>
                    <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{byline}</span>
                  </div>
                </div>
                <div style={{ fontSize: 11.5, color: p.subtext, fontVariantNumeric: "tabular-nums", flex: "0 0 auto" }}>{time}</div>
              </Link>
            );
          })}

          {!loading && view === "mine" && mineList.length === 0 && (
            <div style={{ textAlign: "center", color: p.subtext, fontSize: 13.5, padding: "40px 0" }}>{t("jr.empty")}</div>
          )}
          {!loading && view === "community" && commList.length === 0 && (
            <div style={{ textAlign: "center", color: p.subtext, fontSize: 13.5, padding: "40px 0" }}>{t("jr.communityEmpty")}</div>
          )}
        </div>
      </div>

      <BottomNav active="journals" />
    </main>
  );
}
