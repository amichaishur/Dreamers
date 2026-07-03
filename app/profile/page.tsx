"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import StarField from "@/components/StarField";
import BottomNav from "@/components/BottomNav";
import { useLang } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { getProfile, listEntries, DbProfile, DbEntry } from "@/lib/supabase/data";
import { computeStats } from "@/lib/stats";
import { initialsFrom } from "@/lib/format";

const BG = "linear-gradient(168deg,#0C0C1E 0%,#160F30 52%,#241A44 100%)";
const GoogleIcon = ({ s = 12 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" /><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" /><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" /><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" /></svg>
);

export default function ProfilePage() {
  const { t, lang, setLang } = useLang();
  const router = useRouter();
  const [profile, setProfile] = useState<DbProfile | null | undefined>(undefined);
  const [entries, setEntries] = useState<DbEntry[]>([]);

  useEffect(() => {
    let alive = true;
    getProfile().then((p) => { if (alive) setProfile(p); });
    listEntries().then((rows) => { if (alive) setEntries(rows); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/welcome");
    router.refresh();
  };

  if (profile === undefined) return <main style={{ position: "relative", minHeight: "100svh", background: BG }} />;

  const admin = profile?.role === "admin";
  const name = profile?.display_name || profile?.email || "";
  const email = profile?.email || "";
  const initials = initialsFrom(profile?.display_name ?? null, email);
  const stats = computeStats(entries);
  const avatarBg = admin ? "linear-gradient(135deg,#7C5CE0,#5B7BFF)" : "linear-gradient(135deg,#6E8BFF,#9A6CFF)";
  const ringGlow = admin ? "rgba(124,92,224,0.5)" : "rgba(124,92,196,0.45)";
  const langBtn = (active: boolean): React.CSSProperties => ({ fontSize: 12, fontWeight: active ? 600 : 500, padding: "5px 11px", borderRadius: 7, border: "none", cursor: "pointer", background: active ? "linear-gradient(135deg,#6E8BFF,#9A6CFF)" : "transparent", color: active ? "#fff" : "rgba(236,231,250,0.55)" });

  return (
    <main style={{ position: "relative", minHeight: "100svh", overflow: "hidden", background: BG, color: "#ECE7FA" }}>
      <div style={{ position: "absolute", top: -120, left: "50%", transform: "translateX(-50%)", width: 440, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,92,196,0.26), transparent 68%)", pointerEvents: "none" }} />
      <StarField count={64} color="rgba(220,226,255,0.85)" />

      <div style={{ position: "relative", padding: "30px 20px 96px" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <div style={{ position: "relative", width: 84, height: 84, marginBottom: 13 }}>
            <div style={{ position: "absolute", inset: -9, borderRadius: "50%", background: `radial-gradient(circle, ${ringGlow}, transparent 68%)`, animation: "glowPulse 4.4s ease-in-out infinite" }} />
            <div style={{ position: "relative", width: 84, height: 84, borderRadius: "50%", background: avatarBg, boxShadow: "0 8px 24px rgba(0,0,0,0.35), inset 0 1px 1px rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 700, color: "#fff" }}>{initials}</div>
          </div>
          <div style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-0.3px" }}>{name}</div>
          <div style={{ fontSize: 13.5, color: "rgba(236,231,250,0.6)", marginTop: 4, direction: "ltr" }}>{email}</div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 9, padding: "4px 11px", borderRadius: 999, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <GoogleIcon />
            <span style={{ fontSize: 11.5, color: "rgba(236,231,250,0.62)" }}>{t("pf.google")}</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 18, padding: 13, borderRadius: 16, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: "#C9B6F2" }}>{stats.total}</span>
            <span style={{ fontSize: 12.5, color: "rgba(236,231,250,0.62)" }}>{t("pf.memories")}</span>
          </div>
          <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.12)" }} />
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: "#F2C879" }}>{stats.streak}</span>
            <span style={{ fontSize: 12.5, color: "rgba(236,231,250,0.62)" }}>{t("pf.streak")}</span>
          </div>
        </div>

        {admin && (
          <Link href="/admin" style={{ display: "block", textDecoration: "none", color: "inherit", marginTop: 16, padding: "15px 16px", borderRadius: 18, background: "linear-gradient(135deg, rgba(124,92,196,0.18), rgba(110,139,255,0.1))", border: "1px solid rgba(154,124,235,0.36)", boxShadow: "0 0 0 1px rgba(154,124,235,0.08), 0 8px 26px rgba(60,40,120,0.3)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 42, height: 42, flex: "0 0 auto", borderRadius: 13, background: "linear-gradient(135deg,#7C5CE0,#5B7BFF)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 16px rgba(110,90,220,0.45)" }}>
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 4 5v6c0 5 3.4 8.5 8 11 4.6-2.5 8-6 8-11V5z" /><path d="M9 12l2 2 4-4" /></svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 15.5, fontWeight: 700, color: "#F1ECFF" }}>{t("pf.adminTitle")}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, padding: "2px 8px", borderRadius: 999, background: "rgba(232,154,124,0.18)", border: "1px solid rgba(232,154,124,0.4)", color: "#F0BFA4" }}>{t("pf.adminBadge")}</span>
                </div>
                <div style={{ fontSize: 12.5, color: "rgba(236,231,250,0.66)", marginTop: 3 }}>{t("pf.adminSub")}</div>
              </div>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(236,231,250,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "0 0 auto" }}><polyline points="9 18 15 12 9 6" /></svg>
            </div>
          </Link>
        )}

        <div style={{ marginTop: 16, borderRadius: 20, background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.09)", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "15px 16px" }}>
            <div style={{ width: 30, height: 30, flex: "0 0 auto", borderRadius: 9, background: "rgba(111,168,220,0.16)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CC4EC" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20" /></svg>
            </div>
            <span style={{ flex: 1, fontSize: 14.5, fontWeight: 500 }}>{t("pf.language")}</span>
            <div style={{ display: "flex", padding: 3, borderRadius: 10, background: "rgba(0,0,0,0.25)" }}>
              <button onClick={() => setLang("he")} style={langBtn(lang === "he")}>עברית</button>
              <button onClick={() => setLang("en")} style={langBtn(lang === "en")}>English</button>
            </div>
          </div>
          <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "0 16px" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "15px 16px" }}>
            <div style={{ width: 30, height: 30, flex: "0 0 auto", borderRadius: 9, background: "rgba(127,214,162,0.16)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9FE3BD" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" /></svg>
            </div>
            <span style={{ flex: 1, fontSize: 14.5, fontWeight: 500 }}>{t("pf.sharing")}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "rgba(236,231,250,0.6)" }}>
              <span>{t("pf.onlyMe")}</span>
            </div>
          </div>
          <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "0 16px" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "15px 16px" }}>
            <div style={{ width: 30, height: 30, flex: "0 0 auto", borderRadius: 9, background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <GoogleIcon s={15} />
            </div>
            <span style={{ flex: 1, fontSize: 14.5, fontWeight: 500 }}>{t("pf.googleAccount")}</span>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "#7FD6A2" }}>{t("pf.connected")}</span>
          </div>
        </div>

        <button onClick={signOut} style={{ width: "100%", marginTop: 16, height: 50, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 9, background: "rgba(232,124,124,0.1)", border: "1px solid rgba(232,124,124,0.26)", cursor: "pointer" }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#F0A4A4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
          <span style={{ fontSize: 15, fontWeight: 600, color: "#F0B4B4" }}>{t("pf.signout")}</span>
        </button>
      </div>

      <BottomNav active="profile" />
    </main>
  );
}
