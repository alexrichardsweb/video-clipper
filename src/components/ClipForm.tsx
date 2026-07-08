"use client";

import { formatDuration } from "@/lib/time";

type ClipFormProps = {
  prefix: string;
  name: string;
  start: string;
  end: string;
  error: string | null;
  disabled: boolean;
  onPrefixChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onGenerateName: () => void;
  onSetStart: () => void;
  onSetEnd: () => void;
  onAddClip: () => void;
};

export function ClipForm({
  prefix,
  name,
  start,
  end,
  error,
  disabled,
  onPrefixChange,
  onNameChange,
  onGenerateName,
  onSetStart,
  onSetEnd,
  onAddClip,
}: ClipFormProps) {
  const duration = start && end ? formatDuration(start, end) : "—";

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
        New clip
      </h2>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded border border-neutral-800 bg-neutral-950 px-3 py-2">
          <div className="text-xs text-neutral-500">Start</div>
          <div className="font-mono text-base">{start || "--:--:--"}</div>
        </div>
        <div className="rounded border border-neutral-800 bg-neutral-950 px-3 py-2">
          <div className="text-xs text-neutral-500">End</div>
          <div className="font-mono text-base">{end || "--:--:--"}</div>
        </div>
      </div>

      <div className="mt-2 rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm">
        <span className="text-xs text-neutral-500">Duration: </span>
        <span className="font-mono">{duration}</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onSetStart}
          disabled={disabled}
          className="rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Set Start (A)
        </button>
        <button
          type="button"
          onClick={onSetEnd}
          disabled={disabled}
          className="rounded bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Set End (S)
        </button>
      </div>

      <div className="mt-4 space-y-3">
        <label className="block text-sm">
          <span className="mb-1 block text-xs text-neutral-500">
            Prefix (e.g. adverts)
          </span>
          <input
            type="text"
            value={prefix}
            onChange={(e) => onPrefixChange(e.target.value)}
            placeholder="adverts"
            className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 font-mono text-sm outline-none focus:border-neutral-500"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-xs text-neutral-500">Clip name</span>
          <div className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onAddClip();
                }
              }}
              placeholder="adverts_1"
              className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 font-mono text-sm outline-none focus:border-neutral-500"
            />
            <button
              type="button"
              onClick={onGenerateName}
              className="whitespace-nowrap rounded border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-800"
              title="Generate next numbered name from the prefix"
            >
              Auto #
            </button>
          </div>
        </label>

        <button
          type="button"
          onClick={onAddClip}
          className="w-full rounded bg-white px-3 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-200"
        >
          Add Clip (Enter)
        </button>

        {error && (
          <p className="rounded border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
