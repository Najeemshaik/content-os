// Session token shared by the proxy (edge-safe) and the login action.
// Single-user app: the session is a static HMAC of the server secret, so a
// valid cookie can only come from a successful login. Rotate by changing
// AUTH_SECRET (or APP_PASSWORD when no separate secret is set).

export const SESSION_COOKIE = "cos-session";

const encoder = new TextEncoder();

export function authEnabled(): boolean {
  return Boolean(process.env.APP_PASSWORD);
}

export async function sessionToken(): Promise<string> {
  const secret = process.env.AUTH_SECRET ?? process.env.APP_PASSWORD ?? "";
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode("content-os-session-v1"),
  );
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
