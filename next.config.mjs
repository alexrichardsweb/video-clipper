/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The app is 100% client-side (no SSR/API routes), so emit a fully static
  // site into `out/` for simple static hosting on Netlify.
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
