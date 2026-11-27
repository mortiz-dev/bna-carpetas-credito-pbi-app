import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { numberLabel, sectionStyle, situationTone, titleStyle } from './case-format';

export interface BcraEntityRow {
  name: string;
  amount: number;
  situation: number;
  daysLate: number | null;
  review?: boolean;
  court?: boolean;
}

export function SituationBadge({ situation }: { situation: number }) {
  const tone = situationTone(situation);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
        tone === 'success' && 'bg-success-surface text-success',
        tone === 'warning' && 'bg-warning-surface text-warning',
        tone === 'danger' && 'bg-danger-surface text-danger',
      )}
    >
      {tone === 'success' ? (
        <CheckCircle2 className="size-3" aria-hidden="true" />
      ) : tone === 'warning' ? (
        <AlertTriangle className="size-3" aria-hidden="true" />
      ) : (
        <ShieldAlert className="size-3" aria-hidden="true" />
      )}
      Sit. {situation}
    </span>
  );
}

export function BcraKpiStrip({
  totalDebt,
  entityCount,
  maxSituation,
  chequesCount,
  chequesSubtitle,
}: {
  totalDebt: number | null;
  entityCount: number;
  maxSituation: number | null;
  chequesCount: number | null;
  chequesSubtitle: string;
}) {
  const sitTone = maxSituation !== null ? situationTone(maxSituation) : null;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Card className="min-w-0 gap-1 rounded-xl border border-border bg-card p-4 shadow-none">
        <p className="text-xs font-medium text-muted-foreground">
          Deuda informada
        </p>
        <p className="font-heading text-2xl font-bold tracking-tight text-foreground tabular-nums">
          {totalDebt === null ? '—' : numberLabel(totalDebt)}
        </p>
        <p className="text-xs text-muted-foreground">
          {totalDebt === null
            ? 'Sin registros'
            : `miles de ARS · ${entityCount} ${entityCount === 1 ? 'entidad' : 'entidades'}`}
        </p>
      </Card>

      <Card
        className={cn(
          'min-w-0 gap-1 rounded-xl border bg-card p-4 shadow-none',
          sitTone === 'warning' && 'border-warning/40',
          sitTone === 'danger' && 'border-danger/40',
          (!sitTone || sitTone === 'success') && 'border-border',
        )}
      >
        <p className="text-xs font-medium text-muted-foreground">
          Mayor situación
        </p>
        <div className="flex items-baseline gap-2">
          <p
            className={cn(
              'font-heading text-2xl font-bold tracking-tight tabular-nums',
              sitTone === 'success' && 'text-success',
              sitTone === 'warning' && 'text-warning',
              sitTone === 'danger' && 'text-danger',
              !sitTone && 'text-foreground',
            )}
          >
            {maxSituation === null ? '—' : `Sit. ${maxSituation}`}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          {maxSituation === null
            ? 'Sin informar'
            : maxSituation <= 1
              ? 'Cumplimiento normal'
              : maxSituation === 2
                ? 'Con seguimiento especial'
                : 'Riesgo elevado / irregular'}
        </p>
      </Card>

      <Card
        className={cn(
          'min-w-0 gap-1 rounded-xl border bg-card p-4 shadow-none',
          chequesCount !== null && chequesCount > 0
            ? 'border-warning/40'
            : 'border-border',
        )}
      >
        <p className="text-xs font-medium text-muted-foreground">
          Cheques rechazados
        </p>
        <p
          className={cn(
            'font-heading text-2xl font-bold tracking-tight tabular-nums',
            chequesCount !== null && chequesCount > 0
              ? 'text-warning'
              : 'text-foreground',
          )}
        >
          {chequesCount === null ? '—' : chequesCount}
        </p>
        <p className="text-xs text-muted-foreground">{chequesSubtitle}</p>
      </Card>
    </div>
  );
}

export function BcraEntityTable({
  entities,
  title = 'Situación por entidad',
}: {
  entities: BcraEntityRow[];
  title?: string;
}) {
  const sorted = [...entities].sort((a, b) => b.amount - a.amount);
  const total = sorted.reduce((sum, e) => sum + e.amount, 0);

  return (
    <Card className={sectionStyle}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className={titleStyle}>{title}</h4>
        <span className="text-xs text-muted-foreground tabular-nums">
          {sorted.length} {sorted.length === 1 ? 'entidad' : 'entidades'}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-xs">
          <thead>
            <tr className="border-b border-border text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="py-2 pr-3">Entidad</th>
              <th className="px-2 py-2 text-right">Miles ARS</th>
              <th className="px-2 py-2">Participación</th>
              <th className="px-2 py-2">Situación</th>
              <th className="px-2 py-2">Atraso</th>
              <th className="py-2 pl-2">Observaciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map((entity, idx) => {
              const share = total > 0 ? (entity.amount / total) * 100 : 0;
              const tone = situationTone(entity.situation);
              const marks = [
                entity.review && 'En revisión',
                entity.court && 'Proceso judicial',
              ]
                .filter(Boolean)
                .join(' · ');
              return (
                <tr key={`${entity.name}-${idx}`} className="align-middle">
                  <td className="py-2.5 pr-3 font-medium text-foreground">
                    {entity.name}
                  </td>
                  <td className="px-2 py-2.5 text-right font-semibold tabular-nums">
                    {numberLabel(entity.amount)}
                  </td>
                  <td className="px-2 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            tone === 'success' && 'bg-primary',
                            tone === 'warning' && 'bg-warning',
                            tone === 'danger' && 'bg-danger',
                          )}
                          style={{ width: `${Math.min(100, share)}%` }}
                        />
                      </div>
                      <span className="text-muted-foreground tabular-nums">
                        {numberLabel(share)} %
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-2.5">
                    <SituationBadge situation={entity.situation} />
                  </td>
                  <td className="px-2 py-2.5 text-muted-foreground tabular-nums">
                    {entity.daysLate === null
                      ? 'Sin dato'
                      : entity.daysLate === 0
                        ? 'No aplicable'
                        : `${entity.daysLate} días`}
                  </td>
                  <td className="py-2.5 pl-2 text-muted-foreground">
                    {marks || '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
