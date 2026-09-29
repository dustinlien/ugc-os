"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Brand } from "@/lib/brands";
import { centsToInput, dollarsToCents, formatUsd } from "@/lib/money";
import { quotaWindow } from "@/lib/dates";
import { uniqueSlug } from "@/lib/slug";
import { createClient } from "@/lib/supabase/client";

type BrandFormProps = {
  brand?: Brand;
};

export function BrandForm({ brand }: BrandFormProps) {
  const [name, setName] = useState(brand?.name ?? "");
  const [quota, setQuota] = useState(String(brand?.monthly_quota ?? 4));
  const [quotaStart, setQuotaStart] = useState(
    String(brand?.quota_start_day ?? 1),
  );
  const [pay, setPay] = useState(brand ? centsToInput(brand.pay_rate_cents) : "");
  const [color, setColor] = useState(brand?.color ?? "#6366f1");
  const [notes, setNotes] = useState(brand?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Name is required.");
      return;
    }

    if (!/^\d+$/.test(quota.trim())) {
      setError("Monthly quota must be a whole number.");
      return;
    }
    const monthlyQuota = Number(quota.trim());

    if (!/^\d+$/.test(quotaStart.trim())) {
      setError("Quota start day must be a number from 1 to 31.");
      return;
    }
    const quotaStartDay = Number(quotaStart.trim());
    if (quotaStartDay < 1 || quotaStartDay > 31) {
      setError("Quota start day must be a number from 1 to 31.");
      return;
    }

    const payCents = dollarsToCents(pay);
    if (payCents === null) {
      setError("Pay rate must look like 25 or 25.00.");
      return;
    }

    if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
      setError("Color must be a hex value like #6366f1.");
      return;
    }

    setPending(true);
    try {
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

      const { data: existing, error: slugError } = await supabase
        .from("brands")
        .select("id, slug")
        .eq("user_id", user.id);
      if (slugError) {
        setError(slugError.message);
        setPending(false);
        return;
      }

      const taken = (existing ?? [])
        .filter((row) => row.id !== brand?.id)
        .map((row) => row.slug as string);
      const slug = uniqueSlug(trimmedName, taken);
      const payload = {
        name: trimmedName,
        slug,
        color,
        monthly_quota: monthlyQuota,
        quota_start_day: quotaStartDay,
        pay_rate_cents: payCents,
        notes: notes.trim() ? notes.trim() : null,
      };

      if (brand) {
        const { error: updateError } = await supabase
          .from("brands")
          .update(payload)
          .eq("id", brand.id);
        if (updateError) {
          setError(updateError.message);
          setPending(false);
          return;
        }
        window.location.assign(`/brands/${brand.id}`);
        return;
      }

      const { data: created, error: insertError } = await supabase
        .from("brands")
        .insert({ ...payload, user_id: user.id })
        .select("id")
        .single();
      if (insertError || !created) {
        setError(insertError?.message ?? "Could not create the brand.");
        setPending(false);
        return;
      }
      window.location.assign(`/brands/${created.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-lg flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Name
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Monthly quota
        <Input
          inputMode="numeric"
          value={quota}
          onChange={(event) => setQuota(event.target.value)}
          required
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Quota starts on day
        <Input
          inputMode="numeric"
          value={quotaStart}
          onChange={(event) => setQuotaStart(event.target.value)}
          required
        />
        <span className="text-xs text-muted-foreground">
          1 is the 1st through the end of the month. 23 is the 23rd through the
          22nd.
          {/^\d+$/.test(quotaStart.trim()) &&
          Number(quotaStart) >= 1 &&
          Number(quotaStart) <= 31
            ? ` This period: ${quotaWindow(new Date(), Number(quotaStart)).label}.`
            : ""}
        </span>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Pay rate (dollars per video)
        <Input
          inputMode="decimal"
          placeholder="0.00"
          value={pay}
          onChange={(event) => setPay(event.target.value)}
        />
        <span className="text-xs text-muted-foreground">
          Stored as cents
          {dollarsToCents(pay) !== null
            ? ` (${formatUsd(dollarsToCents(pay) ?? 0)})`
            : ""}
          .
        </span>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Color
        <span className="flex items-center gap-2">
          <input
            type="color"
            value={/^#[0-9a-fA-F]{6}$/.test(color) ? color : "#6366f1"}
            onChange={(event) => setColor(event.target.value)}
            aria-label="Brand color"
            className="size-9 cursor-pointer rounded-md border bg-transparent"
          />
          <Input
            value={color}
            onChange={(event) => setColor(event.target.value)}
            className="max-w-32 font-mono"
          />
        </span>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Notes
        <Textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </label>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Saving…" : brand ? "Save" : "Create brand"}
      </Button>
    </form>
  );
}
