"use client";

import Link from "next/link";
import { theme } from "@/lib/theme";
import { useLang } from "@/lib/i18n";
import { useEntrySheet } from "@/components/EntrySheet";

function g(hex: string, al: number) {
  const n = parseInt(hex.replace("#", ""), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${al})`;
}

type Active = "mind" | "journals" | "dash" | "profile";

export default function BottomNav({ active }: { active: Active }) {
  const p = theme;
  const { t } = useLang();
  const { openSheet } = useEntrySheet();
  const on = p.navActive;
  const off = "rgba(233,236,255,0.45)";
  const glow = p.navGlow;
  const mk = (k: Active) => (active === k ? `drop-shadow(0 0 6px ${g(glow, 0.85)})` : "none");
  const mindC = active === "mind" ? on : off;
  const jrnC = active === "journals" ? on : off;
  const dashC = active === "dash" ? on : off;
  const profC = active === "profile" ? on : off;
  const item: React.CSSProperties = {
    textDecoration: "none",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    width: 54,
  };

  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 30, display: "flex", justifyContent: "center" }}>
      <div
        style={{
          width: "100%",
          maxWidth: 430,
          height: 76,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          padding: "11px 18px 0",
          background: "rgba(7,10,24,0.74)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderTop: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <Link href="/home" style={item}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 18, filter: mk("mind") }}>
            <svg width="21" height="20" viewBox="0 0 24 24" fill="none" stroke={mindC} strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5 a2.5 2.5 0 0 0-4.6-1.3 A2.5 2.5 0 0 0 4 6.2 a2.6 2.6 0 0 0-1 4.8 a2.5 2.5 0 0 0 .6 4.3 a2.4 2.4 0 0 0 3.6 2.3 A2.4 2.4 0 0 0 12 19.5Z" />
              <path d="M12 5 a2.5 2.5 0 0 1 4.6-1.3 A2.5 2.5 0 0 1 20 6.2 a2.6 2.6 0 0 1 1 4.8 a2.5 2.5 0 0 1-.6 4.3 a2.4 2.4 0 0 1-3.6 2.3 A2.4 2.4 0 0 1 12 19.5Z" />
              <path d="M8.2 8.4 a1.4 1.4 0 0 0 1.1 1.6" />
              <path d="M15.8 8.4 a1.4 1.4 0 0 1-1.1 1.6" />
            </svg>
          </div>
          <div style={{ fontSize: 10.5, fontWeight: 500, color: mindC }}>{t("nav.mind")}</div>
        </Link>

        <Link href="/journals" style={item}>
          <div style={{ position: "relative", width: 15, height: 16, borderRadius: "2px 3px 3px 2px", border: `1.7px solid ${jrnC}`, filter: mk("journals") }}>
            <div style={{ position: "absolute", top: 2, bottom: 2, right: 4, width: 1.4, background: jrnC }} />
          </div>
          <div style={{ fontSize: 10.5, fontWeight: 500, color: jrnC }}>{t("nav.journals")}</div>
        </Link>

        <button onClick={openSheet} style={{ ...item, width: 58, gap: 0, background: "transparent", border: "none", cursor: "pointer", padding: 0, font: "inherit" }}>
          <div style={{ position: "relative", width: 50, height: 54, marginTop: -21, filter: "drop-shadow(0 10px 22px rgba(120,110,255,0.55))" }}>
            <svg width="50" height="54" viewBox="0 0 56 60" style={{ position: "absolute", inset: 0 }}>
              <defs>
                <linearGradient id="fabg" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor={p.fabFrom} />
                  <stop offset="1" stopColor={p.fabTo} />
                </linearGradient>
              </defs>
              <polygon points="28,8 47,19 47,41 28,52 9,41 9,19" fill="url(#fabg)" stroke="url(#fabg)" strokeWidth="13" strokeLinejoin="round" />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 23, fontWeight: 300, lineHeight: 1 }}>+</div>
          </div>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: "rgba(233,236,255,0.85)", marginTop: 4 }}>{t("nav.entry")}</div>
        </button>

        <Link href="/dashboard" style={item}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 2.5, height: 15, filter: mk("dash") }}>
            <div style={{ width: 3, height: 7, background: dashC, borderRadius: 1.5 }} />
            <div style={{ width: 3, height: 13, background: dashC, borderRadius: 1.5 }} />
            <div style={{ width: 3, height: 10, background: dashC, borderRadius: 1.5 }} />
          </div>
          <div style={{ fontSize: 10.5, fontWeight: 500, color: dashC }}>{t("nav.dash")}</div>
        </Link>

        <Link href="/profile" style={item}>
          <div style={{ width: 17, height: 17, display: "flex", flexDirection: "column", alignItems: "center", filter: mk("profile") }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: profC }} />
            <div style={{ width: 14, height: 8, borderRadius: "8px 8px 0 0", background: profC, marginTop: 1.5 }} />
          </div>
          <div style={{ fontSize: 10.5, fontWeight: 500, color: profC }}>{t("nav.profile")}</div>
        </Link>
      </div>
    </div>
  );
}
