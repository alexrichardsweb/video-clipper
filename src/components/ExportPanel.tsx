"use client";

import { useState } from "react";
import type { Clip } from "@/lib/types";
import {
  buildClipsTxt,
  buildFilesTxt,
  buildClipSh,
  buildMergeSh,
} from "@/lib/exports";
import { copyText, downloadText } from "@/lib/download";

type ExportPanelProps = {
  clips: Clip[];
  videoName: string;
};

type ExportItem = {
  key: string;
  label: string;
  filename: string;
  content: string;
  disabled: boolean;
  hint: string;
};

export function ExportPanel({ clips, videoName }: ExportPanelProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const selectedCount = clips.filter((c) => c.includeInMerge).length;

  const items: ExportItem[] = [
    {
      key: "clips",
      label: "clips.txt",
      filename: "clips.txt",
      content: buildClipsTxt(clips),
      disabled: clips.length === 0,
      hint: `${clips.length} clip(s)`,
    },
    {
      key: "files",
      label: "files.txt",
      filename: "files.txt",
      content: buildFilesTxt(clips),
      disabled: selectedCount === 0,
      hint: `${selectedCount} selected`,
    },
    {
      key: "clipsh",
      label: "clip.sh",
      filename: "clip.sh",
      content: buildClipSh(videoName),
      disabled: false,
      hint: videoName ? `VIDEO="${videoName}"` : 'VIDEO="video.mp4"',
    },
    {
      key: "mergesh",
      label: "merge.sh",
      filename: "merge.sh",
      content: buildMergeSh(),
      disabled: false,
      hint: "concat → merged.mp4",
    },
  ];

  const handleCopy = async (item: ExportItem) => {
    const ok = await copyText(item.content);
    setCopied(ok ? item.key : `err:${item.key}`);
    window.setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
        Export &amp; copy
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.key}
            className="rounded border border-neutral-800 bg-neutral-950 p-3"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm">{item.label}</span>
              <span className="text-xs text-neutral-500">{item.hint}</span>
            </div>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => downloadText(item.filename, item.content)}
                disabled={item.disabled}
                className="flex-1 rounded bg-white px-3 py-1.5 text-xs font-semibold text-neutral-900 hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-30"
              >
                Download
              </button>
              <button
                type="button"
                onClick={() => handleCopy(item)}
                disabled={item.disabled}
                className="flex-1 rounded border border-neutral-700 px-3 py-1.5 text-xs hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-30"
              >
                {copied === item.key
                  ? "Copied!"
                  : copied === `err:${item.key}`
                    ? "Copy failed"
                    : "Copy"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
