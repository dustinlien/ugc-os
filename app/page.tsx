import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PACE_LABEL, brandPace, type Pace } from "@/lib/dashboard";
import { chicagoClock, greetingForHour, quotaWindow, stampInWindow } from "@/lib/dates";
import { IDEA_STATUSES, type IdeaStatus } from "@/lib/ideas";
import { formatUsd } from "@/lib/money";
import { randomQuote } from "@/lib/quotes";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type IdeaRow = {
  id: string;
  title: string;
  status: IdeaStatus;
  submitted_at: string | null;
  updated_at: string;
  pay_rate_override_cents: number | null;
};

type BrandRow = {
  id: string;
  name: string;
  color: string;
  monthly_quota: number;
  quota_start_day: number;
  pay_rate_cents: number;
  ideas: IdeaRow[];
};

function paceClass(pace: Pace): string {
  if (pace === "over" || pace === "behind") return "text-amber-700";
  if (pace === "done") return "text-emerald-700";
  return "text-muted-foreground";
}

function relativeTime(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default async function HomePage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("brands")
    .select(
      "id, name, color, monthly_quota, quota_start_day, pay_rate_cents, ideas(id, title, status, submitted_at, updated_at, pay_rate_override_cents)",
    )
    .is("archived_at", null)
    .order("name");

  const brands = (data ?? []) as BrandRow[];
  const now = new Date();
  const clock = chicagoClock(now);

  const rows = brands.map((brand) => {
    const period = quotaWindow(now, brand.quota_start_day ?? 1);
    const periodMs = Date.parse(period.end) - Date.parse(period.start);
    const periodFraction = Math.min(
      1,
      Math.max(0, (now.getTime() - Date.parse(period.start)) / periodMs),
    );
    const submittedIdeas = (brand.ideas ?? []).filter(
      (idea) =>
        idea.status === "submitted" &&
        stampInWindow(idea.submitted_at ?? idea.updated_at, period.start, period.end),
    );
    const submitted = submittedIdeas.length;
    const earnings = submittedIdeas.reduce(
      (sum, idea) =>
        sum + (idea.pay_rate_override_cents ?? brand.pay_rate_cents),
      0,
    );
    const remaining = brand.monthly_quota - submitted;
    const pace = brandPace(submitted, brand.monthly_quota, periodFraction);
    return { brand, submitted, earnings, remaining, pace, period: period.label };
  });

  const submittedTotal = rows.reduce((sum, row) => sum + row.submitted, 0);
  const remainingTotal = rows.reduce((sum, row) => sum + row.remaining, 0);
  const earningsTotal = rows.reduce((sum, row) => sum + row.earnings, 0);
  const overCount = rows.filter((row) => row.pace === "over").length;
  const needsAttention = rows.filter(
    (row) => row.submitted === 0 && row.brand.monthly_quota > 0,
  );
  const recent = brands
    .flatMap((brand) =>
      (brand.ideas ?? []).map((idea) => ({ idea, brand })),
    )
    .sort((a, b) => b.idea.updated_at.localeCompare(a.idea.updated_at))
    .slice(0, 8);

  const quote = randomQuote();

  return (
    <AppShell>
      <header>
        <p className="text-sm text-muted-foreground">
          Good {greetingForHour(clock.hour)}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {rows.length === 0
            ? "This month"
            : new Set(rows.map((row) => row.period)).size === 1
              ? rows[0].period
              : "Current periods"}
        </h1>
        <figure className="mt-4 max-w-xl">
          <blockquote className="text-base leading-snug">“{quote.text}”</blockquote>
          <figcaption className="mt-1 text-sm text-muted-foreground">
            {quote.speaker}
          </figcaption>
        </figure>
      </header>

      {error ? (
        <p className="mt-4 text-sm text-destructive">{error.message}</p>
      ) : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Submitted this period
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{submittedTotal}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Quota remaining
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-semibold ${remainingTotal < 0 ? "text-amber-700" : ""}`}>
              {remainingTotal}
            </p>
            {overCount > 0 ? (
              <p className="mt-1 text-xs text-amber-700">
                {overCount} {overCount === 1 ? "brand" : "brands"} over quota
              </p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Estimated this period
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatUsd(earningsTotal)}
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 flex flex-col gap-3 md:hidden">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No active brands.{" "}
            <Link href="/brands/new" className="underline underline-offset-4">
              Add a brand
            </Link>
          </p>
        ) : (
          rows.map((row) => (
            <Link
              key={row.brand.id}
              href={`/brands/${row.brand.id}`}
              className="rounded-2xl border bg-card p-4"
            >
              <span className="flex items-center gap-2 font-medium">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: row.brand.color }}
                />
                {row.brand.name}
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">{row.period}</span>
              <span className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <span>Submitted {row.submitted}/{row.brand.monthly_quota}</span>
                <span className={row.remaining < 0 ? "text-amber-700" : ""}>
                  Left {row.remaining}
                </span>
                <span>{formatUsd(row.earnings)}</span>
                <span className={paceClass(row.pace)}>{PACE_LABEL[row.pace]}</span>
              </span>
            </Link>
          ))
        )}
      </div>

      <div className="mt-8 hidden overflow-x-auto md:block">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 font-medium">Brand</th>
              <th className="py-2 font-medium">Period</th>
              <th className="py-2 font-medium">Quota</th>
              <th className="py-2 font-medium">Submitted</th>
              <th className="py-2 font-medium">Remaining</th>
              <th className="py-2 font-medium">Est. $</th>
              <th className="py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-6 text-muted-foreground">
                  No active brands.{" "}
                  <Link href="/brands/new" className="underline underline-offset-4">
                    Add a brand
                  </Link>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.brand.id} className="border-b">
                  <td className="py-2">
                    <Link
                      href={`/brands/${row.brand.id}`}
                      className="flex items-center gap-2 font-medium"
                    >
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: row.brand.color }}
                      />
                      {row.brand.name}
                    </Link>
                  </td>
                  <td className="py-2 text-muted-foreground">{row.period}</td>
                  <td className="py-2">{row.brand.monthly_quota}</td>
                  <td className="py-2">{row.submitted}</td>
                  <td className={`py-2 ${row.remaining < 0 ? "text-amber-700" : ""}`}>
                    {row.remaining}
                  </td>
                  <td className="py-2">{formatUsd(row.earnings)}</td>
                  <td className={`py-2 ${paceClass(row.pace)}`}>
                    {PACE_LABEL[row.pace]}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {needsAttention.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-sm font-medium">Needs attention</h2>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {needsAttention.map((row) => (
              <li key={row.brand.id}>
                <Link
                  href={`/brands/${row.brand.id}`}
                  className="text-muted-foreground underline-offset-4 hover:underline"
                >
                  {row.brand.name} has nothing submitted this period
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="text-sm font-medium">Recent ideas</h2>
        {recent.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No ideas yet.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2 text-sm">
            {recent.map(({ idea, brand }) => (
              <li key={idea.id}>
                <Link
                  href={`/brands/${brand.id}`}
                  className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"
                >
                  <span>
                    {idea.title}{" "}
                    <span className="text-muted-foreground">
                      · {brand.name} ·{" "}
                      {IDEA_STATUSES.find((status) => status.id === idea.status)
                        ?.label ?? idea.status}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {relativeTime(idea.updated_at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
