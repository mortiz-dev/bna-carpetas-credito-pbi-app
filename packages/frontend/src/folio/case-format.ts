const numberFormat = new Intl.NumberFormat('es-AR', {
  maximumFractionDigits: 1,
});
const dateFormat = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'short',
});
export const numberLabel = (value: number) => numberFormat.format(value);
export const amountLabel = (value: number | null) =>
  value === null ? 'Pendiente' : `ARS ${numberLabel(value)} M`;
export const shortDate = (day: string) => dateFormat.format(new Date(day));
export const sectionStyle =
  'min-w-0 gap-3 rounded-2xl border border-border bg-card p-4 shadow-none sm:p-5';
export const titleStyle =
  'font-heading text-xl font-semibold tracking-tight text-card-foreground';
export const captionStyle =
  'text-xs font-semibold tracking-wider uppercase text-primary';

export function dueLabel(
  iso: string,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' },
) {
  return new Intl.DateTimeFormat('es-AR', {
    ...options,
    timeZone: 'UTC',
  }).format(new Date(iso + 'T12:00:00Z'));
}
