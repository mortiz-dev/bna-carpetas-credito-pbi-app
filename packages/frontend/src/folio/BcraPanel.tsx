import { useId, useState, type FormEvent } from 'react';
import { Landmark, LoaderCircle, Search } from 'lucide-react';
import { normalizeCuit } from '@rayfin-app/shared';
import type { AppFunctionsSchema } from '@rayfin-app/functions/types';
import { getRayfinClient } from '@/lib/rayfin-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EntityChart, HistoryChart } from './BcraCharts';

type Report = AppFunctionsSchema['consultarBcra']['output'];
const ars = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  currencyDisplay: 'code',
});
const number = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 });
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
      className="rounded-md bg-muted p-3 text-sm"
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
  return (
    <div className="grid min-w-0 gap-4" aria-label="Resultado de la consulta">
      <header>
        <h3 className="text-xl font-semibold">
          {subject || 'Resultado por CUIT'}
        </h3>
        <p className="text-sm text-muted-foreground">
          CUIT {report.cuit} · Consulta{' '}
          {consulted.format(new Date(report.consultedAt))} (Argentina)
        </p>
      </header>
      <Card className="gap-2 p-4">
        <h3 className="font-semibold">Deuda informada</h3>
        {current.state !== 'ok' ? (
          <SourceNote
            result={current}
            empty="Sin registros informados en la consulta de deuda actual."
          />
        ) : (
          <>
            <p className="text-lg font-semibold">
              {number.format(
                current.value.entities.reduce((sum, e) => sum + e.amount, 0),
              )}{' '}
              miles de ARS
            </p>
            <p className="text-sm text-muted-foreground">
              {current.value.entities.length} entidades · Período{' '}
              {current.value.period.slice(4)}/{current.value.period.slice(0, 4)}
            </p>
            <details className="min-w-0 text-sm">
              <summary className="cursor-pointer font-medium text-primary">
                Ver situación por entidad
              </summary>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr>
                      {[
                        'Entidad',
                        'Miles de ARS',
                        'Situación',
                        'Atraso',
                        'Observaciones',
                      ].map((label) => (
                        <th key={label} className="p-2">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {current.value.entities.map((e, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">{e.name}</td>
                        <td className="p-2">{number.format(e.amount)}</td>
                        <td className="p-2">{e.situation}</td>
                        <td className="p-2">
                          {e.daysLate === null
                            ? 'Sin dato'
                            : e.daysLate === 0
                              ? 'No aplicable'
                              : e.daysLate + ' días'}
                        </td>
                        <td className="p-2">
                          {[
                            e.review && 'En revisión',
                            e.court && 'Proceso judicial',
                          ]
                            .filter(Boolean)
                            .join(' · ') || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </>
        )}
      </Card>
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        {history.state === 'ok' ? (
          <HistoryChart months={history.value} />
        ) : (
          <Card className="gap-2 p-4">
            <h3 className="font-semibold">Historial de deuda</h3>
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
      <Card className="gap-3 p-4">
        <h3 className="font-semibold">Cheques rechazados</h3>
        {cheques.state !== 'ok' ? (
          <SourceNote
            result={cheques}
            empty="El BCRA no encontró registros de cheques rechazados para este CUIT."
          />
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {cheques.value.length} registros · Importes en pesos
            </p>
            {cheques.value.map((c, i) => (
              <details key={i} className="border-t pt-3 text-sm">
                <summary className="cursor-pointer font-medium">
                  {c.rejected} · {c.cause} · {ars.format(c.amount)}
                </summary>
                <dl className="mt-2 grid gap-2 sm:grid-cols-2">
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
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              </details>
            ))}
          </>
        )}
      </Card>
      <a
        href={guide}
        target="_blank"
        rel="noreferrer"
        className="text-sm font-medium text-primary underline"
      >
        Manual de la API Central de Deudores
      </a>
    </div>
  );
}

export function BcraPanel({ initialCuit = '' }: { initialCuit?: string }) {
  const inputId = useId();
  const [input, setInput] = useState(initialCuit);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function consult(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    setReport(null);
    setError('');
    const cuit = normalizeCuit(input);
    if (!cuit) {
      setError('Revisá los 11 dígitos y el verificador del CUIT.');
      return;
    }
    setLoading(true);
    try {
      const client = await getRayfinClient();
      setReport(
        await client.functions.consultarBcra.invoke(
          { cuit },
          { timeoutMs: 25_000 },
        ),
      );
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
      <Card className="gap-3 p-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
          <Landmark size={16} aria-hidden /> API oficial · Consulta real
        </div>
        <h3 className="text-xl font-semibold">Buscar titular por CUIT</h3>
        <p className="text-sm text-muted-foreground">
          Deuda, historial y cheques rechazados del titular consultado.
        </p>
        <form onSubmit={consult} className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-sm font-medium" htmlFor={inputId}>
            CUIT
            <Input
              id={inputId}
              value={input}
              inputMode="numeric"
              maxLength={16}
              required
              disabled={loading}
              onChange={(event) => {
                setInput(event.target.value);
                setReport(null);
                setError('');
              }}
              placeholder="11 dígitos"
            />
          </label>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <LoaderCircle className="animate-spin" aria-hidden />
            ) : (
              <Search aria-hidden />
            )}
            {loading ? 'Consultando…' : 'Consultar BCRA'}
          </Button>
        </form>
        {loading && (
          <p role="status" className="text-sm">
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
