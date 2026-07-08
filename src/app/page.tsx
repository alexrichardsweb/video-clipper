"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Clip } from "@/lib/types";
import { secondsToHHMMSS, hhmmssToSeconds } from "@/lib/time";
import { ClipForm } from "@/components/ClipForm";
import { ClipTable } from "@/components/ClipTable";
import { ExportPanel } from "@/components/ExportPanel";
import { HotkeyHelp } from "@/components/HotkeyHelp";

const STORAGE_KEY = "video-clipper-state-v1";

type PersistedState = {
  clips: Clip[];
  videoName: string;
  prefix: string;
  name: string;
  start: string;
  end: string;
};

/** Escape a string for safe use inside a RegExp. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Compute the next "prefix_N" name based on existing clips.
 *  A blank prefix falls back to "clip", producing clip_1, clip_2, … */
function nextNameFor(prefix: string, clips: Clip[]): string {
  const p = prefix.trim() || "clip";
  const re = new RegExp(`^${escapeRegExp(p)}_(\\d+)$`);
  let max = 0;
  for (const clip of clips) {
    const match = clip.name.match(re);
    if (match) {
      const n = Number(match[1]);
      if (n > max) max = n;
    }
  }
  return `${p}_${max + 1}`;
}

type Handlers = {
  seekBy: (delta: number) => void;
  togglePlay: () => void;
  setStartFromCurrent: () => void;
  setEndFromCurrent: () => void;
  addClip: () => void;
};

