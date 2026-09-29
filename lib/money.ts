// Dollars in the form ("25" or "25.00") become integer cents. Never use floats.

export function dollarsToCents(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return 0;
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const [whole, fraction = ""] = trimmed.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

export function centsToInput(cents: number): string {
  const absolute = Math.abs(Math.trunc(cents));
  return `${Math.floor(absolute / 100)}.${String(absolute % 100).padStart(2, "0")}`;
}

export function formatUsd(cents: number): string {
  const negative = cents < 0;
  const absolute = Math.abs(Math.trunc(cents));
  const dollars = Math.floor(absolute / 100);
  const remainder = String(absolute % 100).padStart(2, "0");
  const text = `$${dollars.toLocaleString("en-US")}.${remainder}`;
  return negative ? `-${text}` : text;
}
