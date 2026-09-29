import mammoth from "mammoth";
import { extractText } from "unpdf";
import { guidelineExtension } from "@/lib/guidelines";

export async function extractGuidelineText(
  fileName: string,
  bytes: Uint8Array,
): Promise<string> {
  const extension = guidelineExtension(fileName);
  if (!extension) {
    throw new Error("Use a PDF, DOCX, TXT, or MD file.");
  }

  if (extension === "txt" || extension === "md") {
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes).replace(/^\uFEFF/, "");
  }

  if (extension === "docx") {
    const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
    return result.value;
  }

  const { text } = await extractText(bytes, { mergePages: true });
  return Array.isArray(text) ? text.join("\n\n") : text;
}
