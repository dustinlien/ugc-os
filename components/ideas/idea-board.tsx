"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { IdeaDialog } from "@/components/ideas/idea-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  IDEA_STATUSES,
  PLATFORMS,
  columnOf,
  isIdeaStatus,
  moveIdea,
  submittedAtPatch,
  type Idea,
  type IdeaStatus,
} from "@/lib/ideas";
import { createClient } from "@/lib/supabase/client";

function platformLabel(id: string) {
  return PLATFORMS.find((item) => item.id === id)?.label ?? id;
}

function collision(args: Parameters<typeof closestCorners>[0]) {
  const underPointer = pointerWithin(args);
  if (underPointer.length > 0) return underPointer;
  return closestCorners(args);
}

function IdeaCard({
  idea,
  onOpen,
  onStatus,
  overlay = false,
}: {
  idea: Idea;
  onOpen?: (idea: Idea) => void;
  onStatus?: (idea: Idea, status: IdeaStatus) => void;
  overlay?: boolean;
}) {
  return (
    <div
      className={`w-full rounded-lg border bg-background p-3 text-left shadow-xs ${
        overlay ? "shadow-md" : ""
      }`}
    >
      <button type="button" onClick={() => onOpen?.(idea)} className="w-full text-left">
        <p className="text-sm font-medium">{idea.title}</p>
        {idea.notes ? (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{idea.notes}</p>
        ) : null}
      </button>
      <div className="mt-2 flex items-center gap-2">
        <Badge variant="outline">{platformLabel(idea.platform)}</Badge>
        {onStatus ? (
          <select
            aria-label="Stage"
            className="h-8 min-w-0 flex-1 rounded-md border border-input bg-transparent px-2 text-xs"
            value={idea.status}
            onPointerDown={(event) => event.stopPropagation()}
            onTouchStart={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => onStatus(idea, event.target.value as IdeaStatus)}
          >
            {IDEA_STATUSES.map((status) => (
              <option key={status.id} value={status.id}>
                {status.label}
              </option>
            ))}
          </select>
        ) : null}
      </div>
    </div>
  );
}

function SortableIdea({
  idea,
  onOpen,
  onStatus,
}: {
  idea: Idea;
  onOpen: (idea: Idea) => void;
  onStatus: (idea: Idea, status: IdeaStatus) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: idea.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, touchAction: "none" }}
      className={isDragging ? "opacity-40" : undefined}
      {...attributes}
      {...listeners}
    >
      <IdeaCard idea={idea} onOpen={onOpen} onStatus={onStatus} />
    </div>
  );
}

const COLUMN_TINT: Record<string, string> = {
  idea: "bg-amber-50/90",
  script_ready: "bg-sky-50/90",
  filmed: "bg-violet-50/90",
  edited: "bg-rose-50/90",
  submitted: "bg-emerald-50/90",
};

