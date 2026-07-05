"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import StarField from "@/components/StarField";
import { useLang } from "@/lib/i18n";
import {
  listProfiles, setUserStatus, setUserRole, removeUser, DbProfile,
  listInvitations, createInvitation, setInvitationRole, revokeInvitation, createInviteCode, Invitation,
} from "@/lib/supabase/data";
import { initialsFrom } from "@/lib/format";

const BG = "linear-gradient(168deg,#0C0C1E 0%,#160F30 52%,#241A44 100%)";

const STATUS = {
  admin: { pillBg: "rgba(154,124,235,0.18)", pillBord: "rgba(154,124,235,0.4)", pillText: "#C9B6F2" },
  active: { pillBg: "rgba(127,214,162,0.15)", pillBord: "rgba(127,214,162,0.34)", pillText: "#9FE3BD" },
  pending: { pillBg: "rgba(242,200,121,0.15)", pillBord: "rgba(242,200,121,0.34)", pillText: "#F2D08C" },
  blocked: { pillBg: "rgba(255,255,255,0.06)", pillBord: "rgba(255,255,255,0.16)", pillText: "rgba(236,231,250,0.55)" },
} as const;
type StatusKey = keyof typeof STATUS;

const AVATARS = [
  "linear-gradient(135deg,#7C5CE0,#5B7BFF)",
  "linear-gradient(135deg,#6E8BFF,#9A6CFF)",
  "linear-gradient(135deg,#5BC8FF,#2C9BD6)",
  "linear-gradient(135deg,#F2C879,#D69A2C)",
  "linear-gradient(135deg,#7FD6A2,#2FB89A)",
  "linear-gradient(135deg,#FF8FA0,#E0466B)",
];
function avatarFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATARS[h % AVATARS.length];
}
function statusKey(pf: DbProfile): StatusKey {
  if (pf.role === "admin") return "admin";
  if (pf.status === "active") return "active";
  if (pf.status === "pending") return "pending";
  return "blocked";
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 60, display: "flex", justifyContent: "center" }}>
      <div style={{ position: "relative", width: "100%", maxWidth: 430, height: "100%" }}>
        <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(6,8,18,0.62)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)", animation: "fadeIn 0.3s ease both" }} />
        {children}
      </div>
    </div>
  );
}

const sheet: React.CSSProperties = { position: "absolute", left: 0, right: 0, bottom: 0, borderRadius: "28px 28px 0 0", background: "linear-gradient(180deg,#1A1338,#140E2C)", borderTop: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 -18px 50px rgba(0,0,0,0.5)", animation: "sheetUp 0.5s cubic-bezier(.2,.85,.25,1) both" };
const grab = <div style={{ width: 42, height: 5, borderRadius: 99, background: "rgba(255,255,255,0.18)", margin: "0 auto 16px" }} />;

function ActionRow({ icon, bg, title, sub, titleColor = "#ECE7FA", subColor = "rgba(236,231,250,0.5)", tint, onClick, disabled }: { icon: React.ReactNode; bg: string; title: string; sub: string; titleColor?: string; subColor?: string; tint?: string; onClick?: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ width: "100%", display: "flex", alignItems: "center", gap: 13, padding: "14px 8px", borderRadius: 13, cursor: disabled ? "default" : "pointer", background: tint || "transparent", border: "none", textAlign: "start", opacity: disabled ? 0.5 : 1, font: "inherit" }}>
      <div style={{ width: 34, height: 34, flex: "0 0 auto", borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: titleColor }}>{title}</div>
        <div style={{ fontSize: 12, color: subColor }}>{sub}</div>
      </div>
    </button>
  );
}

type ActionKind = "approve" | "makeAdmin" | "suspend" | "remove";

