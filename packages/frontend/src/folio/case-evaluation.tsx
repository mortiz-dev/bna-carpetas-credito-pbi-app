import {
  Building2,
  ChartNoAxesColumn,
  ChevronRight,
  Landmark,
} from 'lucide-react';
import { type ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { OUTCOME_LABELS } from '@rayfin-app/shared';
import { AREA_LABELS, STAGES, demoToday, type CreditCase } from './cases';
import type { EvidenceTab } from './CaseDetail';
import {
  amountLabel,
  captionStyle,
  formatCuitDisplay,
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
          <dd className="text-right font-medium break-words tabular-nums">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function CorporateMilestones({ record }: { record: CreditCase }) {
  const t = record.tracking!;
  const label = (value: string | null) => (value ? shortDate(value) : 'Sin registro');
  return (
    <Card className={sectionStyle}>
      <p className={captionStyle}>Circuito Grandes Empresas</p>
      <h3 className={titleStyle}>{t.subStatus}</h3>
      <CaseFields
        items={[
          ['Fecha ingreso Crédito', label(t.entryDate)],
          ['Fecha envío RC', label(t.riskSentAt)],
          ['Fecha devolución RC', label(t.riskReturnedAt)],
          ['Fecha envío a Legales', label(t.legalSentAt)],
          ['Fecha dictamen legal', label(t.legalOpinionAt)],
          ['Comisión', label(t.committeeAt)],
          ['Instancia', t.instance ?? 'Sin registrar'],
          ['Vencimiento de calificación', label(t.ratingDueAt)],
          ['Resolución', t.resolvedAt ? `${label(t.resolvedAt)}${t.outcome ? ' · ' + OUTCOME_LABELS[t.outcome] : ''}` : 'Sin resolver'],
          ['Observaciones', t.followUpNote || 'Sin observaciones.'],
        ]}
      />
    </Card>
  );
}

function RiskComparison({ record }: { record: CreditCase }) {
  const proposal = record.proposal;
  if (!proposal)
    return (
      <Card className={sectionStyle}>
        <p className={captionStyle}>Evaluación de riesgo</p>
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
  const monthsChanged =
    proposal.cMonths !== null &&
    proposal.zMonths !== null &&
    proposal.cMonths !== proposal.zMonths;
  const guaranteeChanged =
    proposal.cGuarantee !== null &&
    proposal.zGuarantee !== null &&
    proposal.cGuarantee !== proposal.zGuarantee;

  return (
    <Card className={sectionStyle}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className={captionStyle}>Evaluación de riesgo</p>
          <h3 className={titleStyle}>Comparación de propuestas</h3>
        </div>
        <span className="text-xs text-muted-foreground">
          Importes en millones de ARS
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-background p-3.5">
          <p className="text-xs font-medium text-muted-foreground">
            Gerencia Zonal
          </p>
          <p className="mt-1 font-heading text-2xl font-bold tracking-tight tabular-nums">
            {amountLabel(proposal.zonal)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {proposal.zMonths === null
              ? 'Plazo pendiente'
              : `${proposal.zMonths} meses`}{' '}
            · {proposal.zGuarantee ?? 'Garantía pendiente'}
          </p>
        </div>

        <div className="rounded-xl border border-primary/35 bg-accent/70 p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <p className="text-xs font-semibold text-primary">
              Área de Crédito
            </p>
            {delta !== null && delta !== 0 && relative !== null && (
              <span className="rounded-full bg-warning-surface px-2 py-0.5 text-[11px] font-semibold text-warning tabular-nums">
                {delta < 0 ? '−' : '+'}
                {numberLabel(relative)} %
              </span>
            )}
          </div>
          <p className="mt-1 font-heading text-2xl font-bold tracking-tight tabular-nums">
            {amountLabel(proposal.credit)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {proposal.cMonths === null
              ? 'Plazo pendiente'
              : `${proposal.cMonths} meses`}{' '}
            · {proposal.cGuarantee ?? 'Garantía pendiente'}
          </p>
        </div>
      </div>

      <p className="rounded-r-lg border-l-3 border-primary bg-muted/60 px-3.5 py-2.5 text-sm">
        {delta === null ? (
          'Falta la propuesta de Crédito para calcular la diferencia.'
        ) : delta === 0 ? (
          'Las dos áreas proponen el mismo importe.'
        ) : (
          <>
            Crédito propone{' '}
            <strong className="tabular-nums">
              {amountLabel(Math.abs(delta))} {direction}
            </strong>{' '}
            que la Zonal
            {relative !== null && ` (${numberLabel(relative)} % ${direction})`}.
          </>
        )}
      </p>

      <table className="w-full table-fixed text-left text-sm">
        <thead className="text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="py-2">Condición</th>
            <th>Zonal</th>
            <th>Crédito</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border border-t border-border">
          <tr>
            <th scope="row" className="py-2.5 font-medium">
              Plazo
            </th>
            <td className="tabular-nums">
              {proposal.zMonths === null
                ? 'Pendiente'
                : `${proposal.zMonths} meses`}
            </td>
            <td
              className={cn(
                'tabular-nums',
                monthsChanged && 'font-semibold text-warning',
              )}
            >
              {proposal.cMonths === null
                ? 'Pendiente'
                : `${proposal.cMonths} meses`}
            </td>
          </tr>
          <tr>
            <th scope="row" className="py-2.5 font-medium">
              Garantía
            </th>
            <td className="pr-2">{proposal.zGuarantee ?? 'Pendiente'}</td>
            <td className={cn(guaranteeChanged && 'font-semibold text-warning')}>
              {proposal.cGuarantee ?? 'Pendiente'}
            </td>
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
  const t = record.tracking;
  const entry = record.createdOn;
  const approved = t ? t.resolvedAt : closed ? demoOffset(-2) : null;
  const risk = t
    ? t.riskSentAt
    : demo && stage >= 1
      ? demoOffset(closed ? -20 : -8)
      : null;
  const riskBack = t
    ? t.riskReturnedAt
    : demo && stage >= 2
      ? demoOffset(closed ? -16 : -6)
      : null;
  const legal = t
    ? t.legalSentAt
    : demo && stage >= 2
      ? demoOffset(closed ? -14 : -4)
      : null;
  const legalBack = t
    ? t.legalOpinionAt
    : demo && stage >= 3
      ? demoOffset(closed ? -9 : -2)
      : null;
  const commission = t
    ? t.committeeAt
    : demo && stage >= 3
      ? closed
        ? demoOffset(-3)
        : record.dueDate
      : null;
  const instance = t ? t.instance : demo && commission ? 'HD' : null;

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
      note: riskBack
        ? `Calificación de Riesgo recibida el ${shortDate(riskBack)}.`
        : risk
          ? 'Calificación de Riesgo pendiente.'
          : '',
    },
    {
      label: 'Intervención de Legales',
      fields: 'ENVIO L · DICTAMEN',
      day: legal,
      note: legalBack
        ? `Dictamen legal recibido el ${shortDate(legalBack)}.`
        : legal
          ? 'Dictamen legal pendiente.'
          : '',
    },
    {
      label: 'Elevación y comisión',
      fields: 'ELEVACION · COMISION',
      day: commission,
      note: commission
        ? `Elevación${instance ? ` a ${instance}` : ''}. Comisión ` +
          (stage === 4 ? 'realizada.' : 'programada.')
        : instance
          ? `Elevación a ${instance}.`
          : '',
    },
    {
      label: 'Resolución',
      fields: 'RESOLUCION · TERMINADO',
      day: approved,
      note: t
        ? t.outcome
          ? OUTCOME_LABELS[t.outcome] + '.'
          : ''
        : closed
          ? 'Renovación autorizada por HD con revisión en el próximo control.'
          : '',
    },
  ];

  return (
    <>
      <Card className={sectionStyle}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className={captionStyle}>Circuito MiPyMEs</p>
            <h3 className={titleStyle}>Del ingreso a la resolución</h3>
          </div>
          {demo && (
            <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground tabular-nums">
              {closed ? '22 días hasta resolución' : '11 días en circuito'}
            </span>
          )}
        </div>
        <ol className="space-y-0">
          {steps.map(({ label, fields, day, note }, i) => {
            const isCurrent = i === stage;
            return (
              <li
                key={label}
                className="grid grid-cols-[4.75rem_1rem_1fr] gap-2 text-sm"
              >
                <span className="pt-0.5 text-xs font-medium text-muted-foreground tabular-nums">
                  {day ? shortDate(day) : 'Sin registro'}
                </span>
                <span aria-hidden="true" className="relative flex justify-center">
                  {i + 1 < steps.length && (
                    <span className="absolute inset-y-1.5 w-px bg-border" />
                  )}
                  <span
                    className={cn(
                      'relative mt-1 size-2.5 rounded-full border',
                      day
                        ? 'border-primary bg-primary'
                        : 'border-muted-foreground bg-card',
                      isCurrent && 'ring-4 ring-primary/20',
                    )}
                  />
                </span>
                <div className={i + 1 < steps.length ? 'pb-3.5' : ''}>
                  <p
                    className={cn(
                      'font-semibold',
                      isCurrent && 'text-primary',
                    )}
                  >
                    {label}
                    {isCurrent && (
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                        · Etapa actual
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{fields}</p>
                  {note && <p className="mt-0.5 text-xs">{note}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      </Card>

      <details className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <summary className="cursor-pointer text-sm font-semibold text-primary">
          Datos de la planilla MiPyMEs
        </summary>
        <div className="mt-2">
          <CaseFields
            items={[
              ['Cliente', record.name],
              [
                'CUIT',
                record.cuit
                  ? formatCuitDisplay(record.cuit)
                  : demo
                    ? 'Reservado en la muestra'
                    : 'Sin registrar',
              ],
              ['Zonal', demo ? 'Centro' : t?.zonal || 'Sin registrar'],
              [
                'Equipo',
                demo ? 'Crédito MiPyMEs' : t?.responsible || 'Sin registrar',
              ],
              ['Segmento', record.segment],
              [
                'Instancia',
                instance ?? (demo ? 'En análisis' : 'Sin registrar'),
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
                  : t?.subStatus || STAGES[stage],
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
                t
                  ? t.followUpNote || 'Sin observaciones.'
                  : closed
                    ? 'Se recibió documentación complementaria antes de la comisión.'
                    : 'Sin observaciones.',
              ],
            ]}
          />
        </div>
      </details>
    </>
  );
}

type NavigationProps = { record: CreditCase; go: (tab: EvidenceTab) => void };

export function SourceButtons({ record, go }: NavigationProps) {
  const hasPower =
    record.source === 'demo' &&
    record.limit !== null &&
    record.used !== null &&
    record.limit > 0;
  const pct = hasPower ? (record.used! / record.limit!) * 100 : null;
  const powerDetail =
    pct !== null
      ? `${numberLabel(pct)} % utilizado · ${amountLabel(record.used)} / ${amountLabel(record.limit)}`
      : 'Sin modelo semántico vinculado';
  const bcraDetail =
    record.source === 'demo'
      ? `${record.holders} ${record.holders === 1 ? 'titular' : 'titulares'}${record.holders > 1 ? ' · 1 pendiente' : ' · consultado'}`
      : record.cuit
        ? `CUIT ${formatCuitDisplay(record.cuit)} · listo para consultar`
        : 'Consultar deuda y cheques por CUIT';

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <button
        type="button"
        aria-label="Abrir fuente: Power BI"
        onClick={() => go('power-bi')}
        className="flex w-full flex-col gap-2 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/50 hover:bg-accent/50"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <ChartNoAxesColumn className="size-4" aria-hidden="true" />
            Power BI
          </span>
          <ChevronRight
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
        </div>
        <p className="text-sm font-semibold text-foreground">
          Exposición interna
        </p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {powerDetail}
        </p>
        {pct !== null && (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                'h-full rounded-full',
                pct >= 75 ? 'bg-warning' : 'bg-primary',
              )}
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
        )}
      </button>

      <button
        type="button"
        aria-label="Abrir fuente: BCRA"
        onClick={() => go('bcra')}
        className="flex w-full flex-col gap-2 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/50 hover:bg-accent/50"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <Landmark className="size-4" aria-hidden="true" />
            BCRA
          </span>
          <ChevronRight
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
        </div>
        <p className="text-sm font-semibold text-foreground">
          Central de Deudores
        </p>
        <p className="text-xs text-muted-foreground">{bcraDetail}</p>
      </button>
    </div>
  );
}

export function CaseEvaluation({ record, go }: NavigationProps) {
  return (
    <div className="min-w-0 space-y-4">
      {record.area === 'ge' ? (
        <>
          <RiskComparison record={record} />
          {record.tracking && <CorporateMilestones record={record} />}
        </>
      ) : (
        <SmeWorkflow record={record} />
      )}

      <SourceButtons record={record} go={go} />

      <Card className={sectionStyle}>
        <div className="flex items-center gap-2">
          <Building2 className="size-4 text-primary" aria-hidden="true" />
          <h3 className="font-heading text-base font-semibold">
            Seguimiento del área
          </h3>
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
            ...(record.tracking
              ? ([
                  ['Estado en el área', record.tracking.subStatus],
                  ['Zonal · Sucursal', [record.tracking.zonal, record.tracking.branch].filter(Boolean).join(' · ') || 'Sin registrar'],
                  ['Creada por', record.tracking.createdBy || 'Sin registrar'],
                  [
                    'Última actualización',
                    record.tracking.updatedTime
                      ? `${record.tracking.updatedTime} · ${record.tracking.updatedBy}`
                      : 'Sin cambios desde el alta',
                  ],
                ] as Array<[string, ReactNode]>)
              : []),
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
  );
}

export function CasePower({ record }: { record: CreditCase }) {
  const { limit, used } = record;
  if (record.source !== 'demo' || limit === null || used === null)
    return (
      <Card className={sectionStyle}>
        <p className={captionStyle}>Power BI</p>
        <h3 className={titleStyle}>Exposición interna</h3>
        <p className="text-sm text-muted-foreground">
          Falta vincular el modelo semántico de Power BI para consultar la
          exposición de esta carpeta. Al conectarlo aparecerán límite vigente,
          saldo utilizado, disponible y margen proyectado.
        </p>
      </Card>
    );

  const pct = limit > 0 ? (used / limit) * 100 : null;
  const available = limit - used;

  return (
    <Card className={sectionStyle}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className={captionStyle}>Power BI · Datos de muestra</p>
          <h3 className={titleStyle}>Exposición interna</h3>
        </div>
        <span className="text-xs text-muted-foreground">
          Corte al 31 oct 2026 · millones de ARS
        </span>
      </div>

      {pct !== null && (
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-foreground tabular-nums">
              Utilizado: {amountLabel(used)} ({numberLabel(pct)} %)
            </span>
            <span className="text-muted-foreground tabular-nums">
              Disponible: {amountLabel(available)}
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                pct >= 75 ? 'bg-warning' : 'bg-primary',
              )}
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Límite vigente', amountLabel(limit)],
          ['Saldo utilizado', amountLabel(used)],
          ['Disponible', amountLabel(available)],
          [
            'Utilización',
            pct === null ? 'Sin límite vigente' : `${numberLabel(pct)} %`,
          ],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-border bg-background p-3"
          >
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 font-heading text-lg font-bold tracking-tight tabular-nums">
              {value}
            </p>
          </div>
        ))}
      </div>

      {record.proposal?.credit != null && (
        <p className="rounded-xl border border-primary/25 bg-accent p-3.5 text-sm">
          Con la propuesta de Crédito (
          <strong className="tabular-nums">
            {amountLabel(record.proposal.credit)}
          </strong>
          ), el margen sobre el saldo utilizado sería de{' '}
          <strong className="tabular-nums">
            {amountLabel(record.proposal.credit - used)}
          </strong>
          .
        </p>
      )}
    </Card>
  );
}