function Column({
  status,
  label,
  ideas,
  archived,
  onOpen,
  onStatus,
  onCreate,
}: {
  status: IdeaStatus;
  label: string;
  ideas: Idea[];
  archived: boolean;
  onOpen: (idea: Idea) => void;
  onStatus: (idea: Idea, status: IdeaStatus) => void;
  onCreate: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <section
      ref={setNodeRef}
      className={`flex w-[82vw] max-w-72 shrink-0 snap-center flex-col rounded-2xl border sm:w-64 ${
        COLUMN_TINT[status] ?? "bg-muted/40"
      } ${isOver ? "ring-2 ring-ring" : ""}`}
    >
      <header className="flex items-center justify-between px-3 py-2 text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{ideas.length}</span>
      </header>
      <SortableContext
        items={ideas.map((idea) => idea.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex min-h-40 flex-col gap-2 px-2 pb-2">
          {ideas.length === 0 && status === "idea" && !archived ? (
            <button
              type="button"
              onClick={onCreate}
              className="rounded-lg border border-dashed px-3 py-6 text-sm text-muted-foreground"
            >
              New idea
            </button>
          ) : null}
          {ideas.map((idea) => (
            <SortableIdea
              key={idea.id}
              idea={idea}
              onOpen={onOpen}
              onStatus={onStatus}
            />
          ))}
        </div>
      </SortableContext>
    </section>
  );
}

export function IdeaBoard({
  brandId,
  initialIdeas,
  archived,
}: {
  brandId: string;
  initialIdeas: Idea[];
  archived: boolean;
}) {
  const [ideas, setIdeas] = useState(initialIdeas);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Idea | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const active = ideas.find((idea) => idea.id === activeId) ?? null;

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  async function persist(previous: Idea[], next: Idea[]) {
    const changed = next.filter((idea) => {
      const before = previous.find((row) => row.id === idea.id);
      return (
        before &&
        (before.status !== idea.status || before.sort_order !== idea.sort_order)
      );
    });
    if (changed.length === 0) return;
    setIdeas(next);
    const supabase = createClient();
    const results = await Promise.all(
      changed.map(async (idea) => {
        const before = previous.find((row) => row.id === idea.id);
        const { data, error } = await supabase
          .from("ideas")
          .update({
            status: idea.status,
            sort_order: idea.sort_order,
            ...submittedAtPatch(before?.status ?? idea.status, idea.status),
          })
          .eq("id", idea.id)
          .select("id, status, submitted_at")
          .maybeSingle();
        return { ideaId: idea.id, data, error };
      }),
    );
    const failed = results.find((result) => result.error || !result.data);
    if (failed) {
      toast.error(failed.error?.message ?? "That move did not save. Try again.");
      setIdeas(previous);
      return;
    }
    setIdeas((current) =>
      current.map((idea) => {
        const saved = results.find((result) => result.ideaId === idea.id)?.data;
        if (!saved) return idea;
        return {
          ...idea,
          status: saved.status as IdeaStatus,
          submitted_at: (saved.submitted_at as string | null) ?? null,
        };
      }),
    );
  }

  async function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const overId = event.over ? String(event.over.id) : null;
    if (!overId) return;
    await persist(ideas, moveIdea(ideas, String(event.active.id), overId));
  }

  function changeStatus(idea: Idea, status: IdeaStatus) {
    if (!isIdeaStatus(status) || idea.status === status) return;
    void persist(ideas, moveIdea(ideas, idea.id, status));
  }

  function onSaved(idea: Idea) {
    setIdeas((current) => {
      const exists = current.some((row) => row.id === idea.id);
      return exists
        ? current.map((row) => (row.id === idea.id ? { ...row, ...idea } : row))
        : [...current, idea];
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {archived
            ? "Unarchive this brand before adding ideas."
            : "Add a card, then drag it. On a phone, press and hold a card to drag, or swipe sideways for the other columns."}
        </p>
        {archived ? null : (
          <Button type="button" onClick={() => setCreating(true)}>
            New idea
          </Button>
        )}
      </div>
      {ideas.length === 0 ? (
        <p className="text-sm text-muted-foreground">No ideas yet.</p>
      ) : null}
      <DndContext
        sensors={sensors}
        collisionDetection={collision}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
          {IDEA_STATUSES.map((status) => (
            <Column
              key={status.id}
              status={status.id}
              label={status.label}
              ideas={columnOf(ideas, status.id)}
              archived={archived}
              onOpen={setEditing}
              onStatus={changeStatus}
              onCreate={() => setCreating(true)}
            />
          ))}
        </div>
        <DragOverlay>
          {active ? <IdeaCard idea={active} overlay /> : null}
        </DragOverlay>
      </DndContext>
      {creating ? (
        <IdeaDialog
          key="create"
          brandId={brandId}
          idea={null}
          ideas={ideas}
          open
          onOpenChange={setCreating}
          onSaved={onSaved}
          onDeleted={() => undefined}
        />
      ) : null}
      {editing ? (
        <IdeaDialog
          key={editing.id}
          brandId={brandId}
          idea={editing}
          ideas={ideas}
          open
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
          onSaved={onSaved}
          onDeleted={(id) =>
            setIdeas((current) => current.filter((idea) => idea.id !== id))
          }
        />
      ) : null}
    </div>
  );
}
