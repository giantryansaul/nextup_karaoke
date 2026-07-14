export const PLAYBACK_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

export type PlaybackRate = (typeof PLAYBACK_RATES)[number];

export function formatPlaybackRate(rate: number): string {
  // Avoid trailing zeros like 1.00 — show 1×, 1.25×, 0.5×
  const label = Number.isInteger(rate) ? String(rate) : String(rate);
  return `${label}×`;
}

export function stepPlaybackRate(current: number, direction: -1 | 1): PlaybackRate {
  const idx = PLAYBACK_RATES.findIndex((r) => r === current);
  const safeIdx = idx === -1 ? PLAYBACK_RATES.indexOf(1) : idx;
  const next = Math.min(PLAYBACK_RATES.length - 1, Math.max(0, safeIdx + direction));
  return PLAYBACK_RATES[next];
}

export function canStepPlaybackRate(current: number, direction: -1 | 1): boolean {
  const idx = PLAYBACK_RATES.findIndex((r) => r === current);
  const safeIdx = idx === -1 ? PLAYBACK_RATES.indexOf(1) : idx;
  const next = safeIdx + direction;
  return next >= 0 && next < PLAYBACK_RATES.length;
}
