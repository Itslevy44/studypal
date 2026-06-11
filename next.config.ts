import type { NextConfig } from "next";
import { resolve } from "path";

const nextConfig: NextConfig = {
  // Tell Turbopack exactly where the root directory of the app is
  turbopack: {
    root: resolve("."),
  },
  allowedDevOrigins: ["172.18.2.16"],
};

export default nextConfig;