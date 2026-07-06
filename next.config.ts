import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Stage 1 seed data uses picsum.photos as image placeholders.
      // Stage 3: add your CDN / S3 / Cloudinary domain here once you plug in real product photos.
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
    ],
  },
};

export default nextConfig;
