"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import StarField from "@/components/StarField";
import WeaveSphere from "@/components/WeaveSphere";
import { theme } from "@/lib/theme";
import { useLang } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

const BG = "linear-gradient(168deg,#0C0C1E 0%,#160F30 50%,#241A44 100%)";
const LINE = "#C6B8F2";

function Wordmark() {
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.5px", lineHeight: 1, direction: "ltr" }}>Dreamers</div>
      <svg viewBox="0 0 240 24" style={{ position: "absolute", left: "-2%", bottom: -15, width: "104%", height: "auto", overflow: "visible" }}>
        <defs>
          <linearGradient id="wsus" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#5BC8FF" />
            <stop offset="0.5" stopColor="#9A6CFF" />
            <stop offset="1" stopColor="#FF6FB5" />
          </linearGradient>
        </defs>
        <path d="M6 13 C 64 3, 168 3, 214 10" fill="none" stroke="url(#wsus)" strokeWidth="3.4" strokeLinecap="round" style={{ filter: "drop-shadow(0 0 6px rgba(140,160,255,0.75))" }} />
        <circle cx="225" cy="10" r="5.6" fill="#C9A9FF" style={{ filter: "drop-shadow(0 0 6px rgba(201,169,255,0.95))" }} />
        <circle cx="225" cy="10" r="2.6" fill="#fff" />
      </svg>
    </div>
  );
}

