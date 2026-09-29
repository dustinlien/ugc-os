export const IDEA_STATUSES = [
  { id: "idea", label: "Idea" },
  { id: "script_ready", label: "Script ready" },
  { id: "filmed", label: "Filmed" },
  { id: "edited", label: "Edited" },
  { id: "submitted", label: "Submitted" },
] as const;

export const PLATFORMS = [
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
] as const;

export type IdeaStatus = (typeof IDEA_STATUSES)[number]["id"];
export type Platform = (typeof PLATFORMS)[number]["id"];

export type Idea = {
  id: string;
  brand_id: string;
  title: string;
  notes: string;
  platform: Platform;
  status: IdeaStatus;
  sort_order: number;
  submitted_at: string | null;
  created_at: string;
};

const STATUS_IDS = IDEA_STATUSES.map((status) => status.id);

export function isIdeaStatus(value: string): value is IdeaStatus {
  return STATUS_IDS.includes(value as IdeaStatus);
}

export function columnOf(ideas: Idea[], status: IdeaStatus): Idea[] {
  return ideas
    .filter((idea) => idea.status === status)
    .sort(
      (a, b) =>
        a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at),
    );
}

export function withSortOrder(ideas: Idea[]): Idea[] {
  return ideas.map((idea, index) => ({
    ...idea,
    sort_order: (index + 1) * 1000,
  }));
}

export function nextSortOrder(ideas: Idea[], status: IdeaStatus): number {
  const column = columnOf(ideas, status);
  if (column.length === 0) return 1000;
  return column[column.length - 1].sort_order + 1000;
}

// Drop an idea onto a column id or another idea id. Renumbers touched columns
// as 1000, 2000, 3000 so gaps stay clean.
export function moveIdea(
  ideas: Idea[],
  activeId: string,
  overId: string,
): Idea[] {
  if (activeId === overId) return ideas;
  const active = ideas.find((idea) => idea.id === activeId);
  if (!active) return ideas;

  const overStatus = isIdeaStatus(overId)
    ? overId
    : ideas.find((idea) => idea.id === overId)?.status;
  if (!overStatus) return ideas;

  const source = columnOf(ideas, active.status).filter(
    (idea) => idea.id !== active.id,
  );
  const destinationBase =
    overStatus === active.status
      ? source
      : columnOf(ideas, overStatus).filter((idea) => idea.id !== active.id);

  let index = destinationBase.length;
  if (!isIdeaStatus(overId)) {
    const overIndex = destinationBase.findIndex((idea) => idea.id === overId);
    if (overIndex >= 0) index = overIndex;
  }

  const destination = [
    ...destinationBase.slice(0, index),
    { ...active, status: overStatus },
    ...destinationBase.slice(index),
  ];

  const next = new Map<string, Idea>();
  if (overStatus !== active.status) {
    for (const idea of withSortOrder(source)) next.set(idea.id, idea);
  }
  for (const idea of withSortOrder(destination)) next.set(idea.id, idea);

  return ideas.map((idea) => next.get(idea.id) ?? idea);
}

export function submittedAtPatch(
  previousStatus: IdeaStatus,
  nextStatus: IdeaStatus,
  now = new Date().toISOString(),
): { submitted_at?: string | null } {
  if (nextStatus === "submitted" && previousStatus !== "submitted") {
    return { submitted_at: now };
  }
  if (nextStatus !== "submitted" && previousStatus === "submitted") {
    return { submitted_at: null };
  }
  return {};
}
