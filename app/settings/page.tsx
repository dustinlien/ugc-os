import { SignOutButton } from "@/app/settings/sign-out-button";
import { AppShell } from "@/components/layout/app-shell";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  const chatModel =
    process.env.OPENROUTER_CHAT_MODEL ?? "google/gemini-2.5-flash";
  const embedModel =
    process.env.OPENROUTER_EMBED_MODEL ?? "openai/text-embedding-3-small";

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-lg flex-col gap-8">
      <header>
        <p className="text-sm text-muted-foreground">UGC OS</p>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Account</h2>
        <p className="text-sm text-muted-foreground">
          {error
            ? "Could not load the signed-in account."
            : (data.user?.email ?? "No email on this account")}
        </p>
        <SignOutButton />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Models</h2>
        <dl className="grid grid-cols-[8rem_1fr] gap-y-1 text-sm">
          <dt className="text-muted-foreground">Chat</dt>
          <dd className="font-mono text-xs">{chatModel}</dd>
          <dt className="text-muted-foreground">Embeddings</dt>
          <dd className="font-mono text-xs">{embedModel}</dd>
        </dl>
      </section>
      </div>
    </AppShell>
  );
}
