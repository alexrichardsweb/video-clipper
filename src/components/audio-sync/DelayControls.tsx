"use client";

import { useEffect, useState } from "react";
import { formatDelay } from "@/lib/media-time";
import { DELAY_MAX, DELAY_MIN } from "@/lib/audio-sync-command";

type DelayControlsProps = {
  delayMs: number;
  onSetDelay: (value: number) => void;
};

const STEPS: ReadonlyArray<number> = [-1000, -100, -10, 10, 100, 1000];

export function DelayControls({ delayMs, onSetDelay }: DelayControlsProps) {
  // Local text so the numeric field can hold transient values like "-".
  const [text, setText] = useState<string>(String(delayMs));

  useEffect(() => {
    setText(String(delayMs));
  }, [delayMs]);

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
          Audio delay
        </h2>
        <span
          className={`font-mono text-2xl font-bold ${
            delayMs === 0
              ? "text-neutral-300"
              : delayMs > 0
                ? "text-amber-300"
                : "text-sky-300"
          }`}
        >
          {formatDelay(delayMs)}
        </span>
      </div>

      <p className="mb-3 rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-neutral-400">
        <span className="text-amber-300">Positive</span> values delay the audio
        (plays later). <span className="text-sky-300">Negative</span> values make
        the audio play earlier.
      </p>

      <input
        type="range"
        min={DELAY_MIN}
        max={DELAY_MAX}
        step={10}
        value={delayMs}
        onChange={(e) => onSetDelay(Number(e.target.value))}
        className="w-full accent-emerald-500"
        aria-label="Audio delay slider"
      />

      <div className="mt-3 flex items-center gap-2">
        <input
          type="number"
          value={text}
          step={10}
          onChange={(e) => {
            setText(e.target.value);
            const n = parseInt(e.target.value, 10);
            if (!Number.isNaN(n)) onSetDelay(n);
          }}
          onBlur={() => setText(String(delayMs))}
          className="w-28 rounded border border-neutral-700 bg-neutral-950 px-3 py-2 font-mono text-sm outline-none focus:border-neutral-500"
          aria-label="Audio delay in milliseconds"
        />
        <span className="text-sm text-neutral-500">ms</span>
        <button
          type="button"
          onClick={() => onSetDelay(0)}
          className="ml-auto rounded border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-800"
        >
          Reset
        </button>
      </div>

      <div className="mt-3 grid grid-cols-6 gap-1.5">
        {STEPS.map((step) => (
          <button
            key={step}
            type="button"
            onClick={() => onSetDelay(delayMs + step)}
            className="rounded border border-neutral-700 px-1 py-2 font-mono text-xs hover:bg-neutral-800"
          >
            {step > 0 ? `+${step}` : step}
          </button>
        ))}
      </div>
    </div>
  );
}
