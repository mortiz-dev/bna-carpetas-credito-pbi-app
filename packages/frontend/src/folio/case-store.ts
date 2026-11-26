import { normalizeCuit, type CreditFileRecord } from '@rayfin-app/shared';
import { getRayfinClient } from '@/lib/rayfin-client';
import {
  OPINION_CHOICES,
  type CreditCase,
  type NewCaseInput,
  type OpinionInput,
} from './cases';

const selection = [
  'id',
  'company',
  'area',
  'segment',
  'holderCount',
  'primaryCuit',
  'createdAt',
  'opinionChoice',
  'opinionNote',
  'opinionAt',
] as const;

type SelectedRecord = Pick<CreditFileRecord, (typeof selection)[number]>;
type StoredFile = Omit<SelectedRecord, 'createdAt' | 'opinionAt'> & {
  createdAt: Date | string;
  opinionAt?: Date | string | null;
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

function present(row: StoredFile, owner: string): CreditCase {
  const created = new Date(row.createdAt);
  const signed = row.opinionAt ? new Date(row.opinionAt) : null;
  return {
    id: row.id,
    code: 'CR-' + row.id.slice(0, 8).toUpperCase(),
    name: row.company,
    area: row.area,
    segment: row.segment,
    holders: row.holderCount,
    cuit: row.primaryCuit || undefined,
    source: 'saved',
    stage: 0,
    owner,
    createdOn: dateInArgentina.format(created),
    dueDate: null,
    event: '',
    limit: null,
    used: null,
    opinion:
      row.opinionChoice && row.opinionNote && signed
        ? {
            choice: row.opinionChoice,
            note: row.opinionNote,
            author: owner,
            time: signedTime.format(signed),
          }
        : null,
  };
}

async function authenticatedStore() {
  const client = await getRayfinClient();
  const session = client.auth.getSession();
  if (!session.isAuthenticated || session.isAnonymous || !session.user) {
    throw new Error('Iniciá sesión en Fabric para acceder a tus carpetas.');
  }
  return {
    files: client.data.CreditFile,
    userId: session.user.id,
    owner: session.user.email || session.user.id,
  };
}

export async function listCases(): Promise<CreditCase[]> {
  const { files, owner } = await authenticatedStore();
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
    cases.push(...page.items.map((row) => present(row, owner)));
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

export async function createCase(input: NewCaseInput): Promise<CreditCase> {
  const name = input.name.trim();
  const segment = input.segment.trim();
  const rawCuit = input.cuit?.trim();
  const cuit = rawCuit ? normalizeCuit(rawCuit) : undefined;
  if (!name || name.length > 160)
    throw new Error('Ingresá una razón social de hasta 160 caracteres.');
  if (!['py', 'ge'].includes(input.area))
    throw new Error('Seleccioná un área responsable.');
  if (!['MiPyME', 'Gran empresa', 'Cooperativa'].includes(segment))
    throw new Error('Seleccioná un segmento.');
  if (
    !Number.isInteger(input.holders) ||
    input.holders < 1 ||
    input.holders > 5
  ) {
    throw new Error('Indicá entre 1 y 5 titulares.');
  }
  if (rawCuit && !cuit)
    throw new Error('Revisá los dígitos del CUIT del titular principal.');
  const { files, userId, owner } = await authenticatedStore();
  const row = await files.create({
    company: name,
    area: input.area,
    segment,
    holderCount: input.holders,
    primaryCuit: cuit,
    owner_id: userId,
    createdAt: new Date(),
  });
  return present(row, owner);
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
  const { files, owner } = await authenticatedStore();
  const row = await files
    .select(selection)
    .where({ id: { eq: id } })
    .findFirst();
  if (!row)
    throw new Error('Esta carpeta ya no está disponible para tu usuario.');
  // One mutation commits the complete signed opinion; a failed save keeps the old version intact.
  const updated = await files.update(
    { id },
    {
      opinionChoice: input.choice,
      opinionNote: note,
      opinionAt: new Date(),
    },
  );
  return present({ ...row, ...updated }, owner);
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
