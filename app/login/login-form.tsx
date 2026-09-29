"use client";

import { FormEvent, MouseEvent, useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm({ initialError }: { initialError: string | null }) {
  const configured = isSupabaseConfigured();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(initialError);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<
    "sign-in" | "sign-up" | "google" | null
  >(null);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAuth("sign-in", event.currentTarget);
  }

  async function signUp(event: MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;
    if (!form) return;
    await runAuth("sign-up", form);
  }

  async function runAuth(mode: "sign-in" | "sign-up", form: HTMLFormElement) {
    setError(null);
    setNotice(null);
    const data = new FormData(form);
    const emailValue = String(data.get("email") ?? "").trim();
    const passwordValue = String(data.get("password") ?? "");
    setEmail(emailValue);
    setPassword(passwordValue);

    if (!emailValue || passwordValue.length < 6) {
      setError("Enter an email and a password of at least 6 characters.");
      return;
    }

    setPending(mode);
    try {
      const supabase = createClient();
      const result =
        mode === "sign-in"
          ? await supabase.auth.signInWithPassword({
              email: emailValue,
              password: passwordValue,
            })
          : await supabase.auth.signUp({
              email: emailValue,
              password: passwordValue,
            });

      if (result.error) {
        setError(result.error.message);
        return;
      }

      if (mode === "sign-up" && !result.data.session) {
        setNotice("Check your email to confirm the account, then sign in.");
        return;
      }

      window.location.assign("/");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sign-in failed.");
    } finally {
      setPending(null);
    }
  }

  async function signInWithGoogle() {
    setError(null);
    setNotice(null);
    setPending("google");
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (oauthError) {
      setPending(null);
      setError(oauthError.message);
    }
  }

  if (!configured) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-6">
        <h1 className="text-xl font-semibold tracking-tight">UGC OS — sign in</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to
          .env.local, then restart the dev server.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-5 py-10">
      <p className="text-sm text-muted-foreground">Brands, quotas, scripts.</p>
      <h1 className="mt-1 text-4xl font-semibold">UGC OS</h1>
      <form onSubmit={signIn} className="mt-6 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Email
            <Input
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Password
            <Input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {notice ? (
            <p className="text-sm text-muted-foreground">{notice}</p>
          ) : null}
          <Button type="submit" className="w-full" disabled={pending !== null}>
            {pending === "sign-in" ? "Signing in…" : "Sign in"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={pending !== null}
            onClick={signUp}
          >
            {pending === "sign-up" ? "Creating account…" : "Create account"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={pending !== null}
            onClick={signInWithGoogle}
          >
            {pending === "google" ? "Redirecting…" : "Continue with Google"}
          </Button>
        </form>
    </main>
  );
}
