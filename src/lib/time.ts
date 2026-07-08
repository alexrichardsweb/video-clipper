/**
 * Convert a number of seconds into a stable HH:MM:SS string.
 * Seconds are floored so that export output is deterministic.
 */
export function secondsToHHMMSS(seconds: number): string {
  const safe = Number.isFinite(seconds) ? seconds : 0;
  const total = Math.max(0, Math.floor(safe));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number): string => n.toString().padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/**
 * Parse an HH:MM:SS string back into seconds.
 * Returns NaN when the input is not a valid time string.
 */
export function hhmmssToSeconds(time: string): number {
  const parts = time.trim().split(":");
  if (parts.length !== 3) return NaN;
  const nums = parts.map((p) => Number(p.trim()));
  if (nums.some((n) => Number.isNaN(n) || n < 0)) return NaN;
  const [h, m, s] = nums;
  return h * 3600 + m * 60 + s;
}

/**
 * Return the duration between two HH:MM:SS strings as an HH:MM:SS string.
 * Returns 00:00:00 when either value is invalid or end precedes start.
 */
export function formatDuration(start: string, end: string): string {
  const startSeconds = hhmmssToSeconds(start);
  const endSeconds = hhmmssToSeconds(end);
  if (Number.isNaN(startSeconds) || Number.isNaN(endSeconds)) {
    return "00:00:00";
  }
  return secondsToHHMMSS(Math.max(0, endSeconds - startSeconds));
}
