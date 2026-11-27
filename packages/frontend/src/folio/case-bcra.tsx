import { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Landmark,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { BcraPanel } from './BcraPanel';
import { EntityChart, HistoryChart } from './BcraCharts';
import { BcraEntityTable, BcraKpiStrip, type BcraEntityRow } from './BcraSummary';
import { CaseFields } from './case-evaluation';
import { captionStyle, sectionStyle, titleStyle } from './case-format';
import type { CreditCase } from './cases';

const sampleTotals = [
  4200, 4460, 4310, 4650, 4790, 5050, 5320, 5160, 5480, 5600, 5840, 5730, 5500,
  5660, 5820, 5990, 6110, 6040, 5780, 5610, 5480, 5270, 5060, 5250,
];

function sampleBcraMeta(record: CreditCase) {
  const closedSample = record.code === 'CR-26087';
  const parsed = Number(record.code.slice(3));
  const detailedIndex = Number.isFinite(parsed) ? Math.max(0, parsed - 26081) : 0;
  const total = (detailedIndex + 1) * 750;
  return {
    closedSample,
    total,
    maxSituation: closedSample ? 2 : 1,
    cheques: closedSample ? 1 : 0,
    pendingCoHolder: record.holders > 1,
  };
}

function DemoReport({ record }: { record: CreditCase }) {
  const [holder, setHolder] = useState(0);
  const meta = sampleBcraMeta(record);
  const { closedSample, total } = meta;
  const first = Math.round(total * 0.64);
  const entities: BcraEntityRow[] = [
    {
      name: 'Banco del Estuario',
      amount: first,
      situation: 1,
      daysLate: 0,
    },
    {
      name: 'Financiera del Centro',
      amount: total - first,
      situation: closedSample ? 2 : 1,
      daysLate: closedSample ? 38 : 0,
      review: closedSample,
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
          {holder === 0 && (
            <p className="text-xs text-muted-foreground">
              Consulta simulada del {closedSample ? '20' : '26'} nov 2026 ·
              Deuda informada para octubre de 2026
            </p>
          )}
        </div>
      </div>

      {record.holders > 1 && (
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Titulares de la carpeta"
        >
          {Array.from({ length: record.holders }, (_, i) => {
            const active = holder === i;
            const pending = i > 0;
            return (
              <button
                key={i}
                type="button"
                aria-pressed={active}
                onClick={() => setHolder(i)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : pending
                      ? 'border-warning/40 bg-warning-surface text-warning hover:border-warning'
                      : 'border-border bg-card text-foreground hover:bg-accent',
                )}
              >
                {pending ? (
                  <AlertTriangle className="size-3.5" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="size-3.5" aria-hidden="true" />
                )}
                {i === 0 ? record.name : `Cotitular ${i + 1} · Pendiente`}
              </button>
            );
          })}
        </div>
      )}

      {holder > 0 ? (
        <Card className={cn(sectionStyle, 'border-warning/40')}>
          <div className="flex items-center gap-2 text-warning">
            <AlertTriangle className="size-4" aria-hidden="true" />
            <h4 className="font-semibold">Consulta pendiente</h4>
          </div>
          <p className="text-sm text-muted-foreground">
            Falta conocer la deuda y los cheques del cotitular antes de emitir
            un dictamen definitivo. Podés cambiar a{' '}
            <strong>Consultar por CUIT</strong> arriba para buscar un titular
            real en la API del BCRA.
          </p>
        </Card>
      ) : (
        <>
          <BcraKpiStrip
            totalDebt={total}
            entityCount={entities.length}
            maxSituation={meta.maxSituation}
            chequesCount={meta.cheques}
            chequesSubtitle={
              closedSample
                ? 'Con levantamiento informado'
                : 'Sin registros informados'
            }
          />
          <div className="grid min-w-0 items-start gap-4 xl:grid-cols-2">
            <HistoryChart months={months} />
            <EntityChart entities={entities} period="202610" />
          </div>
          <BcraEntityTable entities={entities} />
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
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3.5">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-accent text-primary">
            <Landmark className="size-4" aria-hidden="true" />
          </span>
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
