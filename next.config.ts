import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Silence "multiple lockfiles" warning when another lockfile exists (e.g. in home dir)
  turbopack: { root: path.resolve(process.cwd()) },
};

export default nextConfig;
