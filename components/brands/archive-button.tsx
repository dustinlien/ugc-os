"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function ArchiveButton({
  brandId,
  archived,
}: {
  brandId: string;
  archived: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setError(null);
    setPending(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("brands")
        .update({ archived_at: archived ? null : new Date().toISOString() })
        .eq("id", brandId);
      if (updateError) {
        setError(updateError.message);
        setPending(false);
        return;
      }
      window.location.assign(`/brands/${brandId}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update.");
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button type="button" variant="outline" onClick={toggle} disabled={pending}>
        {pending ? "Saving…" : archived ? "Unarchive" : "Archive"}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
