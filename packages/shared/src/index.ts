/** Browser-safe fields for the credit case registered by @rayfin-app/data. */
export type CreditArea = 'ge' | 'py';

/** Customer segments used by both areas' spreadsheets (PYMES, COOP, COOP P, GRANDES EMPRESAS, COOPERATIVAS). */
export const SEGMENTS = [
  'MiPyME',
  'Gran empresa',
  'Cooperativa',
  'Cooperativa PyME',
] as const;

/** Approval levels found in INSTANCIA / ELEVACION (MiPyMEs) and Instancia (Grandes Empresas). */
export const INSTANCES = ['D', 'C', 'SGC', 'SGD', 'GD', 'SG', 'SGP', 'GG', 'HD'] as const;
export type CreditInstance = (typeof INSTANCES)[number];

export const OUTCOMES = ['aprobada', 'devuelta', 'stand_by'] as const;
export type CreditOutcome = (typeof OUTCOMES)[number];
export const OUTCOME_LABELS: Record<CreditOutcome, string> = {
  aprobada: 'Aprobada',
  devuelta: 'Devuelta',
  stand_by: 'En stand by',
};

/** Common stages shown across both areas: 0 análisis · 1 riesgo · 2 legales · 3 comisión · 4 resuelta. */
export type CreditStage = 0 | 1 | 2 | 3 | 4;

export interface SubStatus {
  label: string;
  stage: CreditStage;
  outcome?: CreditOutcome;
}

/** Each area's own status catalog, taken from its spreadsheet, mapped to the common stage. */
export const SUB_STATUSES: Record<CreditArea, readonly SubStatus[]> = {
  py: [
    { label: 'Pendiente de envío a Riesgo', stage: 0 },
    { label: 'A la firma para Riesgo', stage: 0 },
    { label: 'Enviada a Riesgo', stage: 1 },
    { label: 'En análisis del área Crédito', stage: 0 },
    { label: 'A la firma (ya analizada)', stage: 0 },
    { label: 'Enviada a Legales', stage: 2 },
    { label: 'Próxima comisión HD', stage: 3 },
    { label: 'Terminada', stage: 4 },
  ],
  ge: [
    { label: 'Pendiente en el área', stage: 0 },
    { label: 'Mandar a RC', stage: 0 },
    { label: 'Riesgo Crediticio CC', stage: 1 },
    { label: 'En Legales', stage: 2 },
    { label: 'Stand by', stage: 0, outcome: 'stand_by' },
    { label: 'En Gcia. Departamental', stage: 3 },
    { label: 'Próximo comité GG', stage: 3 },
    { label: 'Próxima comisión', stage: 3 },
    { label: 'Comisión posterior', stage: 3 },
    { label: 'SGGBE', stage: 3 },
    { label: 'Aprobada', stage: 4, outcome: 'aprobada' },
    { label: 'Devolución', stage: 4, outcome: 'devuelta' },
  ],
};

export function subStatusFor(area: CreditArea, label: string | null | undefined) {
  return SUB_STATUSES[area].find((status) => status.label === label);
}

export interface CreditFileRecord {
  id: string;
  company: string;
  area: CreditArea;
  segment: string;
  holderCount: number;
  primaryCuit?: string | null;
  createdAt: Date;
  owner_id: string;
  /** Creator's email, shown because cases are shared across the app's users. */
  createdBy?: string | null;

  /** Fecha de ingreso a Crédito (INGRESO / Fecha Ingreso CREDITO); may precede createdAt. */
  entryDate?: Date | null;
  zonal?: string | null;
  branch?: string | null;
  /** EQUIPO (MiPyMEs) or OC (Grandes Empresas). */
  responsible?: string | null;
  reentry?: boolean | null;

  stage?: number | null;
  subStatus?: string | null;
  outcome?: CreditOutcome | null;
  instance?: CreditInstance | null;

  riskSentAt?: Date | null;
  riskReturnedAt?: Date | null;
  legalSentAt?: Date | null;
  legalOpinionAt?: Date | null;
  committeeAt?: Date | null;
  resolvedAt?: Date | null;
  ratingDueAt?: Date | null;

  /** Amounts in millions of ARS. */
  zonalAmount?: number | null;
  creditAmount?: number | null;
  zonalMonths?: number | null;
  creditMonths?: number | null;
  zonalGuarantee?: string | null;
  creditGuarantee?: string | null;

  followUpNote?: string | null;
  updatedAt?: Date | null;
  updatedBy?: string | null;

  opinionChoice?: string | null;
  opinionNote?: string | null;
  opinionAt?: Date | null;
  opinionBy?: string | null;
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
