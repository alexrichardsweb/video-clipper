"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS: ReadonlyArray<{ href: string; label: string }> = [
  { href: "/", label: "Clipping" },
  { href: "/audio-sync", label: "Audio Sync" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="border-b border-neutral-800 bg-neutral-900/80">
      <div className="flex items-center gap-2 px-4 py-2">
        <span className="mr-2 text-sm font-semibold text-neutral-500">
          🎬 Video Clipper
        </span>
        {LINKS.map((link) => {
          const active =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={
                active
                  ? "rounded bg-white px-3 py-1.5 text-sm font-medium text-neutral-900"
                  : "rounded px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800"
              }
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
