import type { NextConfig } from "next";
import path from "path";

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
