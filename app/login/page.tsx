"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Clapperboard } from "lucide-react";
import { login } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startPending] = React.useTransition();

  function submit() {
    if (!password) return;
    startPending(async () => {
      try {
        const result = await login({ password });
        if (!result.ok) throw new Error(result.error);
        router.replace("/");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not sign in");
      }
    });
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex w-full max-w-xs flex-col gap-4 rounded-2xl bg-card p-6 shadow-card"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Clapperboard className="size-4" aria-hidden />
          </span>
          <div>
            <h1 className="text-sm font-semibold tracking-tight">Content OS</h1>
            <p className="text-xs text-muted-foreground">Sign in to continue</p>
          </div>
        </div>
        <Input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError(null);
          }}
          placeholder="Password"
          aria-label="Password"
          autoComplete="current-password"
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button type="submit" disabled={pending || !password}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </main>
  );
}
