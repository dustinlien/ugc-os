"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PLATFORMS, type IdeaStatus, type Platform } from "@/lib/ideas";
import { createClient } from "@/lib/supabase/client";

type Thread = { id: string; title: string };
type ChatMessage = { id: string; role: "user" | "assistant"; content: string };

function looksLikeScript(text: string): boolean {
  return /hook|spoken script|on-screen text|\bcta\b|caption/i.test(text);
}

export function ChatPanel({ brandId }: { brandId: string }) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chunkCount, setChunkCount] = useState<number | null>(null);
  const [saving, setSaving] = useState<ChatMessage | null>(null);

  async function loadThreads() {
    const supabase = createClient();
    const { data } = await supabase
      .from("chat_threads")
      .select("id, title")
      .eq("brand_id", brandId)
      .order("updated_at", { ascending: false });
    setThreads((data ?? []) as Thread[]);
  }

  async function openThread(id: string) {
    setThreadId(id);
    setError(null);
    const supabase = createClient();
    const { data } = await supabase
      .from("chat_messages")
      .select("id, role, content")
      .eq("thread_id", id)
      .order("created_at", { ascending: true });
    setMessages((data ?? []) as ChatMessage[]);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("chat_threads")
        .select("id, title")
        .eq("brand_id", brandId)
        .order("updated_at", { ascending: false });
      if (cancelled) return;
      const rows = (data ?? []) as Thread[];
      setThreads(rows);
      if (rows[0]) {
        const { data: history } = await supabase
          .from("chat_messages")
          .select("id, role, content")
          .eq("thread_id", rows[0].id)
          .order("created_at", { ascending: true });
        if (cancelled) return;
        setThreadId(rows[0].id);
        setMessages((history ?? []) as ChatMessage[]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [brandId]);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || pending) return;
    setError(null);
    setPending(true);
    setDraft("");
    const optimisticId = crypto.randomUUID();
    setMessages((current) => [
      ...current,
      { id: optimisticId, role: "user", content: text },
    ]);

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brandId, threadId, message: text }),
    });
    const body = (await response.json().catch(() => null)) as {
      threadId?: string;
      message?: string;
      chunkCount?: number;
      error?: string;
    } | null;
    if (!response.ok || !body?.message || !body.threadId) {
      setError(body?.error ?? "Chat failed.");
      if (body?.threadId) setThreadId(body.threadId);
      setPending(false);
      return;
    }

    setThreadId(body.threadId);
    setChunkCount(body.chunkCount ?? 0);
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "assistant", content: body.message as string },
    ]);
    await loadThreads();
    setPending(false);
  }

  return (
    <div className="flex h-[calc(100dvh-13.5rem)] min-h-[22rem] max-h-[40rem] flex-col gap-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setThreadId(null);
            setMessages([]);
            setChunkCount(null);
            setError(null);
          }}
        >
          New chat
        </Button>
        {threads.map((thread) => (
          <Button
            key={thread.id}
            type="button"
            size="sm"
            variant={thread.id === threadId ? "secondary" : "outline"}
            onClick={() => openThread(thread.id)}
          >
            {thread.title}
          </Button>
        ))}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto rounded-lg border p-3">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ask for a script. Answers use this brand’s guideline files.
          </p>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="text-sm">
              <p className="text-xs text-muted-foreground">
                {message.role === "user" ? "You" : "Assistant"}
              </p>
              <p className="whitespace-pre-wrap">{message.content}</p>
              {message.role === "assistant" ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => setSaving(message)}
                >
                  Save as idea
                </Button>
              ) : null}
            </div>
          ))
        )}
      </div>
      {chunkCount !== null ? (
        <p className="text-xs text-muted-foreground">
          {chunkCount > 0
            ? `Using ${chunkCount} guideline chunk${chunkCount === 1 ? "" : "s"}`
            : "No guideline chunks yet. Upload a brief on the Guidelines tab."}
        </p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <form onSubmit={send} className="flex items-end gap-2">
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Write a script for…"
          className="min-h-16"
        />
        <Button type="submit" disabled={pending || !draft.trim()}>
          {pending ? "Sending…" : "Send"}
        </Button>
      </form>
      {saving ? (
        <SaveIdeaDialog
          brandId={brandId}
          content={saving.content}
          onClose={() => setSaving(null)}
        />
      ) : null}
    </div>
  );
}

function SaveIdeaDialog({
  brandId,
  content,
  onClose,
}: {
  brandId: string;
  content: string;
  onClose: () => void;
}) {
  const defaultStatus: IdeaStatus = looksLikeScript(content) ? "script_ready" : "idea";
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Title is required.");
      return;
    }
    setPending(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("You are signed out.");
      setPending(false);
      return;
    }
    const { data: existing } = await supabase
      .from("ideas")
      .select("sort_order")
      .eq("brand_id", brandId)
      .eq("status", defaultStatus)
      .order("sort_order", { ascending: false })
      .limit(1);
    const sortOrder = ((existing?.[0]?.sort_order as number | undefined) ?? 0) + 1000;
    const { error: insertError } = await supabase.from("ideas").insert({
      user_id: user.id,
      brand_id: brandId,
      title: trimmed,
      platform,
      status: defaultStatus,
      script: content,
      notes: "",
      sort_order: sortOrder,
    });
    if (insertError) {
      setError(insertError.message);
      setPending(false);
      return;
    }
    onClose();
  }

  return (
    <form onSubmit={save} className="rounded-lg border p-3">
      <p className="text-sm font-medium">Save as idea</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Goes on the board as {defaultStatus === "script_ready" ? "Script ready" : "Idea"}.
      </p>
      <label className="mt-3 flex flex-col gap-1 text-sm">
        Title
        <Input value={title} onChange={(event) => setTitle(event.target.value)} required />
      </label>
      <label className="mt-3 flex flex-col gap-1 text-sm">
        Platform
        <select
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          value={platform}
          onChange={(event) => setPlatform(event.target.value as Platform)}
        >
          {PLATFORMS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      <div className="mt-3 flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
