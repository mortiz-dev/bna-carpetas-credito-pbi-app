import { useId, useState, type FormEvent } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  Landmark,
  LoaderCircle,
  Search,
} from 'lucide-react';
import { normalizeCuit } from '@rayfin-app/shared';
import type { AppFunctionsSchema } from '@rayfin-app/functions/types';
import { getRayfinClient } from '@/lib/rayfin-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EntityChart, HistoryChart } from './BcraCharts';
import { BcraEntityTable, BcraKpiStrip } from './BcraSummary';
import { formatCuitDisplay, sectionStyle, titleStyle } from './case-format';

type Report = AppFunctionsSchema['consultarBcra']['output'];

const ars = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  currencyDisplay: 'code',
});
const consulted = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Argentina/Buenos_Aires',
});
const guide =
  'https://www.bcra.gob.ar/archivos/Catalogo/Content/files/pdf/central-deudores-v1.pdf';

function SourceNote({
  result,
  empty,
}: {
  result: { state: 'empty' } | { state: 'error'; message: string };
  empty: string;
}) {
  return (
    <p
      className="rounded-lg bg-muted p-3 text-sm text-muted-foreground"
      role={result.state === 'error' ? 'alert' : 'status'}
    >
      {result.state === 'error' ? result.message : empty}
    </p>
  );
}

function BcraResults({ report }: { report: Report }) {
  const { current, history, cheques } = report;
  const subject = [current, history, cheques].find(
    (result) => result.state === 'ok',
  )?.subject;

  const currentEntities =
    current.state === 'ok' ? current.value.entities : null;
  const totalDebt = currentEntities
    ? currentEntities.reduce((sum, e) => sum + e.amount, 0)
    : null;
  const maxSituation =
    currentEntities && currentEntities.length > 0
      ? Math.max(...currentEntities.map((e) => e.situation))
      : null;
  const chequesCount =
    cheques.state === 'ok'
      ? cheques.value.length
      : cheques.state === 'empty'
        ? 0
        : null;
  const chequesSubtitle =
    cheques.state === 'ok'
      ? `${cheques.value.length} ${cheques.value.length === 1 ? 'registro informado' : 'registros informados'}`
      : cheques.state === 'empty'
        ? 'Sin registros informados'
        : 'Consulta con error';

  return (
    <div className="grid min-w-0 gap-4" aria-label="Resultado de la consulta">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className={titleStyle}>{subject || 'Resultado por CUIT'}</h3>
          <p className="text-xs text-muted-foreground tabular-nums">
            CUIT {formatCuitDisplay(report.cuit)} · Consulta{' '}
            {consulted.format(new Date(report.consultedAt))} (Argentina)
            {current.state === 'ok' &&
              ` · Período ${current.value.period.slice(4)}/${current.value.period.slice(0, 4)}`}
          </p>
        </div>
        <a
          href={guide}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          Manual API BCRA <ExternalLink className="size-3" aria-hidden="true" />
        </a>
      </header>

      <BcraKpiStrip
        totalDebt={totalDebt}
        entityCount={currentEntities?.length ?? 0}
        maxSituation={maxSituation}
        chequesCount={chequesCount}
        chequesSubtitle={chequesSubtitle}
      />

      {current.state !== 'ok' && (
        <Card className={sectionStyle}>
          <h4 className="font-semibold">Deuda informada</h4>
          <SourceNote
            result={current}
            empty="Sin registros informados en la consulta de deuda actual."
          />
        </Card>
      )}

      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        {history.state === 'ok' ? (
          <HistoryChart months={history.value} />
        ) : (
          <Card className={sectionStyle}>
            <h4 className="font-semibold">Historial de deuda</h4>
            <SourceNote
              result={history}
              empty="Sin períodos históricos informados."
            />
          </Card>
        )}
        {current.state === 'ok' && (
          <EntityChart
            entities={current.value.entities}
            period={current.value.period}
          />
        )}
      </div>

      {currentEntities && currentEntities.length > 0 && (
        <BcraEntityTable entities={currentEntities} />
      )}

      <Card className={sectionStyle}>
        <h4 className={titleStyle}>Cheques rechazados</h4>
        {cheques.state !== 'ok' ? (
          <SourceNote
            result={cheques}
            empty="El BCRA no encontró registros de cheques rechazados para este CUIT."
          />
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              {cheques.value.length} registros · Importes en pesos argentinos
            </p>
            {cheques.value.map((c, i) => (
              <details
                key={i}
                className="border-t border-border pt-3 text-sm"
                open={cheques.value.length <= 3}
              >
                <summary className="cursor-pointer font-medium tabular-nums">
                  {c.rejected} · {c.cause} · {ars.format(c.amount)}
                </summary>
                <dl className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
                  {[
                    ['Cheque', c.number],
                    ['Entidad (código)', c.bank],
                    [
                      'Fecha de levantamiento',
                      c.lifted || 'Sin fecha informada',
                    ],
                    [
                      'Multa',
                      c.finePaid
                        ? 'Pagada el ' + c.finePaid
                        : c.fineStatus || 'Sin dato',
                    ],
                    ['En revisión', c.review ? 'Sí' : 'No'],
                    ['Proceso judicial', c.court ? 'Sí' : 'No'],
                  ].map(([key, value]) => (
                    <div key={key}>
                      <dt className="text-muted-foreground">{key}</dt>
                      <dd className="font-medium">{value}</dd>
                    </div>
                  ))}
                </dl>
              </details>
            ))}
          </>
        )}
      </Card>
    </div>
  );
}

