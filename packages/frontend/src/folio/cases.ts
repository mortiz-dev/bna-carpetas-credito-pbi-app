import type { CreditArea } from '@rayfin-app/shared';

export type Area = CreditArea;
export const AREA_LABELS = { ge: 'Grandes Empresas', py: 'MiPyMEs' } as const;
export const STAGES = [
  'En análisis',
  'En riesgo',
  'En legales',
  'En comisión',
  'Resuelta',
] as const;
export type Stage = 0 | 1 | 2 | 3 | 4;
export const demoToday = '2026-11-26';
export const OWNER_NAMES = {
  AL: 'Ana Luna',
  VS: 'Vera Sol',
  JL: 'Julián Lago',
};
export const OPINION_CHOICES = [
  'Acompañar propuesta',
  'Acompañar con condiciones',
  'Solicitar información',
  'Desaconsejar propuesta',
] as const;

export interface OpinionInput {
  choice: string;
  note: string;
}
export interface Opinion extends OpinionInput {
  author: string;
  /** Signed time formatted for Argentina. */
  time: string;
}
export interface NewCaseInput {
  name: string;
  area: Area;
  segment: string;
  holders: number;
  cuit?: string;
}
export interface Proposal {
  zonal: number;
  credit: number | null;
  zMonths: number;
  cMonths: number | null;
  zGuarantee: string;
  cGuarantee: string | null;
  reason: string;
}
export interface CreditCase extends NewCaseInput {
  id: string;
  code: string;
  source: 'demo' | 'saved';
  stage: Stage;
  owner: string;
  createdOn: string;
  dueDate: string | null;
  event: string;
  /** Amounts in millions of ARS; null means no linked exposure. */
  limit: number | null;
  used: number | null;
  opinion: Opinion | null;
  proposal?: Proposal;
}

const proposals: Record<string, Proposal | undefined> = {
  'CR-26082': {
    zonal: 60,
    credit: 48,
    zMonths: 12,
    cMonths: 9,
    zGuarantee: 'A sola firma',
    cGuarantee: 'Con aval',
    reason:
      'Crédito plantea mantener el límite vigente y sumar un aval antes de ampliar la línea.',
  },
  'CR-26084': {
    zonal: 64,
    credit: 56,
    zMonths: 12,
    cMonths: 12,
    zGuarantee: 'A sola firma',
    cGuarantee: 'Con garantía prendaria',
    reason: 'Crédito propone un menor importe con garantía sobre equipos.',
  },
  'CR-26088': {
    zonal: 70,
    credit: null,
    zMonths: 12,
    cMonths: null,
    zGuarantee: 'Con aval',
    cGuarantee: null,
    reason: 'La propuesta de Crédito está pendiente de análisis.',
  },
  'CR-26091': {
    zonal: 50,
    credit: 50,
    zMonths: 12,
    cMonths: 12,
    zGuarantee: 'Con aval',
    cGuarantee: 'Con aval',
    reason: 'Ambas propuestas coinciden en importe, plazo y garantía.',
  },
};

type Example = [
  code: string,
  name: string,
  area: Area,
  stage: Stage,
  owner: keyof typeof OWNER_NAMES,
  dueDate: string | null,
  event: string,
  limit: number,
  used: number,
  holders: number,
];

const examples: Example[] = [
  [
    'CR-26081',
    'Linar del Sur',
    'py',
    0,
    'AL',
    '2026-11-27',
    'Revisión de carpeta',
    21,
    14,
    1,
  ],
  [
    'CR-26082',
    'Marea Industrial',
    'ge',
    1,
    'VS',
    '2026-11-28',
    'Vencimiento de calificación',
    48,
    36,
    2,
  ],
  [
    'CR-26083',
    'Trama del Oeste',
    'py',
    2,
    'AL',
    '2026-11-30',
    'Revisión de dictamen',
    13,
    8,
    1,
  ],
  [
    'CR-26084',
    'Cauce Logística',
    'ge',
    3,
    'JL',
    '2026-12-01',
    'Comisión de crédito',
    56,
    34,
    1,
  ],
  [
    'CR-26085',
    'Nexo del Valle',
    'py',
    0,
    'VS',
    '2026-12-03',
    'Revisión de carpeta',
    18,
    12,
    1,
  ],
  [
    'CR-26086',
    'Bruma Envases',
    'py',
    1,
    'AL',
    '2026-12-04',
    'Vencimiento de calificación',
    25,
    10,
    1,
  ],
  ['CR-26087', 'Prisma Talleres', 'py', 4, 'JL', null, '', 12, 7, 1],
  [
    'CR-26088',
    'Vértice Textil',
    'ge',
    0,
    'AL',
    '2026-12-05',
    'Revisión de carpeta',
    62,
    28,
    2,
  ],
  [
    'CR-26089',
    'Tilo Alimentos',
    'py',
    3,
    'VS',
    '2026-12-01',
    'Comisión de crédito',
    23,
    17,
    1,
  ],
  [
    'CR-26090',
    'Surco Equipos',
    'py',
    2,
    'JL',
    '2026-12-08',
    'Revisión de dictamen',
    29,
    14,
    1,
  ],
  ['CR-26091', 'Ladera Papel', 'ge', 4, 'VS', null, '', 50, 40, 1],
  [
    'CR-26092',
    'Delta Roble',
    'py',
    0,
    'AL',
    '2026-12-06',
    'Revisión de carpeta',
    32,
    18,
    1,
  ],
];

export const sampleCases: CreditCase[] = examples.map(
  ([id, name, area, stage, owner, dueDate, event, limit, used, holders]) => ({
    id,
    code: id,
    name,
    area,
    stage,
    owner: OWNER_NAMES[owner],
    dueDate,
    event,
    limit,
    used,
    holders,
    source: 'demo',
    proposal: proposals[id],
    segment: area === 'py' ? 'MiPyME' : 'Gran empresa',
    createdOn: stage === 4 ? '2026-11-02' : '2026-11-15',
    opinion:
      id === 'CR-26087'
        ? {
            choice: 'Acompañar con condiciones',
            note: 'Se propone renovar la línea vigente. Se incorporó la constancia de levantamiento del cheque y queda previsto revisar la evolución de la segunda entidad en el próximo control.',
            author: OWNER_NAMES.JL,
            time: '23/11/26, 10:30',
          }
        : null,
  }),
);
