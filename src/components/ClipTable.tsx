"use client";

import { useState, type KeyboardEvent } from "react";
import type { Clip } from "@/lib/types";
import { formatDuration, hhmmssToSeconds } from "@/lib/time";

type ClipTableProps = {
  clips: Clip[];
  onToggleInclude: (id: string) => void;
  onDelete: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onUpdate: (id: string, patch: Pick<Clip, "start" | "end" | "name">) => void;
  onSeekTo: (seconds: number) => void;
};

type EditField = "start" | "end" | "name";

type EditState = {
  id: string;
  start: string;
  end: string;
  name: string;
  focus: EditField;
};

export function ClipTable({
  clips,
  onToggleInclude,
  onDelete,
  onMoveUp,
  onMoveDown,
  onUpdate,
  onSeekTo,
}: ClipTableProps) {
  const [editing, setEditing] = useState<EditState | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const startEdit = (clip: Clip, focus: EditField = "name") => {
    setEditError(null);
    setEditing({
      id: clip.id,
      start: clip.start,
      end: clip.end,
      name: clip.name,
      focus,
    });
  };

  const saveEdit = () => {
    if (!editing) return;
    const start = editing.start.trim();
    const end = editing.end.trim();
    const name = editing.name.trim();
    const s = hhmmssToSeconds(start);
    const e = hhmmssToSeconds(end);
    if (Number.isNaN(s)) return setEditError("Invalid start (use HH:MM:SS).");
    if (Number.isNaN(e)) return setEditError("Invalid end (use HH:MM:SS).");
    if (!name) return setEditError("Name is required.");
    if (e <= s) return setEditError("End must be after start.");
    onUpdate(editing.id, { start, end, name });
    setEditing(null);
    setEditError(null);
  };

  const onEditKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setEditing(null);
      setEditError(null);
    }
  };

  if (clips.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-800 bg-neutral-900/40 p-8 text-center text-sm text-neutral-500">
        No clips yet. Mark a start (A) and end (S), name it, then press Enter.
      </div>
    );
  }

  const inputClass =
    "w-full rounded border border-neutral-600 bg-neutral-950 px-2 py-1 font-mono text-xs outline-none focus:border-neutral-400";

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-800">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-800 bg-neutral-900/80 text-left text-xs uppercase tracking-wide text-neutral-400">
            <th className="px-3 py-2 text-center" title="Include in files.txt">
              Merge
            </th>
            <th className="px-3 py-2">#</th>
            <th className="px-3 py-2">Start</th>
            <th className="px-3 py-2">End</th>
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Duration</th>
            <th className="px-3 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {clips.map((clip, index) => {
            const isEditing = editing?.id === clip.id;
            return (
              <tr
                key={clip.id}
                className="border-b border-neutral-800/70 last:border-0 hover:bg-neutral-900/40"
              >
                <td className="px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={clip.includeInMerge}
                    onChange={() => onToggleInclude(clip.id)}
                    className="h-4 w-4 accent-emerald-500"
                    aria-label={`Include ${clip.name} in files.txt`}
                  />
                </td>
                <td className="px-3 py-2 text-neutral-500">{index + 1}</td>

                {isEditing ? (
                  <>
                    <td className="px-3 py-2">
                      <input
                        className={inputClass}
                        value={editing.start}
                        autoFocus={editing.focus === "start"}
                        onKeyDown={onEditKeyDown}
                        onChange={(e) =>
                          setEditing({ ...editing, start: e.target.value })
                        }
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className={inputClass}
                        value={editing.end}
                        autoFocus={editing.focus === "end"}
                        onKeyDown={onEditKeyDown}
                        onChange={(e) =>
                          setEditing({ ...editing, end: e.target.value })
                        }
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className={inputClass}
                        value={editing.name}
                        autoFocus={editing.focus === "name"}
                        onKeyDown={onEditKeyDown}
                        onChange={(e) =>
                          setEditing({ ...editing, name: e.target.value })
                        }
                      />
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => onSeekTo(hhmmssToSeconds(clip.start))}
                        className="font-mono text-sky-300 hover:text-sky-200 hover:underline"
                        title="Seek video to this time"
                      >
                        {clip.start}
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => onSeekTo(hhmmssToSeconds(clip.end))}
                        className="font-mono text-sky-300 hover:text-sky-200 hover:underline"
                        title="Seek video to this time"
                      >
                        {clip.end}
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => startEdit(clip, "name")}
                        className="rounded px-1 font-mono hover:bg-neutral-800 hover:ring-1 hover:ring-neutral-600"
                        title="Click to edit name"
                      >
                        {clip.name}
                      </button>
                    </td>
                  </>
                )}

                <td className="px-3 py-2 font-mono text-neutral-400">
                  {formatDuration(clip.start, clip.end)}
                </td>

                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-1">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={saveEdit}
                          className="rounded bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-500"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(null);
                            setEditError(null);
                          }}
                          className="rounded border border-neutral-700 px-2 py-1 text-xs hover:bg-neutral-800"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => onMoveUp(clip.id)}
                          disabled={index === 0}
                          className="rounded border border-neutral-700 px-2 py-1 text-xs hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-30"
                          aria-label="Move up"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => onMoveDown(clip.id)}
                          disabled={index === clips.length - 1}
                          className="rounded border border-neutral-700 px-2 py-1 text-xs hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-30"
                          aria-label="Move down"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => startEdit(clip)}
                          className="rounded border border-neutral-700 px-2 py-1 text-xs hover:bg-neutral-800"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(clip.id)}
                          className="rounded border border-red-800 px-2 py-1 text-xs text-red-300 hover:bg-red-950"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {editError && (
        <p className="border-t border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">
          {editError}
        </p>
      )}
    </div>
  );
}