export function BcraPanel({ initialCuit = '' }: { initialCuit?: string }) {
  const inputId = useId();
  const [input, setInput] = useState(() =>
    initialCuit ? formatCuitDisplay(initialCuit) : '',
  );
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const normalized = normalizeCuit(input);
  const digitsCount = input.replace(/\D/g, '').length;

  async function consult(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    setError('');
    const cuit = normalizeCuit(input);
    if (!cuit) {
      setError('Revisá los 11 dígitos y el verificador del CUIT.');
      return;
    }
    setLoading(true);
    try {
      const client = await getRayfinClient();
      const next = await client.functions.consultarBcra.invoke(
        { cuit },
        { timeoutMs: 25_000 },
      );
      setReport(next);
    } catch {
      setError(
        'No se pudo ejecutar la consulta. Verificá tu sesión y la disponibilidad de la función BCRA.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="grid min-w-0 gap-4">
      <Card className={sectionStyle}>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
          <Landmark className="size-4" aria-hidden="true" /> API oficial ·
          Consulta real
        </div>
        <div>
          <h3 className={titleStyle}>Buscar titular por CUIT</h3>
          <p className="text-xs text-muted-foreground">
            Deuda vigente, evolución histórica y cheques rechazados en la
            Central de Deudores del BCRA.
          </p>
        </div>
        <form onSubmit={consult} className="flex flex-wrap items-end gap-3">
          <label
            className="grid min-w-52 flex-1 gap-1 text-xs font-semibold sm:flex-none"
            htmlFor={inputId}
          >
            CUIT
            <Input
              id={inputId}
              value={input}
              inputMode="numeric"
              maxLength={13}
              required
              disabled={loading}
              className="font-mono tabular-nums"
              onChange={(event) => {
                setInput(formatCuitDisplay(event.target.value));
                setError('');
              }}
              placeholder="XX-XXXXXXXX-X"
            />
          </label>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            ) : (
              <Search aria-hidden="true" />
            )}
            {loading ? 'Consultando…' : 'Consultar BCRA'}
          </Button>
          {digitsCount === 11 && normalized && !error && (
            <span className="inline-flex items-center gap-1 pb-2 text-xs font-medium text-success">
              <CheckCircle2 className="size-3.5" aria-hidden="true" /> CUIT
              válido
            </span>
          )}
        </form>
        {loading && (
          <p role="status" className="text-sm text-muted-foreground">
            Consultando la Central de Deudores…
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </Card>
      {report && <BcraResults report={report} />}
    </section>
  );
}
