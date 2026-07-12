"use client";

import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import {
  formatDelay,
  getExpectedAudioTime,
  secondsToTimestampWithMilliseconds,
} from "@/lib/media-time";
import { DRIFT_THRESHOLD_MS } from "@/lib/audio-sync-command";

type SyncStatusProps = {
  videoRef: RefObject<HTMLVideoElement>;
  audioRef: RefObject<HTMLAudioElement>;
  delayMs: number;
  duration: number;
};

/**
 * Live playback readout. Updates the DOM directly via a requestAnimationFrame
 * loop instead of React state, so it can refresh every frame without causing
 * re-renders.
 */
export function SyncStatus({
  videoRef,
  audioRef,
  delayMs,
  duration,
}: SyncStatusProps) {
  const videoTimeRef = useRef<HTMLSpanElement>(null);
  const audioTargetRef = useRef<HTMLSpanElement>(null);
  const audioActualRef = useRef<HTMLSpanElement>(null);
  const driftRef = useRef<HTMLSpanElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const v = videoRef.current;
      const a = audioRef.current;
      if (v) {
        const videoTime = v.currentTime;
        const expected = getExpectedAudioTime(videoTime, delayMs);
        const audioTime = a ? a.currentTime : 0;
        const drift = (audioTime - expected) * 1000;

        if (videoTimeRef.current) {
          videoTimeRef.current.textContent =
            secondsToTimestampWithMilliseconds(videoTime);
        }
        if (audioTargetRef.current) {
          audioTargetRef.current.textContent =
            secondsToTimestampWithMilliseconds(expected);
        }
        if (audioActualRef.current) {
          audioActualRef.current.textContent =
            secondsToTimestampWithMilliseconds(audioTime);
        }
        if (driftRef.current) {
          driftRef.current.textContent = `${drift >= 0 ? "+" : ""}${Math.round(
            drift,
          )} ms`;
        }
        if (statusRef.current) {
          let label: string;
          let cls: string;
          if (v.paused) {
            label = "Paused";
            cls = "text-neutral-400";
          } else if (Math.abs(drift) <= DRIFT_THRESHOLD_MS) {
            label = "In sync";
            cls = "text-emerald-400";
          } else {
            label = "Correcting…";
            cls = "text-amber-400";
          }
          statusRef.current.textContent = label;
          statusRef.current.className = `font-mono font-semibold ${cls}`;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [videoRef, audioRef, delayMs]);

  const row = (label: string, node: React.ReactNode) => (
    <div className="flex items-center justify-between gap-4 px-3 py-2">
      <span className="text-xs text-neutral-500">{label}</span>
      {node}
    </div>
  );

  return (
    <div className="divide-y divide-neutral-800 rounded-lg border border-neutral-800 bg-neutral-900/60">
      <h2 className="px-3 py-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">
        Live sync
      </h2>
      {row(
        "Video",
        <span ref={videoTimeRef} className="font-mono text-sm">
          00:00:00.000
        </span>,
      )}
      {row(
        "Duration",
        <span className="font-mono text-sm text-neutral-400">
          {secondsToTimestampWithMilliseconds(duration)}
        </span>,
      )}
      {row(
        "Delay",
        <span className="font-mono text-sm">{formatDelay(delayMs)}</span>,
      )}
      {row(
        "Audio target",
        <span ref={audioTargetRef} className="font-mono text-sm">
          00:00:00.000
        </span>,
      )}
      {row(
        "Audio actual",
        <span ref={audioActualRef} className="font-mono text-sm text-neutral-400">
          00:00:00.000
        </span>,
      )}
      {row(
        "Drift",
        <span ref={driftRef} className="font-mono text-sm text-neutral-400">
          +0 ms
        </span>,
      )}
      {row(
        "Status",
        <span ref={statusRef} className="font-mono font-semibold text-neutral-400">
          Paused
        </span>,
      )}
    </div>
  );
}
