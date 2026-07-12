"use client";

import { useState } from "react";
import { copyText, downloadText } from "@/lib/download";
import { formatDelay } from "@/lib/media-time";
import {
  buildFfmpegCommand,
  buildFilter,
  buildShellScript,
} from "@/lib/audio-sync-command";

type FfmpegCommandProps = {
  inputName: string;
  outputName: string;
  delayMs: number;
  onOutputNameChange: (value: string) => void;
};

export function FfmpegCommand({
  inputName,
  outputName,
  delayMs,
  onOutputNameChange,
}: FfmpegCommandProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const command = buildFfmpegCommand(inputName, outputName, delayMs);
  const filter = buildFilter(delayMs);

  const flash = (key: string, ok: boolean) => {
    setCopied(ok ? key : `err:${key}`);
    window.setTimeout(() => setCopied(null), 1500);
  };

  const label = (key: string, base: string) =>
    copied === key ? "Copied!" : copied === `err:${key}` ? "Copy failed" : base;

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
          ffmpeg command
        </h2>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-xs text-neutral-500">Output</span>
          <input
            type="text"
            value={outputName}
            onChange={(e) => onOutputNameChange(e.target.value)}
            className="w-56 rounded border border-neutral-700 bg-neutral-950 px-3 py-1.5 font-mono text-sm outline-none focus:border-neutral-500"
          />
        </label>
      </div>

      <p className="mb-3 text-xs text-neutral-400">
        {delayMs === 0 ? (
          <span className="text-neutral-300">
            No sync adjustment is applied — the audio is copied as-is
            (stream-copy remux).
          </span>
        ) : delayMs > 0 ? (
          <>
            Delaying audio by{" "}
            <span className="text-amber-300">{formatDelay(delayMs)}</span> using{" "}
            <code className="text-neutral-300">adelay</code>.
          </>
        ) : (
          <>
            Advancing audio by{" "}
            <span className="text-sky-300">{formatDelay(delayMs)}</span> by
            trimming <code className="text-neutral-300">atrim</code>{" "}
            {(Math.abs(delayMs) / 1000).toFixed(3)}s from the start.
          </>
        )}
      </p>

      <pre className="overflow-x-auto rounded border border-neutral-800 bg-neutral-950 p-3 font-mono text-xs leading-relaxed text-neutral-200">
        {command}
      </pre>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={async () => flash("cmd", await copyText(command))}
          className="rounded bg-white px-3 py-1.5 text-xs font-semibold text-neutral-900 hover:bg-neutral-200"
        >
          {label("cmd", "Copy command")}
        </button>
        <button
          type="button"
          onClick={() =>
            downloadText("audio-sync.sh", buildShellScript(command))
          }
          className="rounded border border-neutral-700 px-3 py-1.5 text-xs hover:bg-neutral-800"
        >
          Download audio-sync.sh
        </button>
        <button
          type="button"
          onClick={async () =>
            flash("delay", await copyText(String(delayMs)))
          }
          className="rounded border border-neutral-700 px-3 py-1.5 text-xs hover:bg-neutral-800"
        >
          {label("delay", "Copy delay")}
        </button>
        {filter && (
          <button
            type="button"
            onClick={async () => flash("filter", await copyText(filter))}
            className="rounded border border-neutral-700 px-3 py-1.5 text-xs hover:bg-neutral-800"
          >
            {label("filter", "Copy filter")}
          </button>
        )}
      </div>
    </div>
  );
}
