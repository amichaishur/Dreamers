"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DIARIES, diaryStyle, DiaryKey } from "@/lib/diary";
import DiaryHex from "@/components/DiaryHex";
import { theme } from "@/lib/theme";
import { useLang } from "@/lib/i18n";

const p = theme;

const Ctx = createContext<{ openSheet: () => void }>({ openSheet: () => {} });
export const useEntrySheet = () => useContext(Ctx);

export function EntrySheetProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const openSheet = useCallback(() => setOpen(true), []);
  const closeSheet = useCallback(() => setOpen(false), []);
  return (
    <Ctx.Provider value={{ openSheet }}>
      {children}
      {open && <DiaryPickModal onClose={closeSheet} />}
    </Ctx.Provider>
  );
}

function DiaryPickModal({ onClose }: { onClose: () => void }) {
  const { t } = useLang();
  const router = useRouter();

  const pick = (k: DiaryKey) => {
    onClose();
    router.push(`/entry/new?diary=${k}`);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 70 }}>
      {/* scrim — the real screen (התודעה שלי) stays partially visible behind */}
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(4,5,16,0.5)", backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)", animation: "fadeIn 0.25s ease both" }} />

      {/* compact bottom sheet — anchored to the viewport bottom, centered in the app frame */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
      <div style={{ width: "100%", maxWidth: 430, pointerEvents: "auto", padding: "10px 16px 18px", borderRadius: "26px 26px 0 0", background: "linear-gradient(180deg, rgba(28,26,52,0.96), rgba(12,12,28,0.98))", backdropFilter: "blur(26px)", WebkitBackdropFilter: "blur(26px)", borderTop: "1px solid rgba(255,255,255,0.13)", boxShadow: "0 -22px 60px rgba(0,0,0,0.55)", animation: "sheetUp 0.4s cubic-bezier(.2,.85,.25,1) both" }}>
        <div style={{ width: 40, height: 5, borderRadius: 999, background: "rgba(255,255,255,0.24)", margin: "0 auto 13px" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 18.5, fontWeight: 700, lineHeight: 1.1, color: p.text }}>{t("dp.title")}</div>
            <div style={{ fontSize: 12, color: p.subtext, marginTop: 2 }}>{t("dp.sub")}</div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: p.cardBg, border: `1px solid ${p.cardBorder}`, flex: "0 0 auto", cursor: "pointer" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={p.subtext} strokeWidth="2.2" strokeLinecap="round"><path d="M6 6 L18 18 M18 6 L6 18" /></svg>
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {DIARIES.map((d) => {
            const s = diaryStyle(d.color);
            return (
              <button key={d.key} onClick={() => pick(d.key)} style={{ position: "relative", display: "flex", alignItems: "center", gap: 13, padding: "11px 13px", borderRadius: 16, background: s.cardBg, border: `1px solid ${s.bord}`, overflow: "hidden", textAlign: "start", cursor: "pointer", color: "inherit", font: "inherit" }}>
                <div style={{ position: "absolute", inset: 0, background: s.rowGlow, pointerEvents: "none" }} />
                <DiaryHex color={d.color} w={30} h={33} />
                <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15.5, fontWeight: 700, color: s.nameColor }}>{t(`diary.${d.key}`)}</div>
                  <div style={{ fontSize: 11.5, color: p.subtext, marginTop: 1 }}>{t(`hint.${d.key}`)}</div>
                </div>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={p.subtext} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "relative", flex: "0 0 auto" }}><polyline points="15 6 9 12 15 18" /></svg>
              </button>
            );
          })}
        </div>
      </div>
      </div>
    </div>
  );
}
