"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import StarField from "@/components/StarField";
import DiaryHex from "@/components/DiaryHex";
import BottomNav from "@/components/BottomNav";
import { theme } from "@/lib/theme";
import { DIARY_MAP, diaryStyle, DiaryKey } from "@/lib/diary";
import { useLang } from "@/lib/i18n";
import { listEntries, DbEntry } from "@/lib/supabase/data";

const p = theme;
const KEYS: DiaryKey[] = ["dream", "creation", "idea", "reality", "record"];

export default function JournalTypePage() {
  const params = useParams<{ type: string }>();
  const { t, lang } = useLang();
  const type = (KEYS.includes(params.type as DiaryKey) ? params.type : "dream") as DiaryKey;
  const d = DIARY_MAP[type];
  const s = diaryStyle(d.color);

  const [all, setAll] = useState<DbEntry[] | null>(null);
  useEffect(() => {
    let alive = true;
    listEntries().then((rows) => { if (alive) setAll(rows); }).catch(() => { if (alive) setAll([]); });
    return () => { alive = false; };
  }, []);

  const entries = (all ?? []).filter((e) => e.type === type);

  return (
    <main style={{ position: "relative", minHeight: "100svh", overflow: "hidden", background: p.bg, color: p.text }}>
      <StarField count={70} color={p.starColor} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 210, background: s.topGlow, pointerEvents: "none" }} />

      <div style={{ position: "relative", padding: "22px 18px 96px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 18 }}>
          <Link href="/journals" style={{ width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: p.cardBg, border: `1px solid ${p.cardBorder}`, flex: "0 0 auto" }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={p.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 6 15 12 9 18" /></svg>
          </Link>
          <DiaryHex color={d.color} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.nameColor, lineHeight: 1.1 }}>{t(`jrn.${type}`)}</div>
            <div style={{ fontSize: 12, color: p.subtext, marginTop: 2 }}>{all === null ? "" : `${entries.length} ${t("jr.count")}`}</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {entries.map((e) => {
            const time = new Date(e.created_at).toLocaleTimeString(lang === "en" ? "en-US" : "he-IL", { hour: "2-digit", minute: "2-digit" });
            const date = new Date(e.created_at).toLocaleDateString(lang === "en" ? "en-US" : "he-IL", { day: "numeric", month: "short" });
            return (
              <Link key={e.id} href={`/entry/${e.id}`} style={{ display: "flex", alignItems: "center", gap: 12, background: p.cardBg, border: `1px solid ${p.cardBorder}`, borderRadius: 15, padding: "12px 14px", textDecoration: "none", color: "inherit" }}>
                <DiaryHex color={d.color} w={26} h={28} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.title}</div>
                  <div style={{ fontSize: 11.5, color: p.subtext, marginTop: 2 }}>{date}{e.visibility === "public" ? " · " + t("jr.community") : ""}</div>
                </div>
                <div style={{ fontSize: 11.5, color: p.subtext, fontVariantNumeric: "tabular-nums" }}>{time}</div>
              </Link>
            );
          })}
          {all !== null && entries.length === 0 && (
            <div style={{ textAlign: "center", color: p.subtext, fontSize: 13.5, padding: "44px 0" }}>{t("jr.empty")}</div>
          )}
        </div>
      </div>

      <BottomNav active="journals" />
    </main>
  );
}
