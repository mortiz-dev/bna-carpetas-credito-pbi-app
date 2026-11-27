import {
  INSTANCES,
  OUTCOMES,
  SEGMENTS,
  normalizeCuit,
  subStatusFor,
  SUB_STATUSES,
  type CreditArea,
  type CreditFileRecord,
} from '@rayfin-app/shared';
import { getRayfinClient } from '@/lib/rayfin-client';
import {
  OPINION_CHOICES,
  type CreditCase,
  type Milestones,
  type NewCaseInput,
  type OpinionInput,
  type Proposal,
  type Stage,
  type TrackingInput,
} from './cases';

const milestoneFields = [
  'riskSentAt',
  'riskReturnedAt',
  'legalSentAt',
  'legalOpinionAt',
  'committeeAt',
  'resolvedAt',
  'ratingDueAt',
] as const satisfies ReadonlyArray<keyof Milestones>;


const selection = [
  'id',
  'company',
  'area',
  'segment',
  'holderCount',
  'primaryCuit',
  'createdAt',
  'createdBy',
  'entryDate',
  'zonal',
  'branch',
  'responsible',
  'reentry',
  'stage',
  'subStatus',
  'outcome',
  'instance',
  ...milestoneFields,
  'zonalAmount',
  'creditAmount',
  'zonalMonths',
  'creditMonths',
  'zonalGuarantee',
  'creditGuarantee',
  'followUpNote',
  'updatedAt',
  'updatedBy',
  'opinionChoice',
  'opinionNote',
  'opinionAt',
  'opinionBy',
] as const;

type SelectedRecord = Pick<CreditFileRecord, (typeof selection)[number]>;
type DateField =
  | 'createdAt'
  | 'entryDate'
  | 'updatedAt'
  | 'opinionAt'
  | (typeof milestoneFields)[number];
/** Dates arrive as ISO strings and decimals may arrive as strings, depending on the transport. */
type StoredFile = Omit<SelectedRecord, DateField | 'zonalAmount' | 'creditAmount'> & {
  [K in DateField]?: Date | string | null;
} & {
  zonalAmount?: number | string | null;
  creditAmount?: number | string | null;
};

const dateInArgentina = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: 'America/Argentina/Buenos_Aires',
});
const signedTime = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Argentina/Buenos_Aires',
});

function day(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : dateInArgentina.format(parsed);
}

/** Business dates are stored at noon UTC so they read back as the same day in Argentina. */
function toStoredDay(value: string | null | undefined): Date | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new Error('Revisá el formato de las fechas (AAAA-MM-DD).');
  const parsed = new Date(value + 'T12:00:00Z');
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value)
    throw new Error('Revisá las fechas: hay un día que no existe.');
  return parsed;
}

