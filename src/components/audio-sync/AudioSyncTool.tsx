"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { clampDelay, getExpectedAudioTime } from "@/lib/media-time";
import {
  DEFAULT_OUTPUT_NAME,
  DELAY_MAX,
  DELAY_MIN,
  DRIFT_THRESHOLD_MS,
} from "@/lib/audio-sync-command";
import { DelayControls } from "./DelayControls";
import { SyncStatus } from "./SyncStatus";
import { FfmpegCommand } from "./FfmpegCommand";

const STORAGE_KEY = "audio-sync-prefs-v1";

type PersistedPrefs = {
  delayMs: number;
  outputName: string;
};

type Handlers = {
  togglePlay: () => void;
  seekBy: (delta: number) => void;
  adjustDelay: (delta: number) => void;
  resetDelay: () => void;
};

const HOTKEYS: ReadonlyArray<{ keys: string; action: string }> = [
  { keys: "Space", action: "Play / pause" },
  { keys: "← / →", action: "Seek 10s" },
  { keys: ", / .", action: "Seek 2s" },
  { keys: "[ / ]", action: "Delay -/+ 10ms" },
  { keys: "{ / }", action: "Delay -/+ 100ms" },
  { keys: "\\", action: "Reset delay" },
];

export function AudioSyncTool() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const delayRef = useRef<number>(0);

  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [videoName, setVideoName] = useState<string>("");
  const [duration, setDuration] = useState<number>(0);
  const [delayMs, setDelayMs] = useState<number>(0);
  const [outputName, setOutputName] = useState<string>(DEFAULT_OUTPUT_NAME);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [restoredPrefs, setRestoredPrefs] = useState<boolean>(false);
  const [hydrated, setHydrated] = useState<boolean>(false);

  // ---- Persistence -------------------------------------------------------
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PersistedPrefs>;
        if (typeof parsed.delayMs === "number") {
          const d = clampDelay(parsed.delayMs, DELAY_MIN, DELAY_MAX);
          setDelayMs(d);
          delayRef.current = d;
        }
        if (typeof parsed.outputName === "string" && parsed.outputName.trim()) {
          setOutputName(parsed.outputName);
        }
        setRestoredPrefs(true);
      }
    } catch {
      // Ignore malformed prefs.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const data: PersistedPrefs = { delayMs, outputName };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Ignore quota / private-mode errors.
    }
  }, [hydrated, delayMs, outputName]);

  // ---- Reflect the loaded filename in the tab title ----------------------
  useEffect(() => {
    document.title = videoName ? `${videoName} · Audio Sync` : "Audio Sync";
    return () => {
      document.title = "Video Clipper";
    };
  }, [videoName]);

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
    setMediaUrl(url);
    setVideoName(file.name);
    setAudioError(null);
    setDuration(0);
    setRestoredPrefs(false);
  };

  // ---- Audio position sync ----------------------------------------------
  const applyAudioPosition = useCallback(() => {
    const v = videoRef.current;
    const a = audioRef.current;
    if (!v || !a) return;
    a.currentTime = getExpectedAudioTime(v.currentTime, delayRef.current);
  }, []);

  // Keep the delay ref in step and resync immediately when the delay changes,
  // whether playback is running or paused.
  useEffect(() => {
    delayRef.current = delayMs;
    applyAudioPosition();
  }, [delayMs, applyAudioPosition]);

  // ---- Video event handlers (video is the master clock) ------------------
  const handlePlay = useCallback(() => {
    const v = videoRef.current;
    const a = audioRef.current;
    if (!v || !a) return;
    a.currentTime = getExpectedAudioTime(v.currentTime, delayRef.current);
    a.playbackRate = v.playbackRate;
    const promise = a.play();
    if (promise !== undefined) {
      promise
        .then(() => setAudioError(null))
        .catch(() =>
          setAudioError(
            "The browser could not start audio playback. Press play again after interacting with the page, and make sure the file actually contains an audio track.",
          ),
        );
    }
  }, []);

  const handlePause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const handleSeek = useCallback(() => {
    applyAudioPosition();
  }, [applyAudioPosition]);

  const handleEnded = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const handleRateChange = useCallback(() => {
    const v = videoRef.current;
    const a = audioRef.current;
    if (!v || !a) return;
    a.playbackRate = v.playbackRate;
    applyAudioPosition();
  }, [applyAudioPosition]);

  const handleLoadedMetadata = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true; // video is silent; the <audio> element carries the sound
    setDuration(Number.isFinite(v.duration) ? v.duration : 0);
  }, []);

  const handleAudioError = useCallback(() => {
    setAudioError(
      "Could not load audio from this file. It may have no audio track or use a codec the browser cannot decode. The ffmpeg command will still work on the original file.",
    );
  }, []);

  // ---- Drift correction (lightweight interval, refs only) ----------------
  useEffect(() => {
    const id = window.setInterval(() => {
      const v = videoRef.current;
      const a = audioRef.current;
      if (!v || !a || v.paused || a.paused) return;
      const target = getExpectedAudioTime(v.currentTime, delayRef.current);
      if (Math.abs(a.currentTime - target) > DRIFT_THRESHOLD_MS / 1000) {
        a.currentTime = target;
      }
    }, 250);
    return () => window.clearInterval(id);
  }, []);

  // ---- Playback / seek / delay actions -----------------------------------
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      void v.play();
    } else {
      v.pause();
    }
  }, []);

  const seekBy = useCallback((delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    const dur = Number.isFinite(v.duration) ? v.duration : 0;
    v.currentTime = Math.min(dur, Math.max(0, v.currentTime + delta));
  }, []);

  const replayLast = useCallback((seconds: number) => {
    const v = videoRef.current;
    if (!v) return;
    const dur = Number.isFinite(v.duration) ? v.duration : 0;
    v.currentTime = Math.min(dur, Math.max(0, v.currentTime - seconds));
    void v.play();
  }, []);

  const setDelayClamped = useCallback((value: number) => {
    setDelayMs(clampDelay(value, DELAY_MIN, DELAY_MAX));
  }, []);

  const adjustDelay = useCallback(
    (delta: number) => setDelayMs((d) => clampDelay(d + delta, DELAY_MIN, DELAY_MAX)),
    [],
  );

  const resetDelay = useCallback(() => setDelayMs(0), []);

  // ---- Global keyboard shortcuts ----------------------------------------
  const handlersRef = useRef<Handlers>({
    togglePlay,
    seekBy,
    adjustDelay,
    resetDelay,
  });
  handlersRef.current = { togglePlay, seekBy, adjustDelay, resetDelay };

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
          h.seekBy(-2);
          break;
        case ".":
          event.preventDefault();
          h.seekBy(2);
          break;
        // On a US layout Shift+[ / Shift+] produce { / }.
        case "[":
          event.preventDefault();
          h.adjustDelay(-10);
          break;
        case "]":
          event.preventDefault();
          h.adjustDelay(10);
          break;
        case "{":
          event.preventDefault();
          h.adjustDelay(-100);
          break;
        case "}":
          event.preventDefault();
          h.adjustDelay(100);
          break;
        case "\\":
          event.preventDefault();
          h.resetDelay();
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
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-neutral-800 pb-4">
        <h1 className="text-2xl font-bold">🔊 Audio Sync</h1>
        <div className="text-sm text-neutral-400">
          {videoName ? (
            <span>
              Loaded:{" "}
              <span className="font-mono text-neutral-200">{videoName}</span>
            </span>
          ) : (
            <span>No video loaded</span>
          )}
        </div>
      </header>

      <p className="mb-4 rounded-lg border border-neutral-800 bg-neutral-900/60 px-4 py-3 text-sm text-neutral-300">
        Load a video, then adjust the audio delay until it looks in sync. The
        browser preview is for <strong>finding the correct offset</strong>; the
        generated ffmpeg command applies the final adjustment to a new file.
      </p>

      {restoredPrefs && !mediaUrl && (
        <div className="mb-4 rounded-lg border border-amber-800 bg-amber-950/40 px-4 py-3 text-sm text-amber-200">
          Restored your saved delay and output name. Please select the video
          again — the browser cannot re-open local files automatically.
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

      {audioError && (
        <div className="mb-4 rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300">
          {audioError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Video + playback controls */}
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-lg border border-neutral-800 bg-black">
            {mediaUrl ? (
              <video
                ref={videoRef}
                src={mediaUrl}
                controls
                muted
                playsInline
                className="aspect-video w-full bg-black"
                onLoadedMetadata={handleLoadedMetadata}
                onPlay={handlePlay}
                onPause={handlePause}
                onSeeking={handleSeek}
                onSeeked={handleSeek}
                onEnded={handleEnded}
                onRateChange={handleRateChange}
              />
            ) : (
              <div className="flex aspect-video w-full items-center justify-center text-sm text-neutral-600">
                Select a video file to begin
              </div>
            )}
          </div>

          {/* Hidden audio element carries the (delayed) sound. */}
          {mediaUrl && (
            <audio
              ref={audioRef}
              src={mediaUrl}
              preload="auto"
              className="hidden"
              onError={handleAudioError}
            />
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => seekBy(-2)}
              disabled={!mediaUrl}
              className="rounded border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-800 disabled:opacity-40"
            >
              Back 2s
            </button>
            <button
              type="button"
              onClick={() => seekBy(-10)}
              disabled={!mediaUrl}
              className="rounded border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-800 disabled:opacity-40"
            >
              Back 10s
            </button>
            <button
              type="button"
              onClick={() => replayLast(5)}
              disabled={!mediaUrl}
              className="rounded border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-800 disabled:opacity-40"
            >
              Replay last 5s
            </button>
            <button
              type="button"
              onClick={() => replayLast(2)}
              disabled={!mediaUrl}
              className="rounded border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-800 disabled:opacity-40"
            >
              Restart section
            </button>
          </div>

          <div className="mt-4">
            <SyncStatus
              videoRef={videoRef}
              audioRef={audioRef}
              delayMs={delayMs}
              duration={duration}
            />
          </div>
        </div>

        {/* Delay controls + hotkeys */}
        <div className="space-y-4">
          <DelayControls delayMs={delayMs} onSetDelay={setDelayClamped} />

          <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
              Hotkeys
            </h2>
            <dl className="space-y-1.5 text-sm">
              {HOTKEYS.map((h) => (
                <div
                  key={h.keys}
                  className="flex items-center justify-between gap-4"
                >
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
              Ignored while typing in a text field.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <FfmpegCommand
          inputName={videoName || "input.mp4"}
          outputName={outputName}
          delayMs={delayMs}
          onOutputNameChange={setOutputName}
        />
      </div>

      <footer className="mt-10 border-t border-neutral-800 pt-4 text-center text-xs text-neutral-600">
        Local-only utility · preview in the browser, apply with ffmpeg
      </footer>
    </div>
  );
}
