import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @libsql/client ships native/wasm binaries; keep it external to the bundle.
  serverExternalPackages: ["@libsql/client"],
  // migrate() reads SQL files from disk at runtime — make sure they're traced
  // into the serverless bundle on Vercel.
  outputFileTracingIncludes: {
    "/**/*": ["./lib/db/migrations/**/*"],
  },
};

export default nextConfig;
