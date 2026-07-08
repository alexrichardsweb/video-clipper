import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Video Clipper",
  description: "Create video clip lists and ffmpeg merge lists locally in the browser.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
