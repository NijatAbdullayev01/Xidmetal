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
) {
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

async function playChime(pattern: Array<{ freq: number; offset: number; duration: number; gain: number }>): Promise<void> {
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
    for (const tone of pattern) {
      playTone(ctx, tone.freq, now + tone.offset, tone.duration, tone.gain);
    }
  } catch {
    // Autoplay bloklanarsa səssiz keç
  }
}

/** Mesaj bildirişi — aydın üç tonlu zəng. */
export async function playMessageNotificationSound(): Promise<void> {
  await playChime([
    { freq: 880, offset: 0, duration: 0.14, gain: 0.11 },
    { freq: 1174.66, offset: 0.12, duration: 0.16, gain: 0.1 },
    { freq: 1318.51, offset: 0.26, duration: 0.18, gain: 0.09 },
  ]);
}

/** Sifariş bildirişi — daha aşağı, təcili tonlar. */
export async function playBookingNotificationSound(): Promise<void> {
  await playChime([
    { freq: 523.25, offset: 0, duration: 0.14, gain: 0.12 },
    { freq: 659.25, offset: 0.13, duration: 0.14, gain: 0.11 },
    { freq: 783.99, offset: 0.26, duration: 0.2, gain: 0.1 },
  ]);
}

/** Admin / platforma bildirişi — düzəliş, təsdiq, elan. */
export async function playAdminNotificationSound(): Promise<void> {
  await playChime([
    { freq: 698.46, offset: 0, duration: 0.16, gain: 0.12 },
    { freq: 880, offset: 0.14, duration: 0.2, gain: 0.1 },
  ]);
}
