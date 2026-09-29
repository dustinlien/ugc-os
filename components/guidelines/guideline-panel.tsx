"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  GUIDELINE_EXTENSIONS,
  MAX_GUIDELINE_BYTES,
  PREVIEW_CHARS,
  guidelineExtension,
  safeStorageName,
  type GuidelineFile,
} from "@/lib/guidelines";
import { createClient } from "@/lib/supabase/client";

const STATUS_LABEL = {
  pending: "Pending",
  ready: "Ready",
  failed: "Failed",
} as const;

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

export function GuidelinePanel({
  brandId,
  initialFiles,
}: {
  brandId: string;
  initialFiles: GuidelineFile[];
}) {
  const [files, setFiles] = useState(initialFiles);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    if (!guidelineExtension(file.name)) {
      setError("Use a PDF, DOCX, TXT, or MD file.");
      return;
    }
    if (file.size > MAX_GUIDELINE_BYTES) {
      setError("File is larger than 15 MB.");
      return;
    }

    setPending(true);
    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      setError("You are signed out. Sign in and try again.");
      setPending(false);
      return;
    }

    const id = crypto.randomUUID();
    const storagePath = `${user.id}/${brandId}/${id}/${safeStorageName(file.name)}`;
    const { error: uploadError } = await supabase.storage
      .from("guidelines")
      .upload(storagePath, file, { upsert: false, contentType: file.type || undefined });
    if (uploadError) {
      setError(uploadError.message);
      setPending(false);
      return;
    }

    const { error: insertError } = await supabase.from("guideline_files").insert({
      id,
      user_id: user.id,
      brand_id: brandId,
      file_name: file.name,
      storage_path: storagePath,
      mime_type: file.type || null,
      byte_size: file.size,
      extract_status: "pending",
    });
    if (insertError) {
      await supabase.storage.from("guidelines").remove([storagePath]);
      setError(insertError.message);
      setPending(false);
      return;
    }

    const response = await fetch("/api/guidelines/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileId: id }),
    });
    const body = (await response.json().catch(() => null)) as {
      file?: GuidelineFile;
      error?: string;
    } | null;
    if (!response.ok || !body?.file) {
      setFiles((current) => [
        {
          id,
          file_name: file.name,
          storage_path: storagePath,
          byte_size: file.size,
          extract_status: "failed",
          extract_error: body?.error ?? "Could not extract text.",
          extracted_text: null,
          created_at: new Date().toISOString(),
        },
        ...current,
      ]);
      setError(body?.error ?? "Could not extract text.");
      setPending(false);
      return;
    }

    setFiles((current) => [body.file as GuidelineFile, ...current]);
    setOpenId(body.file.id);
    setPending(false);
  }

  async function retry(fileId: string) {
    setError(null);
    setPending(true);
    const response = await fetch("/api/guidelines/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileId }),
    });
    const body = (await response.json().catch(() => null)) as {
      file?: GuidelineFile;
      error?: string;
    } | null;
    if (!response.ok || !body?.file) {
      setError(body?.error ?? "Could not extract text.");
      setPending(false);
      return;
    }
    setFiles((current) =>
      current.map((file) => (file.id === fileId ? (body.file as GuidelineFile) : file)),
    );
    setOpenId(fileId);
    setPending(false);
  }

  async function remove(file: GuidelineFile) {
    if (!window.confirm(`Delete ${file.file_name}?`)) return;
    setError(null);
    const supabase = createClient();
    const { error: storageError } = await supabase.storage
      .from("guidelines")
      .remove([file.storage_path]);
    if (storageError) {
      setError(storageError.message);
      return;
    }
    const { error: deleteError } = await supabase
      .from("guideline_files")
      .delete()
      .eq("id", file.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setFiles((current) => current.filter((item) => item.id !== file.id));
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <label className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed px-4 py-8 text-center text-sm">
        <span className="font-medium">
          {pending ? "Reading file…" : "Upload a guideline"}
        </span>
        <span className="text-muted-foreground">PDF, DOCX, TXT, or MD. 15 MB max.</span>
        <input
          type="file"
          accept={GUIDELINE_EXTENSIONS.map((extension) => `.${extension}`).join(",")}
          className="sr-only"
          disabled={pending}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void upload(file);
          }}
        />
      </label>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {files.length === 0 ? (
        <p className="text-sm text-muted-foreground">No guideline files yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {files.map((file) => {
            const preview = file.extracted_text?.slice(0, PREVIEW_CHARS) ?? "";
            return (
              <li key={file.id} className="rounded-lg border p-3 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium">{file.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatWhen(file.created_at)} · {STATUS_LABEL[file.extract_status]}
                  </p>
                </div>
                {file.extract_error ? (
                  <p className="mt-2 text-destructive">{file.extract_error}</p>
                ) : null}
                {preview ? (
                  <div className="mt-2">
                    <button
                      type="button"
                      className="text-muted-foreground underline-offset-4 hover:underline"
                      onClick={() => setOpenId(openId === file.id ? null : file.id)}
                    >
                      {openId === file.id ? "Hide text" : "Show text"}
                    </button>
                    {openId === file.id ? (
                      <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">
                        {preview}
                        {file.extracted_text && file.extracted_text.length > PREVIEW_CHARS
                          ? "…"
                          : ""}
                      </pre>
                    ) : null}
                  </div>
                ) : null}
                <div className="mt-3 flex gap-2">
                  {file.extract_status !== "ready" ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() => retry(file.id)}
                    >
                      Retry
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => remove(file)}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
