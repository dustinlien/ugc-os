export function openRouterKey(): string | null {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  return key ? key : null;
}

export async function embedTexts(inputs: string[]): Promise<number[][]> {
  const key = openRouterKey();
  if (!key) {
    throw new Error("Add OPENROUTER_API_KEY before chat can search guidelines.");
  }
  const model = process.env.OPENROUTER_EMBED_MODEL ?? "openai/text-embedding-3-small";
  const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, input: inputs }),
  });
  const body = (await response.json().catch(() => null)) as {
    error?: { message?: string };
    data?: { index: number; embedding: number[] }[];
  } | null;
  if (!response.ok || !body?.data) {
    throw new Error(body?.error?.message ?? "Embedding request failed.");
  }
  return body.data
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((item) => item.embedding);
}

export async function completeChat(messages: { role: string; content: string }[]): Promise<string> {
  const key = openRouterKey();
  if (!key) {
    throw new Error("Add OPENROUTER_API_KEY before chat can answer.");
  }
  const model = process.env.OPENROUTER_CHAT_MODEL ?? "google/gemini-2.5-flash";
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages }),
  });
  const body = (await response.json().catch(() => null)) as {
    error?: { message?: string };
    choices?: { message?: { content?: string | { text?: string }[] } }[];
  } | null;
  if (!response.ok) {
    throw new Error(body?.error?.message ?? "Chat request failed.");
  }
  const content = body?.choices?.[0]?.message?.content;
  if (typeof content === "string" && content.trim()) return content;
  if (Array.isArray(content)) {
    const text = content.map((part) => part.text ?? "").join("").trim();
    if (text) return text;
  }
  throw new Error("The model returned an empty answer.");
}
