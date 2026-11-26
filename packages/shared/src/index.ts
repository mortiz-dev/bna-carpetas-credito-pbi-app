/** Browser-safe fields for the owner-scoped credit case registered by @rayfin-app/data. */
export type CreditArea = 'ge' | 'py';

export interface CreditFileRecord {
  id: string;
  company: string;
  area: CreditArea;
  segment: string;
  holderCount: number;
  primaryCuit?: string | null;
  createdAt: Date;
  owner_id: string;
  opinionChoice?: string | null;
  opinionNote?: string | null;
  opinionAt?: Date | null;
}

export type UniversalAppSchema = {
  CreditFile: CreditFileRecord;
};

export function normalizeCuit(value: string): string | null {
  const digits = value.replace(/[\s-]/g, '');
  if (!/^\d{11}$/.test(digits) || /^(\d)\1+$/.test(digits)) return null;
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const sum = weights.reduce((total, weight, i) => total + weight * Number(digits[i]), 0);
  return (11 - sum % 11) % 11 === Number(digits[10]) ? digits : null;
}
