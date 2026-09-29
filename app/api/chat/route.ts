import { NextResponse } from "next/server";
import { brandSystemPrompt } from "@/lib/chat-prompt";
import { indexMissingGuidelines, topGuidelineChunks } from "@/lib/index-guidelines";
import { completeChat, embedTexts, openRouterKey } from "@/lib/openrouter";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (!openRouterKey()) {
    return NextResponse.json(
      { error: "Chat needs an OpenRouter API key before it can answer." },
      { status: 503 },
    );
  }

  let brandId = "";
  let threadId: string | null = null;
  let message = "";
  try {
    const body = (await request.json()) as {
      brandId?: string;
      threadId?: string | null;
      message?: string;
    };
    brandId = body.brandId ?? "";
    threadId = body.threadId ?? null;
    message = body.message?.trim() ?? "";
  } catch {
    return NextResponse.json({ error: "Missing message." }, { status: 400 });
  }
  if (!brandId || !message) {
    return NextResponse.json({ error: "Missing message." }, { status: 400 });
  }

  const { data: brand } = await supabase
    .from("brands")
    .select("id, name")
    .eq("id", brandId)
    .maybeSingle();
  if (!brand) {
    return NextResponse.json({ error: "Brand not found." }, { status: 404 });
  }

  if (!threadId) {
    const { data: created, error } = await supabase
      .from("chat_threads")
      .insert({
        user_id: user.id,
        brand_id: brandId,
        title: message.slice(0, 60),
      })
      .select("id")
      .single();
    if (error || !created) {
      return NextResponse.json(
        { error: error?.message ?? "Could not start a chat." },
        { status: 500 },
      );
    }
    threadId = created.id as string;
  }

  const { error: userMessageError } = await supabase.from("chat_messages").insert({
    user_id: user.id,
    thread_id: threadId,
    role: "user",
    content: message,
  });
  if (userMessageError) {
    return NextResponse.json({ error: userMessageError.message }, { status: 500 });
  }

  try {
    await indexMissingGuidelines(supabase, brandId);
    const [queryEmbedding] = await embedTexts([message]);
    const chunks = await topGuidelineChunks(supabase, brandId, queryEmbedding, 8);
    const { data: history } = await supabase
      .from("chat_messages")
      .select("role, content, created_at")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });
    const recent = (history ?? []).slice(-2).map((row) => ({
      role: row.role as string,
      content: row.content as string,
    }));
    const answer = await completeChat([
      { role: "system", content: brandSystemPrompt(brand.name as string, chunks) },
      ...recent,
    ]);

    const { error: assistantError } = await supabase.from("chat_messages").insert({
      user_id: user.id,
      thread_id: threadId,
      role: "assistant",
      content: answer,
    });
    if (assistantError) {
      return NextResponse.json({ error: assistantError.message }, { status: 500 });
    }
    await supabase
      .from("chat_threads")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", threadId);

    return NextResponse.json({
      threadId,
      message: answer,
      chunkCount: chunks.length,
    });
  } catch (caught) {
    const error = caught instanceof Error ? caught.message : "Chat failed.";
    return NextResponse.json({ error, threadId }, { status: 502 });
  }
}
