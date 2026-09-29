import { ArchiveButton } from "@/components/brands/archive-button";
import { BrandForm } from "@/components/brands/brand-form";
import { BrandTabs } from "@/components/brands/brand-tabs";
import { ChatPanel } from "@/components/chat/chat-panel";
import { GuidelinePanel } from "@/components/guidelines/guideline-panel";
import { IdeaBoard } from "@/components/ideas/idea-board";
import { AppShell } from "@/components/layout/app-shell";
import type { Brand } from "@/lib/brands";
import type { GuidelineFile } from "@/lib/guidelines";
import type { Idea } from "@/lib/ideas";
import { formatUsd } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

export default async function BrandPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("brands")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  const brand = data as Brand | null;

  if (!brand) {
    return (
      <AppShell>
        <h1 className="text-2xl font-semibold tracking-tight">Brand not found</h1>
      </AppShell>
    );
  }

  const { data: ideaRows } = await supabase
    .from("ideas")
    .select(
      "id, brand_id, title, notes, platform, status, sort_order, submitted_at, created_at",
    )
    .eq("brand_id", brand.id)
    .order("sort_order");
  const ideas = (ideaRows ?? []) as Idea[];
  const { data: fileRows } = await supabase
    .from("guideline_files")
    .select(
      "id, file_name, storage_path, byte_size, extract_status, extract_error, extracted_text, created_at",
    )
    .eq("brand_id", brand.id)
    .order("created_at", { ascending: false });
  const files = (fileRows ?? []) as GuidelineFile[];

  return (
    <AppShell brand={{ id: brand.id, name: brand.name, color: brand.color }}>
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: brand.color }}
          />
          {brand.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          {brand.monthly_quota} videos / month · {formatUsd(brand.pay_rate_cents)}{" "}
          each
        </p>
      </div>
      {brand.archived_at ? (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          This brand is archived. New ideas stay blocked until you unarchive it.
        </p>
      ) : null}
      <BrandTabs
        board={
          <IdeaBoard
            brandId={brand.id}
            initialIdeas={ideas}
            archived={Boolean(brand.archived_at)}
          />
        }
        chat={<ChatPanel brandId={brand.id} />}
        guidelines={<GuidelinePanel brandId={brand.id} initialFiles={files} />}
        settings={
          <div className="flex flex-col gap-8">
            <BrandForm brand={brand} />
            <ArchiveButton brandId={brand.id} archived={Boolean(brand.archived_at)} />
          </div>
        }
      />
    </AppShell>
  );
}
