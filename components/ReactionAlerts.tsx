"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { theme, DiaryType } from "@/lib/theme";
import { diaryStyle } from "@/lib/diary";
import { useLang } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { listInbox, InboxItem, demoEnabled } from "@/lib/supabase/data";
import { playSignal, isMuted } from "@/lib/chime";
import { initialsFrom } from "@/lib/format";

const p = theme;

/**
 * Tells you, while you are in the app, that someone answered one of your
 * memories. A card slides in, the signal sounds, and tapping it opens the dream
 * on the response. It leaves on its own after a few seconds.
 *
 * Mounted once in the layout, so it works from whichever screen you are on.
 */
export default function ReactionAlerts() {
  const router = useRouter();
  const { t } = useLang();
  const [item, setItem] = useState<InboxItem | null>(null);
  const seen = useRef<Set<string> | null>(null);
  const hideTimer = useRef<number | null>(null);

  const show = (next: InboxItem) => {
    setItem(next);
    if (!isMuted()) playSignal();
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setItem(null), 5200);
  };

  // The profile's sound row asks for a demonstration, so you can see and hear
  // exactly what a response looks like without waiting for one.
  useEffect(() => {
    const preview = async () => {
      const rows = await listInbox().catch(() => [] as InboxItem[]);
      if (rows.length) show(rows[0]);
    };
    window.addEventListener("dreamers:preview-alert", preview);
    return () => window.removeEventListener("dreamers:preview-alert", preview);
  }, []);

  useEffect(() => {
    let alive = true;

    // Learn what is already there before announcing anything, or opening the app
    // would replay every response you have ever had.
    listInbox()
      .then((rows) => { if (alive) seen.current = new Set(rows.map((r) => r.id)); })
      .catch(() => { if (alive) seen.current = new Set(); });

    // Preview has no live database to listen to, so it stages one response a few
    // seconds in, which is the only way to see and hear the real thing here.
    if (demoEnabled()) {
      const demo = window.setTimeout(async () => {
        const rows = await listInbox().catch(() => [] as InboxItem[]);
        if (alive && rows.length) show(rows[0]);
      }, 3500);
      return () => { alive = false; window.clearTimeout(demo); };
    }

    // Ask the inbox what is new and announce the newest thing found. Used both
    // by the live event and by the checks below, so an answer surfaces the same
    // way however we came to hear about it.
    const catchUp = async (announce: boolean) => {
      const rows = await listInbox().catch(() => [] as InboxItem[]);
      if (!alive) return;
      // A response arriving in the first moments — before the baseline has
      // loaded — used to be thrown away. Take this reading as the baseline
      // instead, and simply say nothing about it.
      if (!seen.current) { seen.current = new Set(rows.map((r) => r.id)); return; }
      const fresh = rows.find((r) => !seen.current!.has(r.id));
      seen.current = new Set(rows.map((r) => r.id));
      if (fresh && announce) show(fresh);
    };

    const supabase = createClient();
    const channel = supabase
      .channel("reaction-alerts")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "entry_reactions" }, () => {
        // The row that arrives is not filtered to this user, and it carries no
        // titles, so ask the inbox what it means before showing anything.
        void catchUp(true);
      })
      .subscribe((status) => {
        // A channel that dies used to do it in complete silence, which is how a
        // notification can simply never arrive and nobody find out why.
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          console.warn(`[dreamers] reaction alerts channel: ${status}`);
        }
      });

    // The live socket is best-effort, not a guarantee: phone browsers suspend it
    // the moment the tab goes to the background — a screen that sleeps for a
    // second is enough — and whatever arrived meanwhile is gone. So we also ask,
    // on a slow timer and whenever the app is looked at again. An answer now
    // arrives within the minute even if the socket missed it entirely.
    const tick = window.setInterval(() => {
      if (document.visibilityState === "visible") void catchUp(true);
    }, 60000);
    const onVisible = () => { if (document.visibilityState === "visible") void catchUp(true); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      alive = false;
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      window.clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      void supabase.removeChannel(channel);
    };
  }, []);

  if (!item) return null;

  const color = p.dots[item.entry_type as DiaryType] ?? p.fabTo;
  const s = diaryStyle(color);
  const what = t(
    item.kind === "love" ? "rx.alertLoved"
      : item.kind === "sync" ? "rx.alertSynced"
      : item.kind === "reflection" ? "rx.alertReflected"
      : "rx.alertCommented",
  );

  return (
    <div
      onClick={() => { setItem(null); router.push(`/d/${item.entry_id}`); }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") { setItem(null); router.push(`/d/${item.entry_id}`); } }}
      style={{
        position: "absolute", top: 12, insetInlineStart: 12, insetInlineEnd: 12, zIndex: 90,
        display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 13px", borderRadius: 16,
        background: "linear-gradient(165deg, rgba(30,24,60,0.94), rgba(14,11,32,0.96))",
        border: `1px solid ${p.cardBorder}`, boxShadow: "0 18px 44px rgba(0,0,0,0.55)",
        backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", cursor: "pointer",
        animation: "riseUp 0.4s cubic-bezier(.2,.8,.2,1) both",
      }}
    >
      <span style={{ width: 4, borderRadius: 99, background: color, alignSelf: "stretch", flex: "0 0 auto" }} />
      <div style={{ width: 34, height: 34, borderRadius: "50%", flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", background: `linear-gradient(135deg, ${p.fabFrom}, ${p.fabTo})` }}>
        {initialsFrom(item.author_name, item.author_name ?? "?")}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: p.text, lineHeight: 1.35 }}>
          <b>{item.author_name ?? t("rx.someone")}</b> {what}{" "}
          <b style={{ color: s.nameColor }}>{item.entry_title}</b>
        </div>
        {item.body && (
          <div style={{ fontSize: 12, color: p.subtext, marginTop: 3, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {item.body}
          </div>
        )}
      </div>
    </div>
  );
}