function amount(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clampStage(value: number | null | undefined): Stage {
  return value === 1 || value === 2 || value === 3 || value === 4 ? value : 0;
}

function nextMilestone(
  stage: Stage,
  committee: string | null,
  ratingDue: string | null,
): { dueDate: string | null; event: string } {
  const options: Array<{ dueDate: string; event: string }> = [];
  if (committee && stage < 4)
    options.push({ dueDate: committee, event: 'Comisión de crédito' });
  if (ratingDue)
    options.push({ dueDate: ratingDue, event: 'Vencimiento de calificación' });
  options.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return options[0] ?? { dueDate: null, event: '' };
}

function proposalFrom(row: StoredFile): Proposal | undefined {
  const zonal = amount(row.zonalAmount);
  if (zonal === null) return undefined;
  const credit = amount(row.creditAmount);
  return {
    zonal,
    credit,
    zMonths: row.zonalMonths ?? null,
    cMonths: row.creditMonths ?? null,
    zGuarantee: row.zonalGuarantee || null,
    cGuarantee: row.creditGuarantee || null,
    reason:
      credit === null
        ? 'La propuesta de Crédito está pendiente de carga.'
        : 'Propuesta registrada en el seguimiento de la carpeta.',
  };
}

function present(row: StoredFile): CreditCase {
  const created = new Date(row.createdAt ?? Date.now());
  const signed = row.opinionAt ? new Date(row.opinionAt) : null;
  const stage = clampStage(row.stage);
  const milestones = Object.fromEntries(
    milestoneFields.map((field) => [field, day(row[field])]),
  ) as unknown as Milestones;
  const createdBy = row.createdBy || '';
  const responsible = row.responsible || '';
  const subStatus =
    row.subStatus || SUB_STATUSES[row.area]?.find((s) => s.stage === stage)?.label ||
    '';
  const { dueDate, event } = nextMilestone(
    stage,
    milestones.committeeAt,
    milestones.ratingDueAt,
  );
  return {
    id: row.id,
    code: 'CR-' + row.id.slice(0, 8).toUpperCase(),
    name: row.company,
    area: row.area,
    segment: row.segment,
    holders: row.holderCount,
    cuit: row.primaryCuit || undefined,
    source: 'saved',
    stage,
    owner: responsible || createdBy || 'Sin asignar',
    createdOn: day(row.entryDate) ?? dateInArgentina.format(created),
    dueDate,
    event,
    limit: null,
    used: null,
    proposal: proposalFrom(row),
    opinion:
      row.opinionChoice && row.opinionNote && signed
        ? {
            choice: row.opinionChoice,
            note: row.opinionNote,
            author: row.opinionBy || createdBy || 'Usuario de la app',
            time: signedTime.format(signed),
          }
        : null,
    tracking: {
      ...milestones,
      segment: row.segment,
      holders: row.holderCount,
      entryDate: day(row.entryDate) ?? dateInArgentina.format(created),
      zonal: row.zonal || '',
      branch: row.branch || '',
      responsible,
      reentry: Boolean(row.reentry),
      subStatus,
      outcome: row.outcome ?? null,
      instance: row.instance ?? null,
      zonalAmount: amount(row.zonalAmount),
      creditAmount: amount(row.creditAmount),
      zonalMonths: row.zonalMonths ?? null,
      creditMonths: row.creditMonths ?? null,
      zonalGuarantee: row.zonalGuarantee || '',
      creditGuarantee: row.creditGuarantee || '',
      followUpNote: row.followUpNote || '',
      createdBy,
      updatedBy: row.updatedBy || '',
      updatedTime: row.updatedAt ? signedTime.format(new Date(row.updatedAt)) : null,
    },
  };
}

async function authenticatedStore() {
  const client = await getRayfinClient();
  const session = client.auth.getSession();
  if (!session.isAuthenticated || session.isAnonymous || !session.user) {
    throw new Error('Iniciá sesión en Fabric para acceder a las carpetas.');
  }
  return {
    files: client.data.CreditFile,
    userId: session.user.id,
    who: session.user.email || session.user.id,
  };
}

export async function listCases(): Promise<CreditCase[]> {
  const { files } = await authenticatedStore();
  const cases: CreditCase[] = [];
  const cursors = new Set<string>();
  let cursor: string | undefined;
  for (;;) {
    let query = files
      .select(selection)
      .orderBy({ createdAt: 'desc', id: 'asc' })
      .first(100);
    if (cursor) query = query.after(cursor);
    const page = await query.executePaginated();
    cases.push(...page.items.map((row) => present(row as StoredFile)));
    if (!page.hasNextPage) return cases;
    if (!page.endCursor || cursors.has(page.endCursor)) {
      throw new Error(
        'Fabric devolvió una lista incompleta. Volvé a cargar las carpetas.',
      );
    }
    cursor = page.endCursor;
    cursors.add(cursor);
  }
}

function optionalText(value: string | undefined, max: number, label: string) {
  const trimmed = value?.trim() ?? '';
  if (trimmed.length > max)
    throw new Error(`${label}: hasta ${max} caracteres.`);
  return trimmed || null;
}

function checkSegment(segment: string) {
  if (!(SEGMENTS as readonly string[]).includes(segment))
    throw new Error('Seleccioná un segmento.');
}

function checkHolders(holders: number) {
  if (!Number.isInteger(holders) || holders < 1 || holders > 5)
    throw new Error('Indicá entre 1 y 5 titulares.');
}

export async function createCase(input: NewCaseInput): Promise<CreditCase> {
  const name = input.name.trim();
  const segment = input.segment.trim();
  const rawCuit = input.cuit?.trim();
  const cuit = rawCuit ? normalizeCuit(rawCuit) : undefined;
  if (!name || name.length > 160)
    throw new Error('Ingresá una razón social de hasta 160 caracteres.');
  if (!['py', 'ge'].includes(input.area))
    throw new Error('Seleccioná un área responsable.');
  checkSegment(segment);
  checkHolders(input.holders);
  if (rawCuit && !cuit)
    throw new Error('Revisá los dígitos del CUIT del titular principal.');
  const entryDate = toStoredDay(input.entryDate);
  const zonal = optionalText(input.zonal, 60, 'Zonal');
  const branch = optionalText(input.branch, 60, 'Sucursal');
  const responsible = optionalText(input.responsible, 80, 'Responsable');
  const { files, userId, who } = await authenticatedStore();
  const now = new Date();
  const area = input.area as CreditArea;
  const row = await files.create({
    company: name,
    area,
    segment,
    holderCount: input.holders,
    primaryCuit: cuit,
    owner_id: userId,
    createdBy: who,
    createdAt: now,
    entryDate: entryDate ?? now,
    zonal,
    branch,
    responsible,
    stage: 0,
    subStatus: SUB_STATUSES[area][0].label,
  });
  return present(row as StoredFile);
}

function checkAmount(value: number | null, label: string) {
  if (value === null) return null;
  if (!Number.isFinite(value) || value < 0)
    throw new Error(`${label}: ingresá un importe positivo.`);
  return Math.round(value * 100) / 100;
}

function checkMonths(value: number | null, label: string) {
  if (value === null) return null;
  if (!Number.isInteger(value) || value < 1 || value > 360)
    throw new Error(`${label}: entre 1 y 360 meses.`);
  return value;
}

export async function updateTracking(
  id: string,
  area: CreditArea,
  input: TrackingInput,
): Promise<CreditCase> {
  checkSegment(input.segment);
  checkHolders(input.holders);
  const status = subStatusFor(area, input.subStatus);
  if (!status) throw new Error('Seleccioná un estado de la carpeta.');
  if (input.outcome !== null && !OUTCOMES.includes(input.outcome))
    throw new Error('Seleccioná un resultado válido.');
  if (input.instance !== null && !INSTANCES.includes(input.instance))
    throw new Error('Seleccioná una instancia válida.');
  const outcome = status.outcome ?? (status.stage === 4 ? input.outcome : null);
  if (status.stage === 4 && !outcome)
    throw new Error('Indicá si la carpeta resuelta fue aprobada o devuelta.');
  const dates = Object.fromEntries(
    milestoneFields.map((field) => [field, toStoredDay(input[field])]),
  ) as Record<(typeof milestoneFields)[number], Date | null>;
  const changes = {
    segment: input.segment,
    holderCount: input.holders,
    entryDate: toStoredDay(input.entryDate),
    zonal: optionalText(input.zonal, 60, 'Zonal'),
    branch: optionalText(input.branch, 60, 'Sucursal'),
    responsible: optionalText(input.responsible, 80, 'Responsable'),
    reentry: input.reentry,
    stage: status.stage,
    subStatus: status.label,
    outcome,
    instance: input.instance,
    ...dates,
    zonalAmount: checkAmount(input.zonalAmount, 'Propuesta GZ'),
    creditAmount: checkAmount(input.creditAmount, 'Propuesta Crédito'),
    zonalMonths: checkMonths(input.zonalMonths, 'Plazo GZ'),
    creditMonths: checkMonths(input.creditMonths, 'Plazo Crédito'),
    zonalGuarantee: optionalText(input.zonalGuarantee, 60, 'Garantía GZ'),
    creditGuarantee: optionalText(input.creditGuarantee, 60, 'Garantía Crédito'),
    followUpNote: optionalText(input.followUpNote, 2000, 'Observaciones'),
  };
  const { files, who } = await authenticatedStore();
  const row = await files
    .select(selection)
    .where({ id: { eq: id } })
    .findFirst();
  if (!row) throw new Error('Esta carpeta ya no está disponible.');
  const updated = await files.update(
    { id },
    { ...changes, updatedAt: new Date(), updatedBy: who },
  );
  return present({ ...(row as StoredFile), ...(updated as StoredFile) });
}

export async function saveOpinion(
  id: string,
  input: OpinionInput,
): Promise<CreditCase> {
  const note = input.note.trim();
  if (!OPINION_CHOICES.some((choice) => choice === input.choice)) {
    throw new Error('Seleccioná una recomendación.');
  }
  if (!note || note.length > 3000)
    throw new Error('Ingresá fundamentos de hasta 3000 caracteres.');
  const { files, who } = await authenticatedStore();
  const row = await files
    .select(selection)
    .where({ id: { eq: id } })
    .findFirst();
  if (!row) throw new Error('Esta carpeta ya no está disponible.');
  // One mutation commits the complete signed opinion; a failed save keeps the old version intact.
  const updated = await files.update(
    { id },
    {
      opinionChoice: input.choice,
      opinionNote: note,
      opinionAt: new Date(),
      opinionBy: who,
    },
  );
  return present({ ...(row as StoredFile), ...(updated as StoredFile) });
}

export function caseErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'status' in error) {
    if (error.status === 404)
      return 'El servicio de carpetas no está disponible en este workspace (HTTP 404). Verificá que el esquema de datos esté aplicado en Fabric.';
    if (error.status === 403)
      return 'Tu usuario no tiene permiso para esta operación en Fabric.';
  }
  return error instanceof Error
    ? error.message
    : 'No se pudo establecer conexión con el servicio de carpetas de Fabric.';
}