function UserActionSheet({ user, busy, onAction, onClose }: { user: DbProfile; busy: boolean; onAction: (k: ActionKind) => void; onClose: () => void }) {
  const { t } = useLang();
  const st = STATUS[statusKey(user)];
  const name = user.display_name || user.email;
  return (
    <Overlay onClose={onClose}>
      <div style={{ ...sheet, padding: "12px 20px 26px" }}>
        {grab}
        <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 16, marginBottom: 6, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ width: 46, height: 46, flex: "0 0 auto", borderRadius: "50%", background: avatarFor(user.id), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#fff" }}>{initialsFrom(user.display_name, user.email)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16.5, fontWeight: 700, color: "#F1ECFF" }}>{name}</div>
            <div style={{ fontSize: 12, color: "rgba(236,231,250,0.55)", direction: "ltr", textAlign: "start" }}>{user.email}</div>
          </div>
          <span style={{ fontSize: 11.5, fontWeight: 600, padding: "5px 12px", borderRadius: 999, background: st.pillBg, border: `1px solid ${st.pillBord}`, color: st.pillText }}>{t(`st.${statusKey(user)}`)}</span>
        </div>
        <ActionRow disabled={busy || user.status === "active"} onClick={() => onAction("approve")} tint="rgba(127,214,162,0.1)" bg="rgba(127,214,162,0.18)" title={t("ua.approve")} sub={t("ua.approveSub")} titleColor="#A8E8C2" subColor="rgba(236,231,250,0.55)" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7FD6A2" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>} />
        <ActionRow disabled={busy || user.role === "admin"} onClick={() => onAction("makeAdmin")} bg="rgba(154,124,235,0.16)" title={t("ua.makeAdmin")} sub={t("ua.makeAdminSub")} icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#C9B6F2" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 4 5v6c0 5 3.4 8.5 8 11 4.6-2.5 8-6 8-11V5z" /><path d="M9 12l2 2 4-4" /></svg>} />
        <ActionRow disabled={busy || user.status === "suspended"} onClick={() => onAction("suspend")} bg="rgba(255,255,255,0.07)" title={t("ua.suspend")} sub={t("ua.suspendSub")} icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(236,231,250,0.7)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>} />
        <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "7px 8px 4px" }} />
        <ActionRow disabled={busy} onClick={() => onAction("remove")} bg="rgba(232,124,124,0.14)" title={t("ua.remove")} sub={t("ua.removeSub")} titleColor="#F0B4B4" subColor="rgba(232,124,124,0.6)" icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#F0A4A4" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>} />
      </div>
    </Overlay>
  );
}

const on = "linear-gradient(135deg,#6E8BFF,#9A6CFF)";

