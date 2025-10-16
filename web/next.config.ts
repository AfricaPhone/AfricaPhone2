import { randomBytes } from "node:crypto";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const projectRoot = dirname(fileURLToPath(import.meta.url));
const DEVELOPMENT_BUILD_ID = "development";

const createRandomBuildId = () => randomBytes(16).toString("base64url").slice(0, 21);

const nextConfig: NextConfig = {
  generateBuildId: async () => {
    if (process.env.NODE_ENV !== "production") {
      return DEVELOPMENT_BUILD_ID;
    }
    return createRandomBuildId();
  },
  allowedDevOrigins: process.env.NEXT_ALLOWED_DEV_ORIGINS
    ? process.env.NEXT_ALLOWED_DEV_ORIGINS.split(",").map(origin => origin.trim()).filter(origin => origin.length > 0)
    : ["http://192.168.100.159:3000"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "storage.googleapis.com" },
      { protocol: "https", hostname: "africaphone-vente.firebasestorage.app" },
    ],
  },
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
