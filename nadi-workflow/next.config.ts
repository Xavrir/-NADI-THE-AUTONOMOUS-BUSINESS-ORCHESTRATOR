import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@libsql/client",
    "@libsql/isomorphic-fetch",
    "@prisma/adapter-libsql",
    "libsql",
    "@libsql/hrana-client",
  ],
};

export default nextConfig;
