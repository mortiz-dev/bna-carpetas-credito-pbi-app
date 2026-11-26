import {
  Building2,
  ChevronRight,
  Landmark,
  ChartNoAxesColumn,
  ArrowRight,
} from 'lucide-react';
import { type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AREA_LABELS, STAGES, demoToday, type CreditCase } from './cases';
import type { CaseTab } from './CaseDetail';

import {
  amountLabel,
  captionStyle,
  numberLabel,
  sectionStyle,
  shortDate,
  titleStyle,
} from './case-format';

const dayInMs = 86_400_000;
const sampleCutoff = Date.parse(demoToday);

export function CaseFields({ items }: { items: Array<[string, ReactNode]> }) {
  return (
    <dl className="divide-y divide-border text-sm">
      {items.map(([label, value]) => (
        <div key={label} className="grid grid-cols-2 items-baseline gap-3 py-2">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="text-right font-medium break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function RiskComparison({ record }: { record: CreditCase }) {
  const proposal = record.proposal;
  if (!proposal)
    return (
      <Card className={sectionStyle}>
        <h3 className={titleStyle}>Propuestas de riesgo</h3>
        <p className="text-sm text-muted-foreground">
          Pendientes de carga para esta carpeta.
        </p>
      </Card>
    );
  const delta =
    proposal.credit === null ? null : proposal.credit - proposal.zonal;
  const relative =
    delta === null || proposal.zonal === 0
      ? null
      : Math.abs((delta / proposal.zonal) * 100);
  const direction = (delta ?? 0) < 0 ? 'menos' : 'más';
  return (
    <Card className={sectionStyle}>
      <div>
        <p className={captionStyle}>Evaluación de riesgo</p>
        <h3 className={titleStyle}>Comparación de propuestas</h3>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {(
          [
            ['Gerencia Zonal', proposal.zonal],
            ['Crédito', proposal.credit],
          ] as const
        ).map(([label, value]) => (
          <div
            key={label}
            className={`rounded-xl border border-border p-3 ${label === 'Crédito' ? 'bg-accent' : 'bg-muted/45'}`}
          >
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 font-heading text-lg font-semibold tracking-tight tabular-nums sm:text-2xl">
              {amountLabel(value)}
            </p>
          </div>
        ))}
      </div>
      <p className="border-l-2 border-primary bg-muted/50 px-3 py-2 text-sm">
        {delta === null ? (
          'Falta la propuesta de Crédito para calcular la diferencia.'
        ) : delta === 0 ? (
          'Las dos áreas proponen el mismo importe.'
        ) : (
          <>
            Crédito propone{' '}
            <strong>
              {amountLabel(Math.abs(delta))} {direction}
            </strong>{' '}
            que la Zonal
            {relative !== null && ` (${numberLabel(relative)} % ${direction})`}.
          </>
        )}
      </p>
      <table className="w-full table-fixed text-left text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr>
            <th className="py-2">Condición</th>
            <th>Zonal</th>
            <th>Crédito</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border border-t border-border">
          <tr>
            <th scope="row" className="py-2 font-medium">
              Plazo
            </th>
            <td>{proposal.zMonths} meses</td>
            <td>
              {proposal.cMonths === null
                ? 'Pendiente'
                : `${proposal.cMonths} meses`}
            </td>
          </tr>
          <tr>
            <th scope="row" className="py-2 font-medium">
              Garantía
            </th>
            <td className="pr-2">{proposal.zGuarantee}</td>
            <td>{proposal.cGuarantee ?? 'Pendiente'}</td>
          </tr>
        </tbody>
      </table>
      <p className="text-sm text-muted-foreground">{proposal.reason}</p>
    </Card>
  );
}

function SmeWorkflow({ record }: { record: CreditCase }) {
  const { stage } = record;
  const demo = record.source === 'demo';
  const closed = demo && stage === 4;
  const demoOffset = (offset: number) =>
    new Date(sampleCutoff + offset * dayInMs).toISOString().slice(0, 10);
  const entry = record.createdOn;
  const approved = closed ? demoOffset(-2) : null;
  const risk = demo && stage >= 1 ? demoOffset(closed ? -20 : -8) : null;
  const legal = demo && stage >= 2 ? demoOffset(closed ? -14 : -4) : null;
  const commission =
    demo && stage >= 3 ? (closed ? demoOffset(-3) : record.dueDate) : null;
  const steps = [
    {
      label: 'Ingreso al área',
      fields: 'INGRESO',
      day: entry,
      note: 'Recepción y asignación de la carpeta.',
    },
    {
      label: 'Intervención de Riesgo',
      fields: 'RIESGO · CAL RIESGO',
      day: risk,
      note: legal
        ? `Calificación de Riesgo recibida el ${shortDate(demoOffset(closed ? -16 : -6))}.`
        : risk
          ? 'Calificación de Riesgo pendiente.'
          : '',
    },
    {
      label: 'Intervención de Legales',
      fields: 'ENVIO L · DICTAMEN',
      day: legal,
      note: commission
        ? `Dictamen legal recibido el ${shortDate(demoOffset(closed ? -9 : -2))}.`
        : legal
          ? 'Dictamen legal pendiente.'
          : '',
    },
    {
      label: 'Elevación y comisión',
      fields: 'ELEVACION · COMISION',
      day: commission,
      note: commission
        ? 'Elevación a HD. Comisión ' + (closed ? 'realizada.' : 'programada.')
        : '',
    },
    {
      label: 'Resolución',
      fields: 'RESOLUCION · TERMINADO',
      day: approved,
      note: closed
        ? 'Renovación autorizada por HD con revisión en el próximo control.'
        : '',
    },
  ];
  return (
    <>
      <Card className={sectionStyle}>
        <div>
          <p className={captionStyle}>Circuito MiPyMEs</p>
          <h3 className={titleStyle}>Del ingreso a la resolución</h3>
        </div>
        {closed && (
          <p className="text-sm text-muted-foreground">
            22 días entre el ingreso y la resolución.
          </p>
        )}
        <ol className="space-y-0">
          {steps.map(({ label, fields, day, note }, i) => (
            <li
              key={label}
              className="grid grid-cols-[4.5rem_0.6rem_1fr] gap-2 text-sm"
            >
              <span className="pt-0.5 text-xs font-medium text-muted-foreground">
                {day ? shortDate(day) : 'Sin registro'}
              </span>
              <span aria-hidden="true" className="relative flex justify-center">
                {i + 1 < steps.length && (
                  <span className="absolute inset-y-1 w-px bg-border" />
                )}
                <span
                  className={`relative mt-1 size-2 rounded-full border ${day ? 'border-primary bg-primary' : 'border-muted-foreground bg-card'}`}
                />
              </span>
              <div className={i + 1 < steps.length ? 'pb-3' : ''}>
                <p className="font-semibold">{label}</p>
                <p className="text-xs text-muted-foreground">{fields}</p>
                {note && <p className="mt-0.5 text-xs">{note}</p>}
              </div>
            </li>
          ))}
        </ol>
      </Card>
      <details className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <summary className="cursor-pointer text-sm font-semibold text-primary">
          Datos de la planilla MiPyMEs
        </summary>
        <CaseFields
          items={[
            ['Cliente', record.name],
            [
              'CUIT',
              record.cuit ||
                (demo ? 'Reservado en la muestra' : 'Sin registrar'),
            ],
            ['Zonal', demo ? 'Centro' : 'Sin registrar'],
            ['Equipo', demo ? 'Crédito MiPyMEs' : 'Sin registrar'],
            ['Segmento', record.segment],
            [
              'Instancia',
              demo ? (commission ? 'HD' : 'En análisis') : 'Sin registrar',
            ],
            [
              'Terminado',
              demo
                ? [
                    'EN ANALISIS',
                    'RIESGO',
                    'DICTAMEN LEGALES',
                    'COMISION HD',
                    'TERMINADO',
                  ][stage]
                : STAGES[stage],
            ],
            ...(demo
              ? ([
                  ['Días al 26 nov 2026', closed ? 24 : 11],
                  [
                    'Demora informada',
                    risk ? (closed ? '18 días' : '8 días') : 'Sin informar',
                  ],
                ] as Array<[string, ReactNode]>)
              : []),
            [
              'Observaciones',
              closed
                ? 'Se recibió documentación complementaria antes de la comisión.'
                : 'Sin observaciones.',
            ],
          ]}
        />
      </details>
    </>
  );
}

type NavigationProps = { record: CreditCase; go: (tab: CaseTab) => void };

export function SourceButtons({ go }: Pick<NavigationProps, 'go'>) {
  return (
    <div className="divide-y divide-border">
      {(
        [
          {
            tab: 'power-bi',
            label: 'Power BI',
            detail: 'Exposición interna',
            icon: ChartNoAxesColumn,
          },
          {
            tab: 'bcra',
            label: 'BCRA',
            detail: 'Deuda y cheques por titular',
            icon: Landmark,
          },
        ] as const
      ).map(({ tab, label, detail, icon: Icon }) => (
        <button
          key={tab}
          type="button"
          aria-label={`Abrir fuente: ${label}`}
          onClick={() => go(tab)}
          className="flex w-full items-center gap-3 rounded-lg py-2.5 text-left hover:bg-accent focus-visible:outline-ring"
        >
          <span className="rounded-lg bg-accent p-2 text-primary">
            <Icon className="size-4" />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-semibold">{label}</span>
            <span className="block text-xs text-muted-foreground">
              {detail}
            </span>
          </span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </button>
      ))}
    </div>
  );
}

export function CaseEvaluation({ record, go }: NavigationProps) {
  return (
    <div className="grid items-start gap-4 md:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-4">
        {record.area === 'ge' ? (
          <RiskComparison record={record} />
        ) : (
          <SmeWorkflow record={record} />
        )}
        <Card className={sectionStyle}>
          <div className="flex items-center gap-2">
            <Building2 className="size-4 text-primary" />
            <h3 className="font-semibold">Seguimiento del área</h3>
          </div>
          <CaseFields
            items={[
              ['Área responsable', AREA_LABELS[record.area]],
              [
                'Origen',
                record.source === 'demo'
                  ? record.area === 'ge'
                    ? 'Muestra · Base Grandes Empresas'
                    : 'Muestra · Estado de carpetas MiPyMEs'
                  : 'Alta en Folio',
              ],
              ['Analista asignado', record.owner],
              ['Próximo hito', record.event || 'Sin programar'],
              [
                'Fecha prevista',
                record.dueDate ? shortDate(record.dueDate) : '—',
              ],
            ]}
          />
        </Card>
      </div>
      <div className="min-w-0 space-y-4">
        <Card className={sectionStyle}>
          <h3 className={titleStyle}>Fuentes de análisis</h3>
          <SourceButtons go={go} />
        </Card>
        <Card className={sectionStyle}>
          <div>
            <p className={captionStyle}>Criterio del analista</p>
            <h3 className={titleStyle}>Dictamen</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            {record.opinion?.choice ?? 'Pendiente de registrar'}
          </p>
          <Button className="self-start" onClick={() => go('dictamen')}>
            {record.opinion ? 'Ver dictamen' : 'Redactar dictamen'}{' '}
            <ArrowRight className="size-4" />
          </Button>
        </Card>
      </div>
    </div>
  );
}

export function CasePower({ record }: { record: CreditCase }) {
  const { limit, used } = record;
  if (record.source !== 'demo' || limit === null || used === null)
    return (
      <Card className={sectionStyle}>
        <h3 className={titleStyle}>Exposición interna</h3>
        <p className="text-sm text-muted-foreground">
          Falta vincular el modelo semántico de Power BI para consultar la
          exposición de esta carpeta.
        </p>
      </Card>
    );
  const pct = limit > 0 ? (used / limit) * 100 : null;
  return (
    <Card className={sectionStyle}>
      <p className={captionStyle}>Power BI · Datos de muestra</p>
      <h3 className={titleStyle}>Exposición interna</h3>
      <p className="text-sm text-muted-foreground">
        Corte al 31 oct 2026 · Importes en millones de pesos argentinos.
      </p>
      <CaseFields
        items={[
          ['Límite vigente', amountLabel(limit)],
          ['Saldo utilizado', amountLabel(used)],
          ['Disponible', amountLabel(limit - used)],
          [
            'Utilización',
            pct === null ? 'Sin límite vigente' : `${numberLabel(pct)} %`,
          ],
        ]}
      />
      {record.proposal?.credit != null && (
        <p className="rounded-lg bg-accent p-3 text-sm">
          Con la propuesta de Crédito, el margen sobre el saldo utilizado sería
          de <strong>{amountLabel(record.proposal.credit - used)}</strong>.
        </p>
      )}
    </Card>
  );
}
