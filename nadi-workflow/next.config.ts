import type { NextConfig } from "next";
import path from "path";

// Cache-bust: 2026-02-28T06:15:00Z
const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  serverExternalPackages: [
    "@libsql/client",
    "@libsql/isomorphic-fetch",
    "@prisma/adapter-libsql",
    "libsql",
    "@libsql/hrana-client",
  ],
};

export default nextConfig;
