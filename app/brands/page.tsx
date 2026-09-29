import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Brand } from "@/lib/brands";
import { quotaWindow, stampInWindow } from "@/lib/dates";
import { formatUsd } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

export default async function BrandsPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const params = await searchParams;
  const showArchived = params.archived === "1";
  const supabase = await createClient();

  let query = supabase.from("brands").select("*").order("name");
  if (!showArchived) query = query.is("archived_at", null);

  const { data, error } = await query;
  const brands = (data ?? []) as Brand[];
  const counts = new Map<string, number>();

  if (brands.length > 0) {
    const now = new Date();
    const { data: ideas } = await supabase
      .from("ideas")
      .select("brand_id, submitted_at, updated_at")
      .in(
        "brand_id",
        brands.map((brand) => brand.id),
      )
      .eq("status", "submitted");

    for (const idea of ideas ?? []) {
      const brandId = idea.brand_id as string;
      const brand = brands.find((item) => item.id === brandId);
      if (!brand) continue;
      const period = quotaWindow(now, brand.quota_start_day ?? 1);
      if (
        !stampInWindow(
          (idea.submitted_at as string | null) ?? (idea.updated_at as string | null),
          period.start,
          period.end,
        )
      ) {
        continue;
      }
      counts.set(brandId, (counts.get(brandId) ?? 0) + 1);
    }
  }

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Brands</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Click a brand to add ideas.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={showArchived ? "/brands" : "/brands?archived=1"}
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            {showArchived ? "Hide archived" : "Show archived"}
          </Link>
          <Button asChild>
            <Link href="/brands/new">Add brand</Link>
          </Button>
        </div>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-destructive">{error.message}</p>
      ) : null}

      {brands.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">
          {showArchived ? "No archived brands." : "No brands yet."}
        </p>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {brands.map((brand) => {
            const submitted = counts.get(brand.id) ?? 0;
            const quota = brand.monthly_quota;
            const percent =
              quota <= 0 ? 0 : Math.min(100, Math.round((submitted / quota) * 100));
            return (
              <Link key={brand.id} href={`/brands/${brand.id}`}>
                <Card
                  className="h-full border-l-4"
                  style={{ borderLeftColor: brand.color }}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: brand.color }}
                      />
                      {brand.name}
                      {brand.archived_at ? (
                        <span className="text-xs font-normal text-muted-foreground">
                          Archived
                        </span>
                      ) : null}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>
                        {submitted}/{quota} this month
                      </span>
                      <span>{formatUsd(brand.pay_rate_cents)} / video</span>
                    </div>
                    <Progress value={percent} />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
