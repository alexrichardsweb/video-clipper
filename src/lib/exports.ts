import type { Clip } from "./types";

/**
 * clips.txt — one line per clip: "START END NAME"
 */
export function buildClipsTxt(clips: Clip[]): string {
  if (clips.length === 0) return "";
  return clips.map((c) => `${c.start} ${c.end} ${c.name}`).join("\n") + "\n";
}

/**
 * files.txt — one line per SELECTED clip: "file 'NAME.mp4'"
 */
export function buildFilesTxt(clips: Clip[]): string {
  const selected = clips.filter((c) => c.includeInMerge);
  if (selected.length === 0) return "";
  return selected.map((c) => `file '${c.name}.mp4'`).join("\n") + "\n";
}

/**
 * clip.sh — cuts each clip out of the loaded video using ffmpeg.
 * The VIDEO variable defaults to the loaded filename where known.
 */
export function buildClipSh(videoName: string): string {
  const video = videoName.trim() || "video.mp4";
  return `#!/usr/bin/env bash
VIDEO="${video}"
CLIPS="clips.txt"

while IFS= read -r line <&3; do
  line=\${line//$'\\r'/}
  [[ -z "\${line//[[:space:]]/}" ]] && continue

  read -r start end name _ <<< "$line"

  # trim trailing whitespace safely in zsh
  name="$(echo "$name" | sed 's/[[:space:]]*$//')"

  output="\${name}.mp4"

  if [ -f "$output" ]; then
    echo "Skipping $name (already exists)"
    continue
  fi

  echo "Creating $name ($start -> $end)"
  ffmpeg -hide_banner -y -nostdin \\
    -ss "$start" -to "$end" \\
    -i "$VIDEO" \\
    -c:v libx264 -crf 22 -preset medium \\
    -c:a aac -b:a 128k \\
    -movflags +faststart \\
    "$output" </dev/null

done 3< "$CLIPS"
`;
}

/**
 * merge.sh — concat the selected clips listed in files.txt.
 */
export function buildMergeSh(): string {
  return `#!/usr/bin/env bash
ffmpeg -f concat -safe 0 -i files.txt -c copy merged.mp4
`;
}
