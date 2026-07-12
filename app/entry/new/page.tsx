"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import StarField from "@/components/StarField";
import WeaveSphere from "@/components/WeaveSphere";
import DiaryHex from "@/components/DiaryHex";
import EntryForm from "@/components/EntryForm";
import { theme } from "@/lib/theme";
import { DIARIES, diaryStyle, DiaryKey } from "@/lib/diary";
import { useLang } from "@/lib/i18n";
import { createEntry, listEntries, setEntrySharing } from "@/lib/supabase/data";

const p = theme;

function DiaryPickSheet({ onPick }: { onPick: (k: DiaryKey) => void }) {
  const { t } = useLang();
  return (
    <div style={{ position: "relative", minHeight: "100svh", overflow: "hidden", background: p.bg, color: p.text }}>
      <div style={{ position: "absolute", inset: 0, filter: "blur(3px) brightness(0.5)", transform: "scale(1.04)", pointerEvents: "none" }}>
        <StarField count={70} color={p.starColor} />
        <div style={{ position: "absolute", top: 120, left: 0, right: 0, height: 340, background: p.coreGlow }} />
        <div style={{ position: "absolute", top: 150, left: "50%", transform: "translateX(-50%)", width: 300, height: 300 }}>
          <WeaveSphere dots={p.dots} lineColor={p.lineColor} count={56} frozen />
        </div>
      </div>
      <div style={{ position: "absolute", inset: 0, background: "rgba(4,5,16,0.46)", pointerEvents: "none" }} />

      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "11px 18px 16px", borderRadius: "30px 30px 0 0", background: "linear-gradient(180deg, rgba(26,24,48,0.86), rgba(11,11,26,0.93))", backdropFilter: "blur(26px)", WebkitBackdropFilter: "blur(26px)", borderTop: "1px solid rgba(255,255,255,0.13)", boxShadow: "0 -22px 60px rgba(0,0,0,0.5)", animation: "sheetUp 0.45s cubic-bezier(.2,.85,.25,1) both" }}>
        <div style={{ width: 42, height: 5, borderRadius: 999, background: "rgba(255,255,255,0.24)", margin: "0 auto 15px" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 17 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.1 }}>{t("dp.title")}</div>
            <div style={{ fontSize: 12.5, color: p.subtext, marginTop: 3 }}>{t("dp.sub")}</div>
          </div>
          <Link href="/home" style={{ width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: p.cardBg, border: `1px solid ${p.cardBorder}`, flex: "0 0 auto" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={p.subtext} strokeWidth="2.2" strokeLinecap="round"><path d="M6 6 L18 18 M18 6 L6 18" /></svg>
          </Link>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {DIARIES.map((d) => {
            const s = diaryStyle(d.color);
            return (
              <button key={d.key} onClick={() => onPick(d.key)} style={{ position: "relative", display: "flex", alignItems: "center", gap: 14, padding: "14px 15px", borderRadius: 18, background: s.cardBg, border: `1px solid ${s.bord}`, overflow: "hidden", textAlign: "start", cursor: "pointer", color: "inherit", font: "inherit" }}>
                <div style={{ position: "absolute", inset: 0, background: s.rowGlow, pointerEvents: "none" }} />
                <DiaryHex color={d.color} />
                <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16.5, fontWeight: 700, color: s.nameColor }}>{t(`diary.${d.key}`)}</div>
                  <div style={{ fontSize: 12, color: p.subtext, marginTop: 2 }}>{t(`hint.${d.key}`)}</div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={p.subtext} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "relative", flex: "0 0 auto" }}><polyline points="15 6 9 12 15 18" /></svg>
              </button>
            );
          })}
        </div>
        <div style={{ width: 120, height: 4, borderRadius: 999, background: "rgba(255,255,255,0.22)", margin: "20px auto 2px" }} />
      </div>
    </div>
  );
}

const DIARY_KEYS: DiaryKey[] = ["creation", "dream", "idea", "reality", "record"];

function NewEntryInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const param = sp.get("diary");
  const fromParam = param && DIARY_KEYS.includes(param as DiaryKey) ? (param as DiaryKey) : null;
  const [selected, setSelected] = useState<DiaryKey | null>(fromParam);

  // Direct visit without a chosen diary → fall back to the inline picker.
  if (!selected) return <DiaryPickSheet onPick={setSelected} />;

  return (
    <EntryForm
      diaryKey={selected}
      headerKey="ef.newIn"
      submitKey="ef.add"
      onBack={() => (fromParam ? router.push("/home") : setSelected(null))}
      onSubmit={async (v) => {
        const entry = await createEntry({
          type: selected,
          title: v.title,
          body: v.body,
          lucidity: selected === "dream" ? v.lucidity : null,
          visibility: "private",
          file: v.file,
          created_at: v.createdAt,
        });
        if (v.shared) await setEntrySharing(entry.id, { shared: true, anonymous: v.anonymous });
        const all = await listEntries();
        router.push(`/entry/reveal?diary=${selected}&count=${all.length}&id=${entry.id}`);
      }}
    />
  );
}

export default function NewEntryPage() {
  return (
    <Suspense>
      <NewEntryInner />
    </Suspense>
  );
}
