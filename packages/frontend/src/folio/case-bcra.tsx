import { useState } from 'react';
import { Landmark, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BcraPanel } from './BcraPanel';
import { EntityChart, HistoryChart } from './BcraCharts';
import { CaseFields } from './case-evaluation';
import {
  captionStyle,
  numberLabel,
  sectionStyle,
  titleStyle,
} from './case-format';
import type { CreditCase } from './cases';

const sampleTotals = [
  4200, 4460, 4310, 4650, 4790, 5050, 5320, 5160, 5480, 5600, 5840, 5730, 5500,
  5660, 5820, 5990, 6110, 6040, 5780, 5610, 5480, 5270, 5060, 5250,
];

function DemoReport({ record }: { record: CreditCase }) {
  const [holder, setHolder] = useState(0);
  const closedSample = record.code === 'CR-26087';
  const detailedIndex = Number(record.code.slice(3)) - 26081;
  const total = (detailedIndex + 1) * 750;
  const first = Math.round(total * 0.64);
  const entities = [
    { name: 'Banco del Estuario', amount: first, situation: 1 },
    {
      name: 'Financiera del Centro',
      amount: total - first,
      situation: closedSample ? 2 : 1,
    },
  ];
  const months = sampleTotals.map((value, i) => {
    const date = new Date(Date.UTC(2024, 10 + i, 1));
    return {
      period: `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}`,
      total: Math.round((value * total) / 5250),
      situation: closedSample && i >= 20 ? 2 : 1,
    };
  });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className={captionStyle}>BCRA · Datos de muestra</p>
          <h3 className={titleStyle}>
            {holder === 0 ? record.name : `Cotitular ${holder + 1}`}
          </h3>
        </div>
        {record.holders > 1 && (
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            Titular
            <select
              className="rounded-lg border border-input bg-card px-3 py-2 text-foreground"
              value={holder}
              onChange={(e) => setHolder(Number(e.target.value))}
            >
              {Array.from({ length: record.holders }, (_, i) => (
                <option key={i} value={i}>
                  {i === 0 ? record.name : `Cotitular ${i + 1} · Pendiente`}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {holder > 0 ? (
        <Card className={sectionStyle}>
          <h4 className="font-semibold">Consulta pendiente</h4>
          <p className="text-sm text-muted-foreground">
            Falta conocer la deuda y los cheques del cotitular.
          </p>
        </Card>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Consulta simulada del {closedSample ? '20' : '26'} nov 2026 · Deuda
            informada para octubre de 2026.
          </p>
          <div className="grid grid-cols-3 divide-x divide-border overflow-hidden rounded-xl border border-border bg-card">
            {(
              [
                ['Deuda informada', numberLabel(total), 'miles de ARS'],
                [
                  'Mayor situación',
                  closedSample ? '2' : '1',
                  'entre dos entidades',
                ],
                [
                  'Cheques rechazados',
                  closedSample ? '1' : '0',
                  closedSample
                    ? 'levantamiento informado'
                    : 'sin registros informados',
                ],
              ] as const
            ).map(([label, value, unit]) => (
              <div className="min-w-0 px-2 py-3 sm:px-4" key={label}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="font-heading text-2xl font-semibold text-primary">
                  {value}
                </p>
                <p className="text-xs text-muted-foreground">{unit}</p>
              </div>
            ))}
          </div>
          <div className="grid min-w-0 items-start gap-4 lg:grid-cols-2">
            <HistoryChart months={months} />
            <EntityChart entities={entities} period="202610" />
          </div>
          <Card className={sectionStyle}>
            <h4 className={titleStyle}>Situación por entidad</h4>
            <CaseFields
              items={entities.map((e) => [
                e.name,
                e.situation === 2
                  ? 'Situación 2 · 38 días de atraso · En revisión'
                  : 'Situación 1 · Atraso no aplicable',
              ])}
            />
          </Card>
          <Card className={sectionStyle}>
            <h4 className={titleStyle}>Cheques rechazados</h4>
            {closedSample ? (
              <CaseFields
                items={[
                  ['Cheque', '80031'],
                  ['Causal', 'Defectos formales'],
                  ['Monto', 'ARS 185.000'],
                  ['Fecha de rechazo', '5 nov 2026'],
                  ['Levantamiento', '11 nov 2026'],
                  ['Pago de multa', '12 nov 2026'],
                ]}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Sin registros informados en la consulta de muestra.
              </p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

export function CaseBcra({
  record,
  initialReal = false,
}: {
  record: CreditCase;
  initialReal?: boolean;
}) {
  const [real, setReal] = useState(record.source === 'saved' || initialReal);
  if (record.source === 'saved') return <BcraPanel initialCuit={record.cuit} />;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
        <div className="flex items-center gap-3">
          <Landmark className="size-5 text-primary" />
          <div>
            <p className="text-sm font-semibold">Central de Deudores</p>
            <p className="text-xs text-muted-foreground">
              {real
                ? 'Consulta real independiente de los datos de la carpeta ficticia.'
                : 'Consultá un CUIT real o explorá la muestra de la carpeta.'}
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => setReal(!real)}>
          {real ? 'Ver muestra' : 'Consultar por CUIT'}
          <ArrowRight className="size-4" />
        </Button>
      </div>
      {real ? <BcraPanel /> : <DemoReport record={record} />}
    </div>
  );
}
