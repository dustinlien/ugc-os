export const MAX_GUIDELINE_BYTES = 15 * 1024 * 1024;
export const PREVIEW_CHARS = 2000;

export const GUIDELINE_EXTENSIONS = ["pdf", "docx", "txt", "md"] as const;

export type ExtractStatus = "pending" | "ready" | "failed";

export type GuidelineFile = {
  id: string;
  file_name: string;
  storage_path: string;
  byte_size: number | null;
  extract_status: ExtractStatus;
  extract_error: string | null;
  extracted_text: string | null;
  created_at: string;
};

export function guidelineExtension(fileName: string): string | null {
  const match = fileName.toLowerCase().match(/\.([a-z0-9]+)$/);
  const extension = match?.[1];
  if (!extension || !GUIDELINE_EXTENSIONS.includes(extension as (typeof GUIDELINE_EXTENSIONS)[number])) {
    return null;
  }
  return extension;
}

export function safeStorageName(fileName: string): string {
  const base = fileName.split(/[/\\]/).pop() ?? "file";
  const cleaned = base.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return (cleaned || "file").slice(0, 120);
}
