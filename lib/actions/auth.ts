"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { authEnabled, SESSION_COOKIE, sessionToken } from "@/lib/auth";
import type { ActionResult } from "@/lib/types";

export async function login(input: unknown): Promise<ActionResult> {
  try {
    const { password } = z.object({ password: z.string() }).parse(input);
    if (!authEnabled()) return { ok: true };
    if (password !== process.env.APP_PASSWORD) {
      return { ok: false, error: "Wrong password" };
    }
    (await cookies()).set(SESSION_COOKIE, await sessionToken(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not sign in" };
  }
}
