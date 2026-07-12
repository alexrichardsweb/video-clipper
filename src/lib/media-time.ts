/**
 * Format seconds as HH:MM:SS.mmm (milliseconds matter on the sync page).
 */
export function secondsToTimestampWithMilliseconds(seconds: number): string {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const totalMs = Math.floor(safe * 1000);
  const ms = totalMs % 1000;
  const totalSeconds = Math.floor(totalMs / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number, len = 2): string => n.toString().padStart(len, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(ms, 3)}`;
}

/**
 * The audio position that corresponds to the current video position for a
 * given delay.
 *
 *   expectedAudioTime = videoTime - audioDelayMilliseconds / 1000
 *
 * Positive delay => audio sits *behind* the video (plays later).
 * Negative delay => audio sits *ahead* of the video (plays earlier).
 *
 * Clamped so it never falls below zero.
 */
export function getExpectedAudioTime(
  videoTime: number,
  delayMilliseconds: number,
): number {
  const expected = videoTime - delayMilliseconds / 1000;
  return expected < 0 ? 0 : expected;
}

/** Clamp a delay to the supported range and coerce to an integer. */
export function clampDelay(ms: number, min: number, max: number): number {
  if (!Number.isFinite(ms)) return 0;
  return Math.min(max, Math.max(min, Math.round(ms)));
}

/** Format a delay with an explicit sign, e.g. "+450 ms", "0 ms", "-200 ms". */
export function formatDelay(ms: number): string {
  const sign = ms > 0 ? "+" : ms < 0 ? "-" : "";
  return `${sign}${Math.abs(ms)} ms`;
}
