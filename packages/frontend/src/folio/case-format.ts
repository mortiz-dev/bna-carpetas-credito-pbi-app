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
export const shortDate = (day: string) =>
  dateFormat.format(new Date(day + 'T12:00:00Z'));

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

export function daysUntil(iso: string, today: string): number {
  const start = Date.parse(today + 'T12:00:00Z');
  const end = Date.parse(iso + 'T12:00:00Z');
  return Math.round((end - start) / 86_400_000);
}

export interface UrgencyInfo {
  label: string;
  relative: string;
  tone: 'danger' | 'warning' | 'normal' | 'none';
}

export function urgencyInfo(iso: string | null, today: string): UrgencyInfo {
  if (!iso) return { label: '—', relative: '', tone: 'none' };
  const diff = daysUntil(iso, today);
  const label = dueLabel(iso);
  if (diff < 0) {
    return {
      label,
      relative: diff === -1 ? 'Ayer' : `Hace ${Math.abs(diff)} d`,
      tone: 'danger',
    };
  }
  if (diff === 0) return { label, relative: 'Hoy', tone: 'danger' };
  if (diff === 1) return { label, relative: 'Mañana', tone: 'warning' };
  if (diff <= 3) return { label, relative: `En ${diff} d`, tone: 'warning' };
  if (diff <= 7) return { label, relative: `En ${diff} d`, tone: 'normal' };
  return { label, relative: '', tone: 'normal' };
}

export function formatCuitDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 10) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
}

export function situationTone(sit: number): 'success' | 'warning' | 'danger' {
  if (sit <= 1) return 'success';
  if (sit === 2) return 'warning';
  return 'danger';
}

export function initialsFor(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 2);
  const picked = (words.length ? words : name.trim().split(/\s+/)).slice(0, 2);
  return picked.map((w) => w[0] ?? '').join('').toUpperCase() || 'CR';
}
