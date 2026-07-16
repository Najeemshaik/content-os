import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @libsql/client ships native/wasm binaries; keep it external to the bundle.
  serverExternalPackages: ["@libsql/client"],
  // migrate() reads SQL files from disk at runtime — make sure they're traced
  // into the serverless bundle on Vercel.
  outputFileTracingIncludes: {
    // Keys are route globs; cover the root route and every nested route.
    "/*": ["./lib/db/migrations/**/*"],
    "/**": ["./lib/db/migrations/**/*"],
  },
};

export default nextConfig;
