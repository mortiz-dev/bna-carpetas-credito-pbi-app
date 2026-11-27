import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FolderOpen,
  Kanban,
  List,
  Search,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { STAGES, type CreditCase, type Stage } from './cases';
import {
  amountLabel,
  initialsFor,
  numberLabel,
  urgencyInfo,
} from './case-format';

export type ViewMode = 'table' | 'pipeline';

function normalize(s: string) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

const PAGE_SIZE = 12;

export function Inbox({
  records,
  today,
  stageFilter,
  onStageFilter,
  onlyWeek,
  onToggleWeek,
  week,
  viewMode,
  onViewMode,
  onOpen,
  demo,
}: {
  records: CreditCase[];
  today: string;
  stageFilter: Stage | 'all';
  onStageFilter: (next: Stage | 'all') => void;
  onlyWeek: boolean;
  onToggleWeek: () => void;
  week: CreditCase[];
  viewMode: ViewMode;
  onViewMode: (mode: ViewMode) => void;
  onOpen: (c: CreditCase, queue: CreditCase[]) => void;
  demo: boolean;
}) {
  const [query, setQuery] = useState('');
  const [segment, setSegment] = useState('');
  const [mine, setMine] = useState(false);
  const [page, setPage] = useState(0);

  const weekIds = new Set(week.map((w) => w.id));

  const result = records.filter((r) => {
    if (mine && demo && r.owner !== 'Ana Luna') return false;
    if (stageFilter !== 'all' && r.stage !== stageFilter) return false;
    if (onlyWeek && !weekIds.has(r.id)) return false;
    if (segment && r.segment !== segment) return false;
    if (query.trim()) {
      const haystack = normalize(
        `${r.name} ${r.code} ${r.cuit ?? ''} ${r.owner}`,
      );
      if (!haystack.includes(normalize(query.trim()))) return false;
    }
    return true;
  });

  const hasActiveFilters =
    stageFilter !== 'all' ||
    onlyWeek ||
    mine ||
    Boolean(segment) ||
    Boolean(query.trim());

  function clearAll() {
    onStageFilter('all');
    if (onlyWeek) onToggleWeek();
    setMine(false);
    setSegment('');
    setQuery('');
    setPage(0);
  }

  const max = Math.max(0, Math.ceil(result.length / PAGE_SIZE) - 1);
  const current = Math.min(page, max);
  const first = current * PAGE_SIZE;
  const visible = result.slice(first, first + PAGE_SIZE);

  return (
    <div className="min-w-0 space-y-3">
      {/* Unified Filter & View Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <label className="relative min-w-52 flex-1 sm:max-w-xs">
            <Search
              className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              placeholder="Buscar empresa, código o CUIT…"
              aria-label="Buscar empresa o carpeta"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              className="bg-card pl-9"
            />
          </label>

          <select
            aria-label="Filtrar por segmento"
            className="folio-select"
            value={segment}
            onChange={(e) => {
              setSegment(e.target.value);
              setPage(0);
            }}
          >
            <option value="">Todos los segmentos</option>
            {['MiPyME', 'Gran empresa', 'Cooperativa'].map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>

          <Button
            size="sm"
            variant={onlyWeek ? 'secondary' : 'outline'}
            aria-pressed={onlyWeek}
            onClick={() => {
              onToggleWeek();
              setPage(0);
            }}
            className={cn(
              onlyWeek &&
                'border border-warning/40 bg-warning-surface text-warning hover:bg-warning-surface/80',
            )}
          >
            <Clock3 className="size-3.5" aria-hidden="true" />
            Vencen en 7 días ({week.length})
          </Button>

          {demo && (
            <Button
              size="sm"
              variant={mine ? 'secondary' : 'outline'}
              aria-pressed={mine}
              onClick={() => {
                setMine((prev) => !prev);
                setPage(0);
              }}
            >
              Mis asignadas
            </Button>
          )}

          {hasActiveFilters && (
            <Button size="sm" variant="ghost" onClick={clearAll}>
              <X className="size-3.5" aria-hidden="true" />
              Limpiar
            </Button>
          )}
        </div>

        <div
          className="inline-flex rounded-lg border border-border bg-card p-0.5"
          role="group"
          aria-label="Modo de vista de la bandeja"
        >
          <button
            type="button"
            aria-pressed={viewMode === 'table'}
            onClick={() => onViewMode('table')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors',
              viewMode === 'table'
                ? 'bg-secondary text-secondary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <List className="size-3.5" aria-hidden="true" />
            Lista
          </button>
          <button
            type="button"
            aria-pressed={viewMode === 'pipeline'}
            onClick={() => onViewMode('pipeline')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors',
              viewMode === 'pipeline'
                ? 'bg-secondary text-secondary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Kanban className="size-3.5" aria-hidden="true" />
            Pipeline
          </button>
        </div>
      </div>

      {/* Mode 1: Enriched Table View */}
      {viewMode === 'table' ? (
        <Card className="gap-0 overflow-hidden rounded-2xl border border-border bg-card py-0 shadow-none">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/60 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="py-2.5 pr-3 pl-4 sm:pl-5">
                    Empresa / carpeta
                  </th>
                  <th className="px-3 py-2.5">Etapa</th>
                  <th className="hidden px-3 py-2.5 sm:table-cell">
                    Exposición
                  </th>
                  <th className="px-3 py-2.5">Próximo hito</th>
                  <th className="hidden px-3 py-2.5 md:table-cell">Señales</th>
                  <th className="py-2.5 pr-4 pl-3 text-right">Analista</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visible.map((r, i) => {
                  const hasExposure =
                    r.source === 'demo' &&
                    r.limit !== null &&
                    r.used !== null &&
                    r.limit > 0;
                  const pct = hasExposure ? (r.used! / r.limit!) * 100 : null;
                  const urgency = urgencyInfo(r.dueDate, today);
                  const hasPendingCoHolder = r.source === 'demo' && r.holders > 1;
                  const hasBcraSit2 =
                    r.source === 'demo' && r.code === 'CR-26087';

                  return (
                    <tr
                      key={r.id}
                      onClick={() => onOpen(r, result)}
                      className="cursor-pointer transition-colors hover:bg-accent/60"
                    >
                      <td className="py-3 pr-3 pl-4 sm:pl-5">
                        <button
                          type="button"
                          className="flex items-center gap-3 text-left"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpen(r, result);
                          }}
                        >
                          <span
                            className={'folio-initial i' + (i % 4)}
                            aria-hidden="true"
                          >
                            {initialsFor(r.name)}
                          </span>
                          <span className="min-w-0">
                            <span className="block font-semibold text-foreground">
                              {r.name}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {r.code} · {r.segment}
                            </span>
                          </span>
                        </button>
                      </td>

                      <td className="px-3 py-3">
                        <span className={'folio-status s' + r.stage}>
                          {STAGES[r.stage]}
                        </span>
                      </td>

                      <td className="hidden px-3 py-3 sm:table-cell">
                        {pct !== null ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                                <div
                                  className={cn(
                                    'h-full rounded-full',
                                    pct >= 75 ? 'bg-warning' : 'bg-primary',
                                  )}
                                  style={{ width: `${Math.min(100, pct)}%` }}
                                />
                              </div>
                              <span className="text-xs font-semibold tabular-nums">
                                {numberLabel(pct)} %
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground tabular-nums">
                              {amountLabel(r.used)} / {amountLabel(r.limit)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Sin vincular
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-3 whitespace-nowrap">
                        {r.dueDate ? (
                          <div>
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 rounded-md text-xs font-semibold tabular-nums',
                                urgency.tone === 'danger' &&
                                  'bg-danger-surface px-2 py-0.5 text-danger',
                                urgency.tone === 'warning' &&
                                  'bg-warning-surface px-2 py-0.5 text-warning',
                                urgency.tone === 'normal' && 'text-foreground',
                              )}
                            >
                              {urgency.label}
                              {urgency.relative && (
                                <span className="font-medium opacity-85">
                                  · {urgency.relative}
                                </span>
                              )}
                            </span>
                            {r.event && (
                              <span className="mt-0.5 block max-w-44 truncate text-xs text-muted-foreground">
                                {r.event}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Sin hito
                          </span>
                        )}
                      </td>

                      <td className="hidden px-3 py-3 md:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {hasBcraSit2 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-warning-surface px-2 py-0.5 text-[11px] font-semibold text-warning">
                              <AlertTriangle className="size-3" aria-hidden="true" />
                              BCRA Sit. 2
                            </span>
                          )}
                          {hasPendingCoHolder && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-warning-surface px-2 py-0.5 text-[11px] font-semibold text-warning">
                              Cotitular pend.
                            </span>
                          )}
                          {r.opinion ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-success-surface px-2 py-0.5 text-[11px] font-semibold text-success">
                              <CheckCircle2 className="size-3" aria-hidden="true" />
                              Dictamen
                            </span>
                          ) : (
                            !hasBcraSit2 &&
                            !hasPendingCoHolder && (
                              <span className="text-xs text-muted-foreground">
                                Pendiente
                              </span>
                            )
                          )}
                        </div>
                      </td>

                      <td className="py-3 pr-4 pl-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <span
                            title={r.owner}
                            className="inline-grid size-7 place-items-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground"
                          >
                            {initialsFor(r.owner)}
                          </span>
                          <ChevronRight
                            className="size-4 text-muted-foreground"
                            aria-hidden="true"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!result.length && (
            <div className="p-10 text-center text-sm text-muted-foreground">
              <FolderOpen className="mx-auto mb-2 size-6 opacity-70" />
              {records.length
                ? 'Ninguna carpeta coincide con estos filtros.'
                : 'Todavía no hay carpetas guardadas en esta vista.'}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground sm:px-5">
            <span className="tabular-nums">
              {result.length
                ? `${first + 1}–${Math.min(first + PAGE_SIZE, result.length)} de ${result.length}`
                : 0}{' '}
              carpetas
            </span>
            {max > 0 && (
              <div className="flex items-center gap-1">
                <Button
                  size="icon-xs"
                  variant="outline"
                  aria-label="Página anterior"
                  disabled={!current}
                  onClick={() => setPage(current - 1)}
                >
                  <ChevronLeft />
                </Button>
                <Button
                  size="icon-xs"
                  variant="outline"
                  aria-label="Página siguiente"
                  disabled={current >= max}
                  onClick={() => setPage(current + 1)}
                >
                  <ChevronRight />
                </Button>
              </div>
            )}
          </div>
        </Card>
      ) : (
        /* Mode 2: 5-Stage Pipeline Board View */
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {STAGES.map((stageName, stageIdx) => {
            const items = result.filter((r) => r.stage === stageIdx);
            return (
              <div
                key={stageName}
                className="flex min-w-0 flex-col gap-2.5 rounded-2xl border border-border bg-card p-3"
              >
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className={'folio-status s' + stageIdx}>
                    {stageName}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground tabular-nums">
                    {items.length}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {items.length ? (
                    items.map((r) => {
                      const hasExposure =
                        r.source === 'demo' &&
                        r.limit !== null &&
                        r.used !== null &&
                        r.limit > 0;
                      const pct = hasExposure
                        ? (r.used! / r.limit!) * 100
                        : null;
                      const urgency = urgencyInfo(r.dueDate, today);

                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => onOpen(r, result)}
                          className="w-full space-y-2 rounded-xl border border-border bg-background p-3 text-left transition-colors hover:border-primary/50 hover:bg-accent/40"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs leading-snug font-bold text-foreground">
                              {r.name}
                            </span>
                            <span
                              title={r.owner}
                              className="shrink-0 rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-secondary-foreground"
                            >
                              {initialsFor(r.owner)}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {r.code} · {r.segment}
                          </p>
                          {pct !== null && (
                            <div className="space-y-1">
                              <div className="flex justify-between text-[11px] text-muted-foreground tabular-nums">
                                <span>{amountLabel(r.limit)}</span>
                                <span className="font-semibold text-foreground">
                                  {numberLabel(pct)} %
                                </span>
                              </div>
                              <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                                <div
                                  className={cn(
                                    'h-full rounded-full',
                                    pct >= 75 ? 'bg-warning' : 'bg-primary',
                                  )}
                                  style={{ width: `${Math.min(100, pct)}%` }}
                                />
                              </div>
                            </div>
                          )}
                          <div className="flex flex-wrap items-center justify-between gap-1 pt-0.5">
                            {r.dueDate ? (
                              <span
                                className={cn(
                                  'rounded px-1.5 py-0.5 text-[11px] font-semibold tabular-nums',
                                  urgency.tone === 'danger' &&
                                    'bg-danger-surface text-danger',
                                  urgency.tone === 'warning' &&
                                    'bg-warning-surface text-warning',
                                  urgency.tone === 'normal' &&
                                    'text-muted-foreground',
                                )}
                              >
                                {urgency.label}
                                {urgency.relative
                                  ? ` · ${urgency.relative}`
                                  : ''}
                              </span>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">
                                Cerrada
                              </span>
                            )}
                            {r.opinion && (
                              <CheckCircle2
                                className="size-3.5 text-success"
                                aria-label="Dictamen registrado"
                              />
                            )}
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <p className="py-6 text-center text-xs text-muted-foreground">
                      Sin carpetas
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