function InviteSheet({ onClose }: { onClose: () => void }) {
  const { t } = useLang();
  const [method, setMethod] = useState<"email" | "link">("email");

  const [email, setEmail] = useState("");
  const [asAdmin, setAsAdmin] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailMsg, setEmailMsg] = useState<"added" | "exists" | null>(null);

  const [group, setGroup] = useState(false);
  const [days, setDays] = useState<number | null>(7);
  const [codeBusy, setCodeBusy] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState<"" | "code" | "msg">("");

  const addEmail = async () => {
    const clean = email.trim();
    if (!clean || emailBusy) return;
    setEmailBusy(true); setEmailMsg(null);
    try {
      const r = await createInvitation(clean, asAdmin ? "admin" : "user");
      setEmailMsg(r);
      if (r === "added") { setEmail(""); setAsAdmin(false); }
    } catch { /* ignore */ }
    setEmailBusy(false);
  };
  const gen = async () => {
    if (codeBusy) return;
    setCodeBusy(true);
    try { const c = await createInviteCode({ group, days }); setCode(c.code); } catch { /* ignore */ }
    setCodeBusy(false);
  };
  const link = () => `${window.location.origin}/welcome`;
  const copyCode = async () => { if (!code) return; try { await navigator.clipboard.writeText(code); setCopied("code"); setTimeout(() => setCopied(""), 1500); } catch { /* */ } };
  const copyMsg = async () => { if (!code) return; try { await navigator.clipboard.writeText(`${t("is.joinMsg")}\n${link()}\n${t("is.msgCode")} ${code}`); setCopied("msg"); setTimeout(() => setCopied(""), 1500); } catch { /* */ } };

  const field: React.CSSProperties = { flex: 1, height: 46, borderRadius: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", color: "#ECE7FA", padding: "0 14px", fontSize: 14.5, direction: "ltr", textAlign: "start", font: "inherit" };

  return (
    <Overlay onClose={onClose}>
      <div style={{ ...sheet, padding: "12px 22px 26px", maxHeight: "88%", overflowY: "auto" }}>
        {grab}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.3px" }}>{t("is.title")}</div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(236,231,250,0.7)" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div style={{ fontSize: 12.5, color: "rgba(236,231,250,0.55)", marginBottom: 16 }}>{t("is.noMail")}</div>

        <div style={{ display: "flex", gap: 7, padding: 4, borderRadius: 13, background: "rgba(0,0,0,0.25)", marginBottom: 18 }}>
          <button onClick={() => setMethod("email")} style={{ flex: 1, textAlign: "center", fontSize: 13.5, fontWeight: 600, padding: 9, borderRadius: 9, border: "none", cursor: "pointer", background: method === "email" ? on : "transparent", color: method === "email" ? "#fff" : "rgba(236,231,250,0.55)" }}>{t("is.byEmail")}</button>
          <button onClick={() => setMethod("link")} style={{ flex: 1, textAlign: "center", fontSize: 13.5, fontWeight: 600, padding: 9, borderRadius: 9, border: "none", cursor: "pointer", background: method === "link" ? on : "transparent", color: method === "link" ? "#fff" : "rgba(236,231,250,0.55)" }}>{t("is.linkCode")}</button>
        </div>

        {method === "email" ? (
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(236,231,250,0.78)", marginBottom: 9 }}>{t("is.email")}</div>
            <div style={{ display: "flex", gap: 9, marginBottom: 12 }}>
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("is.emailPh")} type="email" style={field} />
              <button onClick={addEmail} disabled={emailBusy || !email.trim()} style={{ flex: "0 0 auto", height: 46, padding: "0 16px", borderRadius: 12, border: "none", cursor: "pointer", fontSize: 13.5, fontWeight: 700, color: "#fff", background: on, opacity: emailBusy || !email.trim() ? 0.6 : 1 }}>{emailBusy ? t("is.adding") : t("is.addInvite")}</button>
            </div>

            {/* Invite directly as admin (their role is set the moment they join) */}
            <button onClick={() => setAsAdmin((v) => !v)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "11px 13px", borderRadius: 12, background: asAdmin ? "rgba(154,124,235,0.14)" : "rgba(255,255,255,0.04)", border: `1px solid ${asAdmin ? "rgba(154,124,235,0.45)" : "rgba(255,255,255,0.1)"}`, cursor: "pointer", marginBottom: 14 }}>
              <div style={{ width: 20, height: 20, flex: "0 0 auto", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", background: asAdmin ? on : "transparent", border: asAdmin ? "none" : "1px solid rgba(255,255,255,0.3)" }}>
                {asAdmin && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
              </div>
              <div style={{ flex: 1, textAlign: "start" }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "#ECE7FA" }}>{t("is.asAdmin")}</div>
                <div style={{ fontSize: 11.5, color: "rgba(236,231,250,0.55)" }}>{t("is.asAdminSub")}</div>
              </div>
            </button>

            {emailMsg === "added" && (
              <div style={{ display: "flex", alignItems: "center", gap: 9, padding: 12, borderRadius: 13, background: "rgba(127,214,162,0.1)", border: "1px solid rgba(127,214,162,0.3)", marginBottom: 6 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7FD6A2" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#A8E8C2" }}>{t("is.added")}</span>
              </div>
            )}
            {emailMsg === "exists" && (
              <div style={{ fontSize: 12.5, color: "#F2D08C", marginBottom: 6 }}>{t("is.alreadyInvited")}</div>
            )}
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", gap: 10, marginBottom: 15 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(236,231,250,0.6)", marginBottom: 7 }}>{t("is.type")}</div>
                <div style={{ display: "flex", padding: 3, borderRadius: 11, background: "rgba(0,0,0,0.25)" }}>
                  <button onClick={() => setGroup(false)} style={{ flex: 1, textAlign: "center", fontSize: 12.5, fontWeight: 600, padding: 7, borderRadius: 8, border: "none", cursor: "pointer", background: !group ? on : "transparent", color: !group ? "#fff" : "rgba(236,231,250,0.55)" }}>{t("is.single")}</button>
                  <button onClick={() => setGroup(true)} style={{ flex: 1, textAlign: "center", fontSize: 12.5, fontWeight: 600, padding: 7, borderRadius: 8, border: "none", cursor: "pointer", background: group ? on : "transparent", color: group ? "#fff" : "rgba(236,231,250,0.55)" }}>{t("is.group")}</button>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(236,231,250,0.6)", marginBottom: 7 }}>{t("is.expiry")}</div>
                <div style={{ display: "flex", padding: 3, borderRadius: 11, background: "rgba(0,0,0,0.25)" }}>
                  <button onClick={() => setDays(7)} style={{ flex: 1, textAlign: "center", fontSize: 12, fontWeight: 600, padding: 7, borderRadius: 8, border: "none", cursor: "pointer", background: days === 7 ? on : "transparent", color: days === 7 ? "#fff" : "rgba(236,231,250,0.55)" }}>{t("is.days7")}</button>
                  <button onClick={() => setDays(null)} style={{ flex: 1, textAlign: "center", fontSize: 12, fontWeight: 600, padding: 7, borderRadius: 8, border: "none", cursor: "pointer", background: days === null ? on : "transparent", color: days === null ? "#fff" : "rgba(236,231,250,0.55)" }}>{t("is.noExpiry")}</button>
                </div>
              </div>
            </div>

            <button onClick={gen} disabled={codeBusy} style={{ width: "100%", height: 48, borderRadius: 13, border: "none", cursor: "pointer", fontSize: 14.5, fontWeight: 700, color: "#fff", background: on, boxShadow: "0 10px 26px rgba(124,92,196,0.4)", marginBottom: 15, opacity: codeBusy ? 0.6 : 1 }}>{codeBusy ? t("is.generating") : t("is.generate")}</button>

            {code && (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 15px", borderRadius: 13, background: "rgba(124,92,196,0.12)", border: "1px dashed rgba(154,124,235,0.45)", marginBottom: 13 }}>
                  <span style={{ fontSize: 12.5, color: "rgba(236,231,250,0.6)" }}>{t("is.code")}</span>
                  <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: 5, color: "#C9B6F2", direction: "ltr" }}>{code}</span>
                </div>
                <div style={{ padding: "13px 14px", borderRadius: 13, background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.09)", fontSize: 13, lineHeight: 1.6, color: "rgba(236,231,250,0.85)", marginBottom: 13 }}>
                  {t("is.joinMsg")}<br />
                  <span style={{ color: "#9CC4EC", direction: "ltr" }}>{link()}</span> · {t("is.msgCode")} <span style={{ color: "#C9B6F2", fontWeight: 700 }}>{code}</span>
                </div>
                <div style={{ display: "flex", gap: 9 }}>
                  <button onClick={copyMsg} style={{ flex: 1, height: 46, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.13)", cursor: "pointer" }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: "#ECE7FA" }}>{copied === "msg" ? t("is.copied") : t("is.copyMsg")}</span>
                  </button>
                  <button onClick={copyCode} style={{ flex: 1, height: 46, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.13)", cursor: "pointer" }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: "#ECE7FA" }}>{copied === "code" ? t("is.copied") : t("is.copyCode")}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </Overlay>
  );
}

function InviteActionSheet({ invite, onAction, onClose }: { invite: Invitation; onAction: (k: "makeAdmin" | "makeRegular" | "revoke") => void; onClose: () => void }) {
  const { t } = useLang();
  const isAdmin = invite.role === "admin";
  return (
    <Overlay onClose={onClose}>
      <div style={{ ...sheet, padding: "12px 20px 26px" }}>
        {grab}
        <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 16, marginBottom: 6, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ width: 42, height: 42, flex: "0 0 auto", borderRadius: 12, background: "rgba(242,200,121,0.14)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F2D08C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 5L2 7" /></svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#F1ECFF", direction: "ltr", textAlign: "start", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{invite.email}</div>
            <div style={{ fontSize: 12, color: "rgba(236,231,250,0.55)" }}>{t("ia.pendingNote")}</div>
          </div>
          <span style={{ fontSize: 11.5, fontWeight: 600, padding: "5px 12px", borderRadius: 999, background: "rgba(242,200,121,0.15)", border: "1px solid rgba(242,200,121,0.34)", color: "#F2D08C" }}>{t("st.pending")}</span>
        </div>
        {isAdmin ? (
          <ActionRow onClick={() => onAction("makeRegular")} bg="rgba(255,255,255,0.07)" title={t("ia.makeRegular")} sub={t("ia.makeRegularSub")} icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(236,231,250,0.7)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>} />
        ) : (
          <ActionRow onClick={() => onAction("makeAdmin")} tint="rgba(154,124,235,0.1)" bg="rgba(154,124,235,0.16)" title={t("ia.makeAdmin")} sub={t("ia.makeAdminSub")} titleColor="#C9B6F2" icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#C9B6F2" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 4 5v6c0 5 3.4 8.5 8 11 4.6-2.5 8-6 8-11V5z" /><path d="M9 12l2 2 4-4" /></svg>} />
        )}
        <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "7px 8px 4px" }} />
        <ActionRow onClick={() => onAction("revoke")} bg="rgba(232,124,124,0.14)" title={t("ia.revoke")} sub={t("ia.revokeSub")} titleColor="#F0B4B4" subColor="rgba(232,124,124,0.6)" icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#F0A4A4" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>} />
      </div>
    </Overlay>
  );
}

