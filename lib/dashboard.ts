export type Pace = "over" | "done" | "behind" | "on_track";

export function brandPace(
  submitted: number,
  quota: number,
  periodFraction: number,
): Pace {
  if (submitted > quota) return "over";
  if (quota - submitted <= 0) return "done";
  if (quota > 0 && submitted / quota < periodFraction) return "behind";
  return "on_track";
}

export const PACE_LABEL: Record<Pace, string> = {
  over: "Over",
  done: "Done",
  behind: "Behind",
  on_track: "On track",
};
