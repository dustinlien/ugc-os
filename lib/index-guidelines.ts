import type { SupabaseClient } from "@supabase/supabase-js";
import { chunkText } from "@/lib/chunks";
import { embedTexts } from "@/lib/openrouter";

function vectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}

function parseVector(value: unknown): number[] | null {
  if (Array.isArray(value)) return value.map(Number);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith("[")) return null;
  return trimmed
    .slice(1, -1)
    .split(",")
    .map((part) => Number(part))
    .filter((part) => Number.isFinite(part));
}

export function cosineSimilarity(left: number[], right: number[]): number {
  const length = Math.min(left.length, right.length);
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < length; index += 1) {
    dot += left[index] * right[index];
    leftNorm += left[index] * left[index];
    rightNorm += right[index] * right[index];
  }
  const denom = Math.sqrt(leftNorm) * Math.sqrt(rightNorm);
  return denom === 0 ? 0 : dot / denom;
}

export async function indexGuidelineFile(
  supabase: SupabaseClient,
  file: { id: string; user_id: string; brand_id: string; extracted_text: string },
): Promise<void> {
  const chunks = chunkText(file.extracted_text);
  await supabase.from("guideline_chunks").delete().eq("file_id", file.id);
  if (chunks.length === 0) return;

  const embeddings = await embedTexts(chunks);
  const rows = chunks.map((content, chunkIndex) => ({
    user_id: file.user_id,
    brand_id: file.brand_id,
    file_id: file.id,
    chunk_index: chunkIndex,
    content,
    embedding: vectorLiteral(embeddings[chunkIndex] ?? []),
  }));
  const { error } = await supabase.from("guideline_chunks").insert(rows);
  if (error) throw new Error(error.message);
}

export async function indexMissingGuidelines(
  supabase: SupabaseClient,
  brandId: string,
): Promise<void> {
  const { data: files } = await supabase
    .from("guideline_files")
    .select("id, user_id, brand_id, extracted_text")
    .eq("brand_id", brandId)
    .eq("extract_status", "ready");

  for (const file of files ?? []) {
    if (!file.extracted_text) continue;
    const { count } = await supabase
      .from("guideline_chunks")
      .select("id", { count: "exact", head: true })
      .eq("file_id", file.id);
    if ((count ?? 0) > 0) continue;
    await indexGuidelineFile(supabase, {
      id: file.id,
      user_id: file.user_id,
      brand_id: file.brand_id,
      extracted_text: file.extracted_text,
    });
  }
}

export async function topGuidelineChunks(
  supabase: SupabaseClient,
  brandId: string,
  queryEmbedding: number[],
  limit = 8,
): Promise<{ content: string }[]> {
  const { data, error } = await supabase
    .from("guideline_chunks")
    .select("content, embedding")
    .eq("brand_id", brandId);
  if (error) throw new Error(error.message);

  return (data ?? [])
    .map((row) => ({
      content: row.content as string,
      score: cosineSimilarity(queryEmbedding, parseVector(row.embedding) ?? []),
    }))
    .filter((row) => row.content)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
