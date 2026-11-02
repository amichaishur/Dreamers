/**
 * The notification sound, synthesised rather than shipped as a file: no download,
 * no weight, and it works the same on every device.
 *
 * "Distant signal" — a clean note that rises, like a transmission arriving, with
 * a high shimmer a beat behind it.
 *
 * Browsers refuse to play audio until the person has touched the page, and a
 * response arriving is never a touch. So the engine is built once and unlocked
 * on the first tap anywhere, then kept — a fresh one made later, outside a
 * gesture, stays silent for good on iOS and usually on Android too. That is why
 * the sound only ever worked for whoever had just pressed the button that plays
 * it, and never when a real answer came in.
 */

type Ctor = typeof AudioContext;
function audioCtor(): Ctor | null {
  if (typeof window === "undefined") return null;
  return window.AudioContext ?? (window as unknown as { webkitAudioContext?: Ctor }).webkitAudioContext ?? null;
}

let ctx: AudioContext | null = null;
let listening = false;

/** The one engine, created on demand and never closed. */
function engine(): AudioContext | null {
  if (ctx) return ctx;
  const C = audioCtor();
  if (!C) return null;
  try { ctx = new C(); } catch { return null; }
  return ctx;
}

/**
 * Wake the engine from inside a real user gesture. Called by the listener below
 * and by the button on the profile, which is a gesture already.
 */
function unlock() {
  const c = engine();
  if (!c) return;
  if (c.state === "suspended") void c.resume().catch(() => {});
}

/**
 * Listen once for the first touch, click or key anywhere in the app and unlock
 * there. Capture phase, so a tap still unlocks even when something stops the
 * event; passive, so scrolling is never held up.
 */
export function armChime() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  const onFirst = () => unlock();
  const opts = { capture: true, passive: true } as const;
  window.addEventListener("pointerdown", onFirst, opts);
  window.addEventListener("touchstart", onFirst, opts);
  window.addEventListener("keydown", onFirst, opts);
  // A tab coming back to the front resumes an engine the browser suspended
  // while it was hidden, which is what happens on a phone between answers.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") unlock();
  });
}

export function playSignal() {
  const c = engine();
  if (!c) return;
  try {
    // Try once more in case this call is itself inside a gesture; harmless if not.
    if (c.state === "suspended") void c.resume().catch(() => {});

    const note = (freq: number, at: number, dur: number, vol: number, slideTo?: number) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      const t0 = c.currentTime + at;
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(vol, t0 + 0.014);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
      // Each note frees itself; the engine itself is never closed, because a
      // closed one cannot be reopened without another gesture.
      osc.onended = () => { try { osc.disconnect(); gain.disconnect(); } catch { /* already gone */ } };
    };

    note(523, 0, 0.55, 0.1, 1046);
    note(1568, 0.22, 0.6, 0.05);
  } catch {
    // No audio available: the notification still appears on screen.
  }
}

/** True when audio is ready to sound right now, for the profile to say so. */
export function chimeReady(): boolean {
  return ctx?.state === "running";
}

const MUTE_KEY = "dreamers_mute";

export function isMuted(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(MUTE_KEY) === "1";
}

export function setMuted(muted: boolean) {
  if (typeof window === "undefined") return;
  if (muted) window.localStorage.setItem(MUTE_KEY, "1");
  else window.localStorage.removeItem(MUTE_KEY);
}
