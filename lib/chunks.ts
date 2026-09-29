const CHUNK_CHARS = 3500;
const OVERLAP_CHARS = 600;

export function chunkText(text: string): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];

  const chunks: string[] = [];
  let start = 0;
  while (start < cleaned.length) {
    const end = Math.min(cleaned.length, start + CHUNK_CHARS);
    chunks.push(cleaned.slice(start, end));
    if (end === cleaned.length) break;
    const next = end - OVERLAP_CHARS;
    if (next <= start) break;
    start = next;
  }
  return chunks;
}
