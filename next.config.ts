import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native addon; it is in Next's default external list,
  // kept explicit here so the dependency on that behavior is visible.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
