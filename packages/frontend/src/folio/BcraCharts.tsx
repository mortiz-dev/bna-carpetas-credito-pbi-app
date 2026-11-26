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

const historySpec: VisualizationSpec = {
  mark: { type: 'bar', tooltip: true },
  encoding: {
    x: {
      field: 'month',
      type: 'ordinal',
      sort: null,
      axis: { title: null, labelAngle: -45 },
    },
    y: {
      field: 'debt',
      type: 'quantitative',
      axis: { title: 'Miles de ARS', tickCount: 4 },
    },
    tooltip: [
      { field: 'month', type: 'nominal', title: 'Mes' },
      { field: 'debt', type: 'quantitative', title: 'Miles de ARS' },
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
      ],
      rows: values.map(({ label, data }) => [label, data?.total ?? null]),
    }),
    [values],
  );

  return (
    <Card className="min-w-0 gap-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Evolución de la deuda</h3>
        <select
          className="rounded-md border bg-card px-2 py-1 text-sm"
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
      <p className="text-xs text-muted-foreground">
        Suma mensual por titular · miles de ARS
      </p>
      <VegaVisual
        chromeless
        spec={historySpec}
        data={table}
        theme={theme}
        style={{ height: 200 }}
      />
      <details className="text-sm">
        <summary className="cursor-pointer font-medium text-primary">
          Ver valores por mes
        </summary>
        <table className="mt-2 w-full text-left">
          <thead>
            <tr>
              <th>Período</th>
              <th>Miles de ARS</th>
              <th>Mayor situación</th>
            </tr>
          </thead>
          <tbody>
            {values.map(({ label, data }) => (
              <tr className="border-t" key={label}>
                <td>{label}</td>
                <td>{data ? integer.format(data.total) : 'Sin información'}</td>
                <td>{data?.situation ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </Card>
  );
}

const entitySpec: VisualizationSpec = {
  mark: { type: 'bar', tooltip: true },
  encoding: {
    y: {
      field: 'entity',
      type: 'nominal',
      sort: '-x',
      axis: { title: null, labelLimit: 125 },
    },
    x: {
      field: 'amount',
      type: 'quantitative',
      axis: { title: 'Miles de ARS', tickCount: 4 },
    },
    tooltip: [
      { field: 'entity', type: 'nominal', title: 'Entidad' },
      { field: 'amount', type: 'quantitative', title: 'Miles de ARS' },
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
      ],
      rows: top.map((e) => [e.name, e.amount]),
    }),
    [top],
  );
  return (
    <Card className="min-w-0 gap-3 p-4">
      <h3 className="font-semibold">Deuda por entidad</h3>
      <p className="text-xs text-muted-foreground">
        {monthLabel.format(monthDate(period))} ·{' '}
        {entities.length > 8 ? '8 mayores entidades' : 'Entidades informantes'}{' '}
        · miles de ARS
      </p>
      <VegaVisual
        chromeless
        spec={entitySpec}
        data={table}
        theme={theme}
        style={{ height: Math.max(140, top.length * 21 + 42) }}
      />
    </Card>
  );
}
