/** Supported delay range (milliseconds) for the audio sync tool. */
export const DELAY_MIN = -5000;
export const DELAY_MAX = 5000;

/** Drift beyond this (milliseconds) triggers an audio position correction. */
export const DRIFT_THRESHOLD_MS = 80;

export const DEFAULT_OUTPUT_NAME = "synced-output.mp4";

/**
 * Quote a value for safe use as a single shell argument.
 * Single quotes are the safest wrapper; embedded single quotes are escaped
 * with the standard '\'' idiom.
 */
export function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

/**
 * Build the ffmpeg audio filter expression for a delay, or null for zero
 * delay (no filtering needed).
 *
 * Positive delay: pad the start of the audio (adelay).
 * Negative delay: trim the start of the audio (atrim) so it plays earlier.
 */
export function buildFilter(delayMs: number): string | null {
  if (delayMs === 0) return null;
  if (delayMs > 0) {
    return `[0:a]adelay=${delayMs}:all=1[a]`;
  }
  const seconds = (Math.abs(delayMs) / 1000).toFixed(3);
  return `[0:a]atrim=start=${seconds},asetpts=PTS-STARTPTS[a]`;
}

/**
 * Build the full ffmpeg command for the given input, output and delay.
 * The video stream is always stream-copied; audio is re-encoded when a filter
 * is applied, or copied when there is no adjustment.
 */
export function buildFfmpegCommand(
  inputName: string,
  outputName: string,
  delayMs: number,
): string {
  const input = shellQuote(inputName);
  const output = shellQuote(outputName);
  const filter = buildFilter(delayMs);

  if (filter === null) {
    return [
      "ffmpeg -hide_banner -y \\",
      `  -i ${input} \\`,
      "  -map 0:v:0 -map 0:a:0 \\",
      "  -c:v copy \\",
      "  -c:a copy \\",
      "  -movflags +faststart \\",
      `  ${output}`,
    ].join("\n");
  }

  return [
    "ffmpeg -hide_banner -y \\",
    `  -i ${input} \\`,
    `  -filter_complex ${shellQuote(filter)} \\`,
    `  -map 0:v:0 -map "[a]" \\`,
    "  -c:v copy \\",
    "  -c:a aac -b:a 128k \\",
    "  -movflags +faststart \\",
    `  ${output}`,
  ].join("\n");
}

/** Wrap a command in a runnable bash script (Unix line endings). */
export function buildShellScript(command: string): string {
  return `#!/usr/bin/env bash\nset -e\n${command}\n`;
}