export default function Page() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoName, setVideoName] = useState<string>("");
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  const [start, setStart] = useState<string>("");
  const [end, setEnd] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [prefix, setPrefix] = useState<string>("");
  // Tracks whether the user has typed a custom name; while false the name
  // follows the prefix (prefix_N). Cleared again when the name is emptied.
  const [nameEdited, setNameEdited] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [clips, setClips] = useState<Clip[]>([]);
  const [restoredMessage, setRestoredMessage] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState<boolean>(false);

  // ---- Load persisted state on mount ------------------------------------
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PersistedState>;
        if (Array.isArray(parsed.clips)) setClips(parsed.clips);
        if (typeof parsed.videoName === "string") setVideoName(parsed.videoName);
        if (typeof parsed.prefix === "string") setPrefix(parsed.prefix);
        if (typeof parsed.name === "string") {
          setName(parsed.name);
          setNameEdited(parsed.name.trim().length > 0);
        }
        if (typeof parsed.start === "string") setStart(parsed.start);
        if (typeof parsed.end === "string") setEnd(parsed.end);

        const clipCount = Array.isArray(parsed.clips) ? parsed.clips.length : 0;
        if (clipCount > 0 || parsed.videoName) {
          setRestoredMessage(
            `Restored ${clipCount} clip(s)${
              parsed.videoName ? ` for "${parsed.videoName}"` : ""
            }. Please re-select the video file — the browser cannot re-open it automatically.`,
          );
        }
      }
    } catch {
      // Ignore malformed persisted state.
    }
    setHydrated(true);
  }, []);

  // ---- Persist state -----------------------------------------------------
  useEffect(() => {
    if (!hydrated) return;
    const data: PersistedState = { clips, videoName, prefix, name, start, end };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Ignore quota / private-mode errors.
    }
  }, [hydrated, clips, videoName, prefix, name, start, end]);

  // ---- Revoke object URL on unmount -------------------------------------
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  // ---- File loading ------------------------------------------------------
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setVideoUrl(url);
    setVideoName(file.name);
    setRestoredMessage(null);
    setError(null);
    setCurrentTime(0);
    setDuration(0);
  };

  // ---- Video actions -----------------------------------------------------
  const seekBy = useCallback((delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    const dur = Number.isFinite(v.duration) ? v.duration : 0;
    const target = Math.min(dur, Math.max(0, v.currentTime + delta));
    // Seek directly — no per-keypress React state update; the "seeked"
    // and "timeupdate" events refresh the displayed time.
    v.currentTime = target;
  }, []);

  const seekTo = useCallback((seconds: number) => {
    const v = videoRef.current;
    if (!v || Number.isNaN(seconds)) return;
    const dur = Number.isFinite(v.duration) ? v.duration : 0;
    v.currentTime = dur ? Math.min(dur, Math.max(0, seconds)) : Math.max(0, seconds);
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      void v.play();
    } else {
      v.pause();
    }
  }, []);

  const setStartFromCurrent = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    setStart(secondsToHHMMSS(v.currentTime));
    setError(null);
  }, []);

  const setEndFromCurrent = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    setEnd(secondsToHHMMSS(v.currentTime));
    setError(null);
  }, []);

  const handleNameChange = useCallback((value: string) => {
    setName(value);
    // Empty name → resume prefix-driven auto-naming.
    setNameEdited(value.trim().length > 0);
  }, []);

  const handlePrefixChange = useCallback(
    (value: string) => {
      setPrefix(value);
      if (!nameEdited) setName(nextNameFor(value, clips));
    },
    [nameEdited, clips],
  );

  const generateName = useCallback(() => {
    setName(nextNameFor(prefix, clips));
    setNameEdited(false);
  }, [prefix, clips]);

  const addClip = useCallback(() => {
    const s = start.trim();
    const e = end.trim();
    // A blank name defaults to the next clip_N (via the "clip" fallback prefix).
    const nm = name.trim() || nextNameFor(prefix, clips);
    const startSeconds = hhmmssToSeconds(s);
    const endSeconds = hhmmssToSeconds(e);

    if (!s || Number.isNaN(startSeconds)) {
      setError("Set a valid start time first (press A).");
      return;
    }
    if (!e || Number.isNaN(endSeconds)) {
      setError("Set a valid end time first (press S).");
      return;
    }
    if (endSeconds <= startSeconds) {
      setError("End must be after start.");
      return;
    }

    const clip: Clip = {
      id: crypto.randomUUID(),
      start: s,
      end: e,
      name: nm,
      includeInMerge: true,
    };
    const updated = [...clips, clip];
    setClips(updated);
    setError(null);

    // Auto-advance for fast sequential clipping:
    // next name is prefix_(N+1), start jumps to the previous end.
    setName(nextNameFor(prefix, updated));
    setNameEdited(false);
    setStart(e);
    setEnd("");
  }, [start, end, name, prefix, clips]);

  // ---- Clip table operations --------------------------------------------
  const toggleInclude = useCallback((id: string) => {
    setClips((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, includeInMerge: !c.includeInMerge } : c,
      ),
    );
  }, []);

  const deleteClip = useCallback((id: string) => {
    setClips((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const moveClip = useCallback((id: string, direction: -1 | 1) => {
    setClips((prev) => {
      const index = prev.findIndex((c) => c.id === id);
      if (index === -1) return prev;
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  }, []);

  const updateClip = useCallback(
    (id: string, patch: Pick<Clip, "start" | "end" | "name">) => {
      setClips((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      );
    },
    [],
  );

  // ---- Global keyboard shortcuts ----------------------------------------
  const handlersRef = useRef<Handlers>({
    seekBy,
    togglePlay,
    setStartFromCurrent,
    setEndFromCurrent,
    addClip,
  });
  // Keep the latest closures without re-registering the listener.
  handlersRef.current = {
    seekBy,
    togglePlay,
    setStartFromCurrent,
    setEndFromCurrent,
    addClip,
  };

  useEffect(() => {
    const isTyping = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target.isContentEditable
      );
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (isTyping(event.target)) return;
      const h = handlersRef.current;
      switch (event.key) {
        case " ":
          event.preventDefault();
          h.togglePlay();
          break;
        case "ArrowLeft":
          event.preventDefault();
          h.seekBy(-10);
          break;
        case "ArrowRight":
          event.preventDefault();
          h.seekBy(10);
          break;
        case ",":
          event.preventDefault();
          h.seekBy(-1);
          break;
        case ".":
          event.preventDefault();
          h.seekBy(1);
          break;
        case "k":
        case "K":
          event.preventDefault();
          h.seekBy(-30);
          break;
        case "l":
        case "L":
          event.preventDefault();
          h.seekBy(30);
          break;
        case "i":
        case "I":
          event.preventDefault();
          h.seekBy(-60);
          break;
        case "o":
        case "O":
          event.preventDefault();
          h.seekBy(60);
          break;
        case "a":
        case "A":
          event.preventDefault();
          h.setStartFromCurrent();
          break;
        case "s":
        case "S":
          event.preventDefault();
          h.setEndFromCurrent();
          break;
        case "Enter":
          event.preventDefault();
          h.addClip();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="min-h-screen px-4 py-6">
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-2 border-b border-neutral-800 pb-4">
        <h1 className="text-2xl font-bold">🎬 Video Clipper</h1>
        <div className="text-sm text-neutral-400">
          {videoName ? (
            <span>
              Loaded:{" "}
              <span className="font-mono text-neutral-200">{videoName}</span>
              {!videoUrl && " (re-select to play)"}
            </span>
          ) : (
            <span>No video loaded</span>
          )}
        </div>
      </header>

      {restoredMessage && (
        <div className="mb-4 rounded-lg border border-amber-800 bg-amber-950/40 px-4 py-3 text-sm text-amber-200">
          {restoredMessage}
        </div>
      )}

      <div className="mb-4">
        <label className="inline-flex cursor-pointer items-center gap-3 rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm hover:border-neutral-500">
          <span className="font-medium">Choose video file</span>
          <input
            type="file"
            accept="video/*"
            onChange={onFileChange}
            className="text-neutral-400 file:mr-3 file:rounded file:border-0 file:bg-neutral-700 file:px-3 file:py-1.5 file:text-sm file:text-white hover:file:bg-neutral-600"
          />
        </label>
        <p className="mt-1 text-xs text-neutral-500">
          Files stay on your machine — nothing is uploaded.
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Video + time display */}
        <div className="min-w-0 flex-1">
          <div className="overflow-hidden rounded-lg border border-neutral-800 bg-black">
            {videoUrl ? (
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                className="aspect-video w-full bg-black"
                onLoadedMetadata={(e) =>
                  setDuration(e.currentTarget.duration || 0)
                }
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onSeeked={(e) => setCurrentTime(e.currentTarget.currentTime)}
              />
            ) : (
              <div className="flex aspect-video w-full items-center justify-center text-sm text-neutral-600">
                Select a video file to begin
              </div>
            )}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded border border-neutral-800 bg-neutral-900/60 px-3 py-2">
              <div className="text-xs text-neutral-500">Current time</div>
              <div className="font-mono text-lg">
                {secondsToHHMMSS(currentTime)}
              </div>
            </div>
            <div className="rounded border border-neutral-800 bg-neutral-900/60 px-3 py-2">
              <div className="text-xs text-neutral-500">Duration</div>
              <div className="font-mono text-lg">
                {secondsToHHMMSS(duration)}
              </div>
            </div>
          </div>
        </div>

        {/* Clip form + hotkeys */}
        <div className="space-y-4 lg:w-80 lg:shrink-0">
          <ClipForm
            prefix={prefix}
            name={name}
            start={start}
            end={end}
            error={error}
            disabled={!videoUrl}
            onPrefixChange={handlePrefixChange}
            onNameChange={handleNameChange}
            onGenerateName={generateName}
            onSetStart={setStartFromCurrent}
            onSetEnd={setEndFromCurrent}
            onAddClip={addClip}
          />
          <HotkeyHelp />
        </div>
      </div>

      {/* Clip table */}
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">
          Clips{" "}
          <span className="text-sm font-normal text-neutral-500">
            ({clips.length})
          </span>
        </h2>
        <ClipTable
          clips={clips}
          onToggleInclude={toggleInclude}
          onDelete={deleteClip}
          onMoveUp={(id) => moveClip(id, -1)}
          onMoveDown={(id) => moveClip(id, 1)}
          onUpdate={updateClip}
          onSeekTo={seekTo}
        />
      </section>

      {/* Exports */}
      <section className="mt-8">
        <ExportPanel clips={clips} videoName={videoName} />
      </section>

      <footer className="mt-10 border-t border-neutral-800 pt-4 text-center text-xs text-neutral-600">
        Local-only utility · nothing leaves your browser
      </footer>
    </div>
  );
}
