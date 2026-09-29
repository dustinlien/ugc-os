import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  serverExternalPackages: ["unpdf", "mammoth"],
  // This repo may sit inside another project that also has a lockfile.
  // Pin the root so Turbopack does not walk up and pick the wrong one.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
