const CHICAGO = "America/Chicago";

type WallTime = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function wallTime(date: Date, timeZone: string): WallTime {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const value: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") value[part.type] = part.value;
  }

  let hour = Number(value.hour);
  if (hour === 24) hour = 0;

  return {
    year: Number(value.year),
    month: Number(value.month),
    day: Number(value.day),
    hour,
    minute: Number(value.minute),
    second: Number(value.second),
  };
}

function zonedStartToUtc(year: number, month: number, day: number): Date {
  let utc = Date.UTC(year, month - 1, day, 0, 0, 0);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const got = wallTime(new Date(utc), CHICAGO);
    const gotUtc = Date.UTC(
      got.year,
      got.month - 1,
      got.day,
      got.hour,
      got.minute,
      got.second,
    );
    utc += Date.UTC(year, month - 1, day, 0, 0, 0) - gotUtc;
  }
  return new Date(utc);
}

export function chicagoMonthBounds(now = new Date()): { start: string; end: string } {
  const bounds = quotaWindow(now, 1);
  return { start: bounds.start, end: bounds.end };
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function chicagoDayLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: CHICAGO,
    month: "short",
    day: "numeric",
  }).format(date);
}

// startDay 1 is the calendar month. startDay 23 runs from the 23rd through
// the 22nd of the next month, in America/Chicago.
export function quotaWindow(
  now = new Date(),
  startDay = 1,
): { start: string; end: string; label: string } {
  const clamped = Math.min(31, Math.max(1, Math.trunc(startDay) || 1));
  const current = wallTime(now, CHICAGO);
  let year = current.year;
  let month = current.month;
  if (current.day < Math.min(clamped, daysInMonth(year, month))) {
    month -= 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
  }

  const startDate = zonedStartToUtc(year, month, Math.min(clamped, daysInMonth(year, month)));
  let endYear = year;
  let endMonth = month + 1;
  if (endMonth === 13) {
    endMonth = 1;
    endYear += 1;
  }
  const endDate = zonedStartToUtc(
    endYear,
    endMonth,
    Math.min(clamped, daysInMonth(endYear, endMonth)),
  );

  return {
    start: startDate.toISOString(),
    end: endDate.toISOString(),
    label: `${chicagoDayLabel(startDate)} – ${chicagoDayLabel(new Date(endDate.getTime() - 1))}`,
  };
}

export function chicagoMonthLabel(now = new Date()): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: CHICAGO,
    month: "long",
    year: "numeric",
  }).format(now);
}

export function chicagoClock(now = new Date()): {
  hour: number;
  day: number;
  daysInMonth: number;
} {
  const current = wallTime(now, CHICAGO);
  const daysInMonth = new Date(
    Date.UTC(current.year, current.month, 0),
  ).getUTCDate();
  return { hour: current.hour, day: current.day, daysInMonth };
}

export function greetingForHour(hour: number): "morning" | "afternoon" | "evening" {
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

export function stampInWindow(
  stamp: string | null | undefined,
  start: string,
  end: string,
): boolean {
  if (!stamp) return false;
  const time = Date.parse(stamp);
  if (Number.isNaN(time)) return false;
  return time >= Date.parse(start) && time < Date.parse(end);
}
