/**
 * The notification sound, synthesised rather than shipped as a file: no download,
 * no weight, and it works the same on every device.
 *
 * "Distant signal" — a clean note that rises, like a transmission arriving, with
 * a high shimmer a beat behind it.
 */
export function playSignal() {
  if (typeof window === "undefined") return;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return;
  try {
    const ctx = new Ctor();
    // Browsers keep audio suspended until the user has interacted with the page.
    // The visual notification always lands; the sound simply joins once it can.
    if (ctx.state === "suspended") void ctx.resume();

    const note = (freq: number, at: number, dur: number, vol: number, slideTo?: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t0 = ctx.currentTime + at;
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(vol, t0 + 0.014);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    };

    note(523, 0, 0.55, 0.1, 1046);
    note(1568, 0.22, 0.6, 0.05);

    // Let the context go once the sound has finished rather than leaking one per ping.
    window.setTimeout(() => void ctx.close(), 1400);
  } catch {
    // No audio available: the notification still appears on screen.
  }
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