export default function AdminPage() {
  const { t } = useLang();
  const [profiles, setProfiles] = useState<DbProfile[] | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [actionUser, setActionUser] = useState<DbProfile | null>(null);
  const [actionInvite, setActionInvite] = useState<Invitation | null>(null);
  const [invite, setInvite] = useState(false);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try { setProfiles(await listProfiles()); } catch { setProfiles([]); }
    try { setInvitations(await listInvitations()); } catch { /* ignore */ }
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const runAction = async (kind: ActionKind) => {
    if (!actionUser || busy) return;
    if (kind === "remove" && !window.confirm(t("ua.removeConfirm"))) return;
    setBusy(true);
    try {
      if (kind === "approve") await setUserStatus(actionUser.id, "active");
      else if (kind === "makeAdmin") { await setUserRole(actionUser.id, "admin"); await setUserStatus(actionUser.id, "active"); }
      else if (kind === "suspend") await setUserStatus(actionUser.id, "suspended");
      else if (kind === "remove") await removeUser(actionUser.id);
      await reload();
    } catch { /* ignore; list reload reflects truth */ }
    setBusy(false);
    setActionUser(null);
  };

  const runInviteAction = async (kind: "makeAdmin" | "makeRegular" | "revoke") => {
    if (!actionInvite) return;
    try {
      if (kind === "makeAdmin") await setInvitationRole(actionInvite.id, "admin");
      else if (kind === "makeRegular") await setInvitationRole(actionInvite.id, "user");
      else if (kind === "revoke") await revokeInvitation(actionInvite.id);
      await reload();
    } catch { /* ignore */ }
    setActionInvite(null);
  };

  const list = profiles ?? [];
  const profileEmails = new Set(list.map((u) => u.email.toLowerCase()));
  // Invited emails that haven't created a profile yet (not joined).
  const pendingInvites = invitations.filter((i) => i.status === "pending" && !profileEmails.has(i.email.toLowerCase()));
  const total = list.length;
  const active = list.filter((u) => u.status === "active").length;
  const pending = list.filter((u) => u.status === "pending").length + pendingInvites.length;

  return (
    <main style={{ position: "relative", minHeight: "100svh", overflow: "hidden", background: BG, color: "#ECE7FA" }}>
      <div style={{ position: "absolute", top: -120, left: "50%", transform: "translateX(-50%)", width: 440, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,92,196,0.26), transparent 68%)", pointerEvents: "none" }} />
      <StarField count={60} color="rgba(220,226,255,0.85)" />

      <div style={{ position: "relative", padding: "26px 20px 30px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <Link href="/profile" style={{ width: 38, height: 38, flex: "0 0 auto", borderRadius: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ECE7FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </Link>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.3px" }}>{t("ad.title")}</span>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, padding: "2px 8px", borderRadius: 999, background: "rgba(232,154,124,0.18)", border: "1px solid rgba(232,154,124,0.4)", color: "#F0BFA4" }}>{t("st.admin")}</span>
            </div>
            <div style={{ fontSize: 12.5, color: "rgba(236,231,250,0.6)", marginTop: 2 }}>{t("ad.sub")}</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
          {[{ v: pending, l: t("ad.stPending"), c: "#F2C879" }, { v: active, l: t("ad.stActive"), c: "#7FD6A2" }, { v: total, l: t("ad.stUsers"), c: "#BFD3FF" }].map((s, i) => (
            <div key={i} style={{ padding: "13px 10px", borderRadius: 16, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1, color: s.c }}>{s.v}</div>
              <div style={{ fontSize: 11, color: "rgba(236,231,250,0.6)", marginTop: 6 }}>{s.l}</div>
            </div>
          ))}
        </div>

        <button onClick={() => setInvite(true)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 9, height: 46, borderRadius: 14, background: "linear-gradient(135deg, rgba(124,92,196,0.22), rgba(110,139,255,0.16))", border: "1px solid rgba(154,124,235,0.4)", cursor: "pointer", marginBottom: 16 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#C9B6F2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg>
          <span style={{ fontSize: 14.5, fontWeight: 600, color: "#E4DBFA" }}>{t("ad.invite")}</span>
        </button>

        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(236,231,250,0.7)" }}>{t("ad.allUsers")}</span>
          <span style={{ fontSize: 11.5, color: "rgba(236,231,250,0.45)" }}>{total} {t("ad.total")}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {list.map((u) => {
            const sk = statusKey(u);
            const st = STATUS[sk];
            const name = u.display_name || u.email;
            return (
              <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 13px", borderRadius: 15, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ width: 38, height: 38, flex: "0 0 auto", borderRadius: "50%", background: avatarFor(u.id), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff" }}>{initialsFrom(u.display_name, u.email)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#F1ECFF" }}>{name}</div>
                  <div style={{ fontSize: 11.5, color: "rgba(236,231,250,0.5)", direction: "ltr", textAlign: "start", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.email}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 999, background: st.pillBg, border: `1px solid ${st.pillBord}`, color: st.pillText, flex: "0 0 auto" }}>{t(`st.${sk}`)}</span>
                <button onClick={() => setActionUser(u)} style={{ width: 26, height: 26, flex: "0 0 auto", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", cursor: "pointer" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="rgba(236,231,250,0.5)"><circle cx="12" cy="5" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="12" cy="19" r="1.7" /></svg>
                </button>
              </div>
            );
          })}
          {profiles !== null && list.length === 0 && (
            <div style={{ textAlign: "center", color: "rgba(236,231,250,0.5)", fontSize: 13.5, padding: "40px 0" }}>{t("ad.empty")}</div>
          )}
        </div>

        {pendingInvites.length > 0 && (
          <>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "20px 0 10px" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(236,231,250,0.7)" }}>{t("is.pendingInvites")}</span>
              <span style={{ fontSize: 11.5, color: "rgba(236,231,250,0.45)" }}>{pendingInvites.length}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {pendingInvites.map((inv) => (
                <div key={inv.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 13px", borderRadius: 15, background: "rgba(242,200,121,0.05)", border: "1px solid rgba(242,200,121,0.2)" }}>
                  <div style={{ width: 38, height: 38, flex: "0 0 auto", borderRadius: "50%", background: "rgba(242,200,121,0.14)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#F2D08C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 5L2 7" /></svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: "#F1ECFF", direction: "ltr", textAlign: "start", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{inv.email}</div>
                    <div style={{ fontSize: 11, color: "rgba(236,231,250,0.5)" }}>{inv.role === "admin" ? t("is.willBeAdmin") : t("is.approvedSub")}</div>
                  </div>
                  {inv.role === "admin" && (
                    <span style={{ fontSize: 10.5, fontWeight: 700, padding: "4px 9px", borderRadius: 999, background: STATUS.admin.pillBg, border: `1px solid ${STATUS.admin.pillBord}`, color: STATUS.admin.pillText, flex: "0 0 auto" }}>{t("st.admin")}</span>
                  )}
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 999, background: "rgba(242,200,121,0.15)", border: "1px solid rgba(242,200,121,0.34)", color: "#F2D08C", flex: "0 0 auto" }}>{t("st.pending")}</span>
                  <button onClick={() => setActionInvite(inv)} style={{ width: 26, height: 26, flex: "0 0 auto", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", cursor: "pointer" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="rgba(236,231,250,0.5)"><circle cx="12" cy="5" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="12" cy="19" r="1.7" /></svg>
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {invite && <InviteSheet onClose={() => { setInvite(false); reload(); }} />}
      {actionUser && <UserActionSheet user={actionUser} busy={busy} onAction={runAction} onClose={() => setActionUser(null)} />}
      {actionInvite && <InviteActionSheet invite={actionInvite} onAction={runInviteAction} onClose={() => setActionInvite(null)} />}
    </main>
  );
}
