export interface EntityDebt {
  name: string;
  amount: number;
  situation: number;
  daysLate: number | null;
  review: boolean;
  court: boolean;
}
export interface Month {
  period: string;
  total: number;
  situation: number;
}
interface Cheque {
  bank: string;
  number: string;
  cause: string;
  amount: number;
  rejected: string;
  lifted: string | null;
  finePaid: string | null;
  fineStatus: string | null;
  review: boolean;
  court: boolean;
}
type Source<T> = { state: 'ok'; subject: string; value: T } | { state: 'empty' } | { state: 'error'; message: string };
export interface BcraReport {
  cuit: string;
  consultedAt: string;
  current: Source<{ period: string; entities: EntityDebt[] }>;
  history: Source<Month[]>;
  cheques: Source<Cheque[]>;
}

type RecordValue = Record<string, unknown>;
const base = 'https://api.bcra.gob.ar/CentralDeDeudores/v1.0/Deudas/';
const maxBytes = 2 * 1024 * 1024;
const formatError = 'El BCRA devolvió un formato que no se pudo verificar.';
function object(value: unknown): RecordValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(formatError);
  return value as RecordValue;
}
function list(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error(formatError);
  return value;
}
function text(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 512) throw new Error(formatError);
  return value.trim();
}
function code(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : text(value);
}
function nonnegative(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error(formatError);
  return value;
}
function optionalText(value: unknown) {
  return value == null || value === '' ? null : text(value);
}
function periodKey(value: unknown) {
  const key = code(value);
  if (!/^\d{4}(0[1-9]|1[0-2])$/.test(key)) throw new Error(formatError);
  return key;
}
function periods(result: RecordValue) {
  return list(result.periodos).map(object).map(row => ({
    period: periodKey(row.periodo),
    entities: list(row.entidades).map(object).map(e => ({
      name: text(e.entidad), amount: nonnegative(e.monto), situation: nonnegative(e.situacion),
      daysLate: e.diasAtrasoPago == null ? null : nonnegative(e.diasAtrasoPago),
      review: e.enRevision === true, court: e.procesoJud === true,
    })),
  })).filter(p => p.entities.length > 0).sort((a,b) => a.period.localeCompare(b.period));
}
function cheques(result: RecordValue): Cheque[] | null {
  const rows: Cheque[] = [];
  for (const group of list(result.causales).map(object)) {
    const cause = text(group.causal);
    for (const bank of list(group.entidades).map(object)) {
      for (const raw of list(bank.detalle)) {
        const c = object(raw);
        rows.push({ bank: code(bank.entidad), number: code(c.nroCheque), cause,
          amount: nonnegative(c.monto), rejected: text(c.fechaRechazo),
          lifted: optionalText(c.fechaPago), finePaid: optionalText(c.fechaPagoMulta),
          fineStatus: optionalText(c.estadoMulta), review: c.enRevision === true, court: c.procesoJud === true });
      }
    }
  }
  return rows.length ? rows : null;
}
async function loadPayload(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error(formatError);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new Error('La respuesta del BCRA supera el tamaño permitido.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return object(JSON.parse(Buffer.concat(chunks).toString('utf8')));
}
async function query<T>(operation: string, cuit: string, parse: (r: RecordValue) => T | null): Promise<Source<T>> {
  try {
    const response = await fetch(base + operation + cuit, {
      headers: {Accept: 'application/json'}, signal: AbortSignal.timeout(18_000), redirect: 'error',
    });
    if (!response.ok && response.status !== 404) {
      return {state:'error', message:`El BCRA respondió HTTP ${response.status}. Podés volver a consultar.`};
    }
    const body = await loadPayload(response);
    if (response.status === 404 && body.status === 404 && Array.isArray(body.errorMessages) &&
      body.errorMessages.some(m => typeof m === 'string' && /no se encontr.{1,4} datos|sin registros/i.test(m))) {
      return {state:'empty'};
    }
    const result = object(body.results);
    if (!response.ok || body.status !== 200 || String(result.identificacion) !== cuit) throw new Error(formatError);
    const value = parse(result);
    return value === null ? {state:'empty'} : {state:'ok', subject:text(result.denominacion), value};
  } catch (error) {
    return {state:'error', message: error instanceof Error && error.name === 'TimeoutError'
      ? 'El BCRA no respondió a tiempo. Volvé a intentar.'
      : 'No se pudo obtener una respuesta verificable del BCRA. Volvé a intentar.'};
  }
}
export async function queryBcra(input: string): Promise<BcraReport> {
  const cuit = typeof input === 'string' ? input.replace(/[\s-]/g, '') : '';
  const weights = [5,4,3,2,7,6,5,4,3,2];
  const sum = weights.reduce((acc, weight, i) => acc + weight * Number(cuit[i]), 0);
  if (!/^\d{11}$/.test(cuit) || /^(\d)\1+$/.test(cuit) || (11 - sum % 11) % 11 !== Number(cuit[10])) {
    throw new Error('Revisá el CUIT y su dígito verificador.');
  }
  const [current, history, rejected] = await Promise.all([
    query('', cuit, result => periods(result).at(-1) ?? null),
    query('Historicas/', cuit, result => {
      const months = periods(result).slice(-24).map(p => ({period:p.period,
        total:p.entities.reduce((s,e) => s+e.amount,0), situation:Math.max(...p.entities.map(e => e.situation))}));
      return months.length ? months : null;
    }),
    query('ChequesRechazados/', cuit, cheques),
  ]);
  return {cuit, consultedAt: new Date().toISOString(), current, history, cheques: rejected};
}
