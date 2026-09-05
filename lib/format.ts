import { format, isValid, parseISO } from "date-fns";

export function formatDate(iso: string | null | undefined, pattern = "dd MMM yyyy") {
  if (!iso) return "—";
  const d = parseISO(iso);
  return isValid(d) ? format(d, pattern) : "—";
}

export function toISODate(d: Date) {
  return format(d, "yyyy-MM-dd");
}

/** ISO date `n` days from today — keeps mock data alive as time passes. */
export function daysFromToday(n: number) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

export function formatCurrency(value: number | null | undefined, fractionDigits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`;
}

export function formatNumber(value: number | null | undefined, fractionDigits = 0) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

export function formatKg(value: number | null | undefined) {
  return value === null || value === undefined ? "—" : `${formatNumber(value)} kg`;
}

export function formatHectares(value: number | null | undefined) {
  if (!value) return "0.00 ha";
  return `${value.toFixed(2)} ha`;
}

export function formatSquareMeters(hectares: number | null | undefined) {
  if (!hectares) return "0 m²";
  return `${formatNumber(Math.round(hectares * 10_000))} m²`;
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