function WelcomeInner() {
  const sp = useSearchParams();
  const pending = sp.get("mode") === "pending";
  const { t } = useLang();
  const [showCode, setShowCode] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const signInGoogle = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/home` },
    });
  };

  const signOutBack = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    // Hard navigation so the cleared session cookies are seen server-side and
    // the login screen actually shows (router.push kept bouncing to pending).
    window.location.href = "/welcome";
  };

  const redeem = async () => {
    if (!code.trim()) return;
    setBusy(true);
    setErr("");
    const supabase = createClient();
    const { data, error } = await supabase.rpc("redeem_code", { p_code: code.trim() });
    if (!error && data === true) {
      window.location.href = "/home";
    } else {
      setBusy(false);
      setErr(t("wc.codeInvalid"));
    }
  };

  return (
    <main style={{ position: "relative", minHeight: "100svh", overflow: "hidden", background: BG, color: "#ECE7FA" }}>
      <div style={{ position: "absolute", top: -90, left: "50%", transform: "translateX(-50%)", width: 420, height: 420, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,92,196,0.34), rgba(110,139,255,0.12) 46%, transparent 70%)", pointerEvents: "none", filter: "blur(6px)" }} />
      <StarField count={95} color="rgba(220,226,255,0.9)" />

      {!pending ? (
        <div style={{ position: "relative", minHeight: "100svh", display: "flex", flexDirection: "column", alignItems: "center", padding: "0 34px" }}>
          <div style={{ marginTop: 96, position: "relative", width: 188, height: 188, display: "flex", alignItems: "center", justifyContent: "center", animation: "riseUp 0.9s cubic-bezier(.2,.8,.2,1) both" }}>
            <div style={{ position: "absolute", width: 230, height: 230, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,92,196,0.4), transparent 64%)", animation: "glowPulse 4.2s ease-in-out infinite" }} />
            <div style={{ position: "relative", width: 184, height: 184, animation: "floatY 7s ease-in-out infinite" }}>
              <WeaveSphere dots={theme.dots} lineColor={LINE} count={46} />
            </div>
          </div>

          <div style={{ marginTop: 30, textAlign: "center", animation: "riseUp 0.9s cubic-bezier(.2,.8,.2,1) 0.12s both" }}>
            <Wordmark />
            <div style={{ marginTop: 24, fontSize: 15, fontWeight: 500, letterSpacing: 3, color: "rgba(236,231,250,0.66)" }}>{t("brand.sub")}</div>
          </div>

          <div style={{ marginTop: 26, maxWidth: 300, textAlign: "center", fontSize: 16.5, fontWeight: 300, lineHeight: 1.7, color: "rgba(236,231,250,0.78)", animation: "riseUp 0.9s cubic-bezier(.2,.8,.2,1) 0.24s both" }}>
            {t("wc.t1")}<br />{t("wc.t2")}
          </div>

          <div style={{ marginTop: "auto", width: "100%", maxWidth: 330, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, paddingBottom: 30, animation: "riseUp 0.9s cubic-bezier(.2,.8,.2,1) 0.36s both" }}>
            <button onClick={signInGoogle} style={{ position: "relative", width: "100%", height: 56, borderRadius: 17, overflow: "hidden", border: "none", cursor: "pointer", background: "linear-gradient(180deg,#FCFBFF,#ECE8FA)", boxShadow: "0 0 0 1px rgba(255,255,255,0.5), 0 14px 34px rgba(124,92,196,0.4), 0 4px 12px rgba(0,0,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center", gap: 11 }}>
              <svg width="21" height="21" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" /><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" /><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" /><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" /></svg>
              <span style={{ fontSize: 16, fontWeight: 600, color: "#1A1530" }}>{t("wc.google")}</span>
              <div style={{ position: "absolute", top: 0, bottom: 0, width: 42, background: "linear-gradient(100deg, transparent, rgba(255,255,255,0.8), transparent)", animation: "sheen 5.5s ease-in-out 1.5s infinite" }} />
            </button>
            <div style={{ fontSize: 14.5, fontWeight: 500, color: "rgba(236,231,250,0.74)", cursor: "pointer", padding: "6px 4px", borderBottom: "1px solid rgba(236,231,250,0.22)" }}>{t("wc.email")}</div>
          </div>

          <div style={{ position: "absolute", bottom: 22, left: 0, right: 0, textAlign: "center", fontSize: 12, letterSpacing: 0.4, color: "rgba(236,231,250,0.42)", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(236,231,250,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            {t("wc.inviteOnly")}
          </div>
        </div>
      ) : (
        <div style={{ position: "relative", minHeight: "100svh", display: "flex", flexDirection: "column", alignItems: "center", padding: "0 36px" }}>
          <div style={{ marginTop: 104, position: "relative", width: 172, height: 172, display: "flex", alignItems: "center", justifyContent: "center", animation: "riseUp 0.9s cubic-bezier(.2,.8,.2,1) both" }}>
            <div style={{ position: "absolute", width: 214, height: 214, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,92,196,0.4), transparent 64%)", animation: "glowPulse 4.2s ease-in-out infinite" }} />
            <div style={{ position: "relative", width: 168, height: 168, animation: "floatY 7s ease-in-out infinite" }}>
              <WeaveSphere dots={theme.dots} lineColor={LINE} count={46} />
            </div>
            <div style={{ position: "absolute", bottom: 2, right: 10, width: 42, height: 42, borderRadius: "50%", background: "linear-gradient(150deg,#2A2050,#1A1438)", boxShadow: "0 0 0 1px rgba(198,184,242,0.3), 0 8px 22px rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#D7C9F5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 22h14" /><path d="M5 2h14" /><path d="M17 22v-4.17a2 2 0 0 0-.59-1.42L12 12l-4.41 4.41A2 2 0 0 0 7 17.83V22" /><path d="M7 2v4.17a2 2 0 0 0 .59 1.42L12 12l4.41-4.41A2 2 0 0 0 17 6.17V2" /></svg>
            </div>
          </div>

          <div style={{ marginTop: 42, textAlign: "center", animation: "riseUp 0.9s cubic-bezier(.2,.8,.2,1) 0.12s both" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 999, background: "rgba(216,168,124,0.14)", border: "1px solid rgba(232,154,124,0.32)", fontSize: 12.5, fontWeight: 600, color: "#F0C29C" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#E89A7C", boxShadow: "0 0 8px rgba(232,154,124,0.9)" }} />
              {t("wc.pending")}
            </div>
            <div style={{ marginTop: 22, fontSize: 25, fontWeight: 800, letterSpacing: "-0.3px", color: "#ECE7FA" }}>{t("wc.connected")}</div>
            <div style={{ marginTop: 14, maxWidth: 300, fontSize: 15.5, fontWeight: 300, lineHeight: 1.75, color: "rgba(236,231,250,0.72)" }}>{t("wc.pendingMsg")}</div>
          </div>

          <div style={{ marginTop: "auto", width: "100%", maxWidth: 330, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, paddingBottom: 34, animation: "riseUp 0.9s cubic-bezier(.2,.8,.2,1) 0.36s both" }}>
            <button onClick={signOutBack} style={{ width: "100%", height: 52, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 9, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", cursor: "pointer" }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#ECE7FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
              <span style={{ fontSize: 15.5, fontWeight: 600, color: "#ECE7FA", whiteSpace: "nowrap" }}>{t("wc.back")}</span>
            </button>
            {showCode ? (
              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={code} onChange={(e) => setCode(e.target.value)} placeholder={t("wc.codePh")} style={{ flex: 1, height: 46, borderRadius: 13, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.16)", color: "#ECE7FA", padding: "0 14px", fontSize: 15, direction: "ltr", textAlign: "center", letterSpacing: 2 }} />
                  <button onClick={redeem} disabled={busy} style={{ height: 46, padding: "0 16px", borderRadius: 13, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg,#6E8BFF,#9A6CFF)" }}>{busy ? t("wc.checking") : t("wc.codeGo")}</button>
                </div>
                {err && <div style={{ fontSize: 12.5, color: "#F0A4A4", textAlign: "center" }}>{err}</div>}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "rgba(236,231,250,0.5)" }}>{t("wc.haveCode")} <span onClick={() => setShowCode(true)} style={{ color: "#C9A9FF", fontWeight: 600, cursor: "pointer" }}>{t("wc.enterCode")}</span></div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

export default function WelcomePage() {
  return (
    <Suspense>
      <WelcomeInner />
    </Suspense>
  );
}
