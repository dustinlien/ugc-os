import { NextResponse } from "next/server";
import { extractGuidelineText } from "@/lib/extract-text";
import { indexGuidelineFile } from "@/lib/index-guidelines";
import { MAX_GUIDELINE_BYTES, type GuidelineFile } from "@/lib/guidelines";
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

  let fileId = "";
  try {
    const body = (await request.json()) as { fileId?: string };
    fileId = body.fileId ?? "";
  } catch {
    return NextResponse.json({ error: "Missing file." }, { status: 400 });
  }
  if (!fileId) {
    return NextResponse.json({ error: "Missing file." }, { status: 400 });
  }

  const { data: row, error: loadError } = await supabase
    .from("guideline_files")
    .select(
      "id, user_id, brand_id, file_name, storage_path, byte_size, extract_status, extract_error, extracted_text, created_at",
    )
    .eq("id", fileId)
    .maybeSingle();

  if (loadError || !row) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  const file = row as GuidelineFile & { storage_path: string };

  async function markFailed(message: string) {
    await supabase
      .from("guideline_files")
      .update({
        extract_status: "failed",
        extract_error: message,
        extracted_text: null,
      })
      .eq("id", fileId);
  }

  if (file.byte_size !== null && file.byte_size > MAX_GUIDELINE_BYTES) {
    const message = "File is larger than 15 MB.";
    await markFailed(message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { data: blob, error: downloadError } = await supabase.storage
    .from("guidelines")
    .download(file.storage_path);

  if (downloadError || !blob) {
    const message = downloadError?.message ?? "Could not read the uploaded file.";
    await markFailed(message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  try {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const text = (await extractGuidelineText(file.file_name, bytes)).trim();
    if (!text) {
      const message = "No text found in that file.";
      await markFailed(message);
      return NextResponse.json({ error: message }, { status: 422 });
    }

    const { data: updated, error: updateError } = await supabase
      .from("guideline_files")
      .update({
        extract_status: "ready",
        extract_error: null,
        extracted_text: text,
      })
      .eq("id", fileId)
      .select(
        "id, file_name, storage_path, byte_size, extract_status, extract_error, extracted_text, created_at",
      )
      .single();

    if (updateError || !updated) {
      return NextResponse.json(
        { error: updateError?.message ?? "Could not save the extracted text." },
        { status: 500 },
      );
    }

    let indexError: string | null = null;
    try {
      await indexGuidelineFile(supabase, {
        id: fileId,
        user_id: (row as { user_id: string }).user_id,
        brand_id: (row as { brand_id: string }).brand_id,
        extracted_text: text,
      });
    } catch (caught) {
      indexError = caught instanceof Error ? caught.message : "Could not index the file for chat.";
    }

    return NextResponse.json({ file: updated, indexed: !indexError, indexError });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Could not read that file.";
    await markFailed(message);
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
