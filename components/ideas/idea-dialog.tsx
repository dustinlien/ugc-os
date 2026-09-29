"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  IDEA_STATUSES,
  PLATFORMS,
  type Idea,
  type IdeaStatus,
  type Platform,
  isIdeaStatus,
  nextSortOrder,
  submittedAtPatch,
} from "@/lib/ideas";
import { createClient } from "@/lib/supabase/client";

const fieldClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function IdeaDialog({
  brandId,
  idea,
  ideas,
  open,
  onOpenChange,
  onSaved,
  onDeleted,
}: {
  brandId: string;
  idea: Idea | null;
  ideas: Idea[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (idea: Idea) => void;
  onDeleted: (id: string) => void;
}) {
  const [title, setTitle] = useState(idea?.title ?? "");
  const [platform, setPlatform] = useState<Platform>(idea?.platform ?? "instagram");
  const [status, setStatus] = useState<IdeaStatus>(idea?.status ?? "idea");
  const [notes, setNotes] = useState(idea?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function close(next: boolean) {
    if (!next) {
      setError(null);
      setConfirmDelete(false);
    }
    onOpenChange(next);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Title is required.");
      return;
    }

    setPending(true);
    setError(null);
    try {
      const supabase = createClient();
      if (idea) {
        const statusChanged = status !== idea.status;
        const { data, error: updateError } = await supabase
          .from("ideas")
          .update({
            title: trimmed,
            platform,
            notes,
            status,
            sort_order: statusChanged
              ? nextSortOrder(
                  ideas.filter((row) => row.id !== idea.id),
                  status,
                )
              : idea.sort_order,
            ...submittedAtPatch(idea.status, status),
          })
          .eq("id", idea.id)
          .select("id, status, submitted_at")
          .maybeSingle();
        if (updateError || !data) {
          setError(updateError?.message ?? "That change did not save.");
          setPending(false);
          return;
        }
        onSaved({
          ...idea,
          title: trimmed,
          platform,
          notes,
          status: data.status as IdeaStatus,
          submitted_at: (data.submitted_at as string | null) ?? null,
          sort_order: statusChanged
            ? nextSortOrder(
                ideas.filter((row) => row.id !== idea.id),
                status,
              )
            : idea.sort_order,
        });
      } else {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) {
          setError("You are signed out. Sign in and try again.");
          setPending(false);
          return;
        }
        const sortOrder = nextSortOrder(ideas, "idea");
        const { data, error: insertError } = await supabase
          .from("ideas")
          .insert({
            user_id: user.id,
            brand_id: brandId,
            title: trimmed,
            platform,
            notes,
            status: "idea",
            sort_order: sortOrder,
          })
          .select("id, submitted_at, created_at")
          .single();
        if (insertError || !data) {
          setError(insertError?.message ?? "Could not create the idea.");
          setPending(false);
          return;
        }
        onSaved({
          id: data.id as string,
          brand_id: brandId,
          title: trimmed,
          notes,
          platform,
          status: "idea",
          sort_order: sortOrder,
          submitted_at: (data.submitted_at as string | null) ?? null,
          created_at: data.created_at as string,
        });
      }
      setPending(false);
      close(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save.");
      setPending(false);
    }
  }

  async function remove() {
    if (!idea) return;
    setPending(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: deleteError } = await supabase
        .from("ideas")
        .delete()
        .eq("id", idea.id);
      if (deleteError) {
        setError(deleteError.message);
        setPending(false);
        return;
      }
      onDeleted(idea.id);
      setPending(false);
      close(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete.");
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{idea ? "Edit idea" : "New idea"}</DialogTitle>
          <DialogDescription>
            {idea
              ? "Change the title, platform, notes, or column."
              : "Starts in the Idea column."}
          </DialogDescription>
        </DialogHeader>
        {confirmDelete && idea ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm">
              Delete “{idea.title}”? This cannot be undone.
            </p>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmDelete(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={remove}
                disabled={pending}
              >
                {pending ? "Deleting…" : "Delete"}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm">
              Title
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                autoFocus
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Platform
              <select
                className={fieldClass}
                value={platform}
                onChange={(event) => setPlatform(event.target.value as Platform)}
              >
                {PLATFORMS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            {idea ? (
              <label className="flex flex-col gap-1 text-sm">
                Column
                <select
                  className={fieldClass}
                  value={status}
                  onChange={(event) => {
                    if (isIdeaStatus(event.target.value)) {
                      setStatus(event.target.value);
                    }
                  }}
                >
                  {IDEA_STATUSES.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="flex flex-col gap-1 text-sm">
              Notes
              <Textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </label>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <DialogFooter>
              {idea ? (
                <Button
                  type="button"
                  variant="outline"
                  className="sm:mr-auto"
                  onClick={() => setConfirmDelete(true)}
                  disabled={pending}
                >
                  Delete
                </Button>
              ) : null}
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : idea ? "Save" : "Add idea"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
