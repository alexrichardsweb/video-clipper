const HOTKEYS: ReadonlyArray<{ keys: string; action: string }> = [
  { keys: "Space", action: "Play / pause" },
  { keys: "← / →", action: "Seek 10s" },
  { keys: ", / .", action: "Seek 1s" },
  { keys: "k / l", action: "Seek 30s" },
  { keys: "i / o", action: "Seek 60s" },
  { keys: "A", action: "Set start" },
  { keys: "S", action: "Set end" },
  { keys: "Enter", action: "Add clip" },
];

export function HotkeyHelp() {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
        Hotkeys
      </h2>
      <dl className="space-y-1.5 text-sm">
        {HOTKEYS.map((h) => (
          <div key={h.keys} className="flex items-center justify-between gap-4">
            <dt>
              <kbd className="rounded border border-neutral-700 bg-neutral-800 px-2 py-0.5 font-mono text-xs">
                {h.keys}
              </kbd>
            </dt>
            <dd className="text-neutral-400">{h.action}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-neutral-500">
        Hotkeys are ignored while typing in a text field. Click the video first.
      </p>
    </div>
  );
}
