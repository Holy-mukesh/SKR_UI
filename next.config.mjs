/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true
  },
  // This folder is the project root (ignore any package-lock.json in folders above it)
  turbopack: {
    root: import.meta.dirname
  }
};

export default nextConfig;
