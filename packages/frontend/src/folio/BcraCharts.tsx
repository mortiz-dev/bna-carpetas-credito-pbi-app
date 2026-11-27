import { useMemo, useState } from 'react';
import {
  useCssTheme,
  VegaVisual,
  type VisualizationSpec,
} from '@microsoft/fabric-visuals';
import { Card } from '@/components/ui/card';

const integer = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 });
const monthLabel = new Intl.DateTimeFormat('es-AR', {
  month: 'short',
  year: '2-digit',
  timeZone: 'UTC',
});

function monthDate(key: string) {
  return new Date(
    Date.UTC(Number(key.slice(0, 4)), Number(key.slice(4, 6)) - 1, 1),
  );
}

function situationBucket(situation: number | undefined): string {
  if (!situation || situation <= 1) return 'Sit. 1';
  if (situation === 2) return 'Sit. 2';
  return 'Sit. 3+';
}

const historySpec: VisualizationSpec = {
  mark: { type: 'bar', cornerRadiusEnd: 4, tooltip: true },
  encoding: {
    x: {
      field: 'month',
      type: 'ordinal',
      sort: null,
      axis: { title: null, labelAngle: -40 },
    },
    y: {
      field: 'debt',
      type: 'quantitative',
      axis: { title: 'Miles de ARS', tickCount: 4 },
    },
    color: {
      field: 'situation',
      type: 'nominal',
      title: 'Situación',
      scale: {
        domain: ['Sit. 1', 'Sit. 2', 'Sit. 3+'],
        range: ['#1a5342', '#c87517', '#c50f1f'],
      },
      legend: { orient: 'top', direction: 'horizontal', title: null },
    },
    tooltip: [
      { field: 'month', type: 'nominal', title: 'Mes' },
      { field: 'debt', type: 'quantitative', title: 'Miles de ARS' },
      { field: 'situation', type: 'nominal', title: 'Mayor situación' },
    ],
  },
};

export function HistoryChart({
  months,
}: {
  months: { period: string; total: number; situation: number }[];
}) {
  const [range, setRange] = useState(12);
  const theme = useCssTheme();
  const values = useMemo(() => {
    const sorted = [...months].sort((a, b) => a.period.localeCompare(b.period));
    const last = sorted.at(-1);
    if (!last) return [];
    const end = monthDate(last.period);
    const index = new Map(months.map((m) => [m.period, m]));
    return Array.from({ length: range }, (_, i) => {
      const date = new Date(
        Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - range + i + 1, 1),
      );
      const key = date.toISOString().slice(0, 7).replace('-', '');
      return { label: monthLabel.format(date), data: index.get(key) };
    });
  }, [months, range]);

  const table = useMemo(
    () => ({
      columns: [
        { name: 'month', displayName: 'Mes' },
        { name: 'debt', displayName: 'Deuda en miles de ARS' },
        { name: 'situation', displayName: 'Mayor situación' },
      ],
      rows: values.map(({ label, data }) => [
        label,
        data?.total ?? null,
        situationBucket(data?.situation),
      ]),
    }),
    [values],
  );

  return (
    <Card className="min-w-0 gap-3 rounded-2xl border border-border bg-card p-4 shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-heading text-base font-semibold">
            Evolución de la deuda
          </h3>
          <p className="text-xs text-muted-foreground">
            Suma mensual por titular · miles de ARS
          </p>
        </div>
        <select
          className="folio-select h-8 text-xs"
          aria-label="Período del gráfico"
          value={range}
          onChange={(e) => setRange(Number(e.target.value))}
        >
          {[6, 12, 24].map((n) => (
            <option key={n} value={n}>
              {n} meses
            </option>
          ))}
        </select>
      </div>
      <VegaVisual
        chromeless
        spec={historySpec}
        data={table}
        theme={theme}
        style={{ height: 215 }}
      />
      <details className="text-xs">
        <summary className="cursor-pointer font-semibold text-primary">
          Ver valores por mes
        </summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="py-1.5">Período</th>
                <th className="py-1.5 text-right">Miles de ARS</th>
                <th className="py-1.5 text-right">Mayor situación</th>
              </tr>
            </thead>
            <tbody>
              {values.map(({ label, data }) => (
                <tr className="border-t border-border" key={label}>
                  <td className="py-1.5">{label}</td>
                  <td className="py-1.5 text-right tabular-nums">
                    {data ? integer.format(data.total) : 'Sin información'}
                  </td>
                  <td className="py-1.5 text-right tabular-nums">
                    {data?.situation ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </Card>
  );
}

const entitySpec: VisualizationSpec = {
  mark: { type: 'bar', cornerRadiusEnd: 4, tooltip: true },
  encoding: {
    y: {
      field: 'entity',
      type: 'nominal',
      sort: '-x',
      axis: { title: null, labelLimit: 135 },
    },
    x: {
      field: 'amount',
      type: 'quantitative',
      axis: { title: 'Miles de ARS', tickCount: 4 },
    },
    color: {
      field: 'situation',
      type: 'nominal',
      title: 'Situación',
      scale: {
        domain: ['Sit. 1', 'Sit. 2', 'Sit. 3+'],
        range: ['#1a5342', '#c87517', '#c50f1f'],
      },
      legend: null,
    },
    tooltip: [
      { field: 'entity', type: 'nominal', title: 'Entidad' },
      { field: 'amount', type: 'quantitative', title: 'Miles de ARS' },
      { field: 'situation', type: 'nominal', title: 'Situación' },
    ],
  },
};

export function EntityChart({
  entities,
  period,
}: {
  entities: { name: string; amount: number; situation: number }[];
  period: string;
}) {
  const theme = useCssTheme();
  const top = useMemo(
    () => [...entities].sort((a, b) => b.amount - a.amount).slice(0, 8),
    [entities],
  );
  const table = useMemo(
    () => ({
      columns: [
        { name: 'entity', displayName: 'Entidad' },
        { name: 'amount', displayName: 'Deuda en miles de ARS' },
        { name: 'situation', displayName: 'Situación' },
      ],
      rows: top.map((e) => [e.name, e.amount, situationBucket(e.situation)]),
    }),
    [top],
  );
  return (
    <Card className="min-w-0 gap-3 rounded-2xl border border-border bg-card p-4 shadow-none">
      <div>
        <h3 className="font-heading text-base font-semibold">
          Deuda por entidad
        </h3>
        <p className="text-xs text-muted-foreground">
          {monthLabel.format(monthDate(period))} ·{' '}
          {entities.length > 8
            ? '8 mayores entidades'
            : 'Entidades informantes'}{' '}
          · miles de ARS
        </p>
      </div>
      <VegaVisual
        chromeless
        spec={entitySpec}
        data={table}
        theme={theme}
        style={{ height: Math.max(150, top.length * 26 + 44) }}
      />
    </Card>
  );
}
