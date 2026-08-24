let audioContext: AudioContext | null = null;
let lastPlayAt = 0;
const MIN_PLAY_GAP_MS = 1_200;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  if (!audioContext) {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    audioContext = new AudioCtx();
  }

  return audioContext;
}

/** Brauzer autoplay siyasəti üçün ilk istifadəçi jestində AudioContext-i açır. */
export async function unlockNotificationAudio(): Promise<void> {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      // ignore
    }
  }
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  startAt: number,
  duration: number,
  gainValue: number,
): void {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, startAt);

  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(gainValue, startAt + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  oscillator.connect(gain);
  gain.connect(ctx.destination);

  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.02);
}

/** Admin növbə bildirişi — qısa iki tonlu siqnal. */
export async function playAdminAttentionSound(): Promise<void> {
  const nowMs = Date.now();
  if (nowMs - lastPlayAt < MIN_PLAY_GAP_MS) return;
  lastPlayAt = nowMs;

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const now = ctx.currentTime;
    playTone(ctx, 880, now, 0.14, 0.12);
    playTone(ctx, 1174.66, now + 0.13, 0.2, 0.1);
  } catch {
    // Autoplay bloklanarsa səssiz keç
  }
}
