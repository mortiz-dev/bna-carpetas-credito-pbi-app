import { useContext, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  Inbox as InboxIcon,
  Layers3,
  Moon,
  Plus,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AuthContext } from '@/hooks/auth.context';
import { useTheme } from '@/hooks/theme.context';
import { cn } from '@/lib/utils';
import { CaseDetail } from '@/folio/CaseDetail';
import {
  captionStyle,
  dueLabel,
  sectionStyle,
  titleStyle,
  urgencyInfo,
} from '@/folio/case-format';
import { Inbox, type ViewMode } from '@/folio/Inbox';
import { NewCaseDialog } from '@/folio/NewCaseDialog';
import { PortfolioQueries } from '@/folio/PortfolioQueries';
import {
  AREA_LABELS,
  STAGES,
  demoToday,
  sampleCases,
  type Area,
  type CreditCase,
  type NewCaseInput,
  type OpinionInput,
  type Stage,
} from '@/folio/cases';
import {
  caseErrorMessage,
  createCase,
  listCases,
  saveOpinion,
} from '@/folio/case-store';

const sections = [
  { id: 'Bandeja', label: 'Mesa de crédito', icon: InboxIcon },
  { id: 'Agenda', label: 'Agenda', icon: CalendarDays },
  { id: 'Consultas IA', label: 'Consultas IA', icon: Sparkles },
] as const;
type Section = (typeof sections)[number]['id'];
type Source = 'demo' | 'saved';
type DataState = {
  phase: 'idle' | 'loading' | 'ready' | 'error';
  rows: CreditCase[];
  message?: string;
};

function AgendaList({
  events,
  today,
  onOpen,
}: {
  events: CreditCase[];
  today: string;
  onOpen: (r: CreditCase, queue: CreditCase[]) => void;
}) {
  if (!events.length) {
    return (
      <p className="py-4 text-sm text-muted-foreground">
        Sin hitos programados para esta selección.
      </p>
    );
  }
  return (
    <div className="divide-y divide-border">
      {events.map((r) => {
        const urgency = urgencyInfo(r.dueDate, today);
        return (
          <button
            type="button"
            key={r.id}
            onClick={() => onOpen(r, events)}
            className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-accent/50"
          >
            <span
              className={cn(
                'grid size-11 shrink-0 place-content-center justify-items-center rounded-xl border leading-tight',
                urgency.tone === 'danger' &&
                  'border-danger/35 bg-danger-surface text-danger',
                urgency.tone === 'warning' &&
                  'border-warning/35 bg-warning-surface text-warning',
                urgency.tone === 'normal' &&
                  'border-border bg-background text-foreground',
              )}
            >
              <small className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                {dueLabel(r.dueDate!, { month: 'short' })}
              </small>
              <b className="text-base font-bold tabular-nums">
                {dueLabel(r.dueDate!, { day: 'numeric' })}
              </b>
            </span>
            <span className="min-w-0 flex-1">
              <strong className="block truncate text-sm font-semibold text-foreground">
                {r.name}
              </strong>
              <small className="block truncate text-xs text-muted-foreground">
                {r.event}
                {urgency.relative ? ` · ${urgency.relative}` : ''}
              </small>
            </span>
            <ChevronRight
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
          </button>
        );
      })}
    </div>
  );
}

function readCaseLink(): { id: string | null; source: Source; section: string } {
  const [id, section = ''] = location.hash.slice(1).split('/');
  // Fabric generates UUIDs for CreditFile, while sample links use their CR codes.
  const saved = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id);
  return {
    id: saved || sampleCases.some((r) => r.id === id) ? id : null,
    source: saved ? 'saved' : 'demo',
    section,
  };
}

function updateHash(caseId: string | null) {
  try {
    const next = caseId ? `#${caseId}` : window.location.pathname + window.location.search;
    window.history.replaceState(null, '', next);
  } catch {
    // Ignore history API restrictions in embedded sandboxes.
  }
}

function App() {
  const { isDark, toggleTheme } = useTheme();
  const auth = useContext(AuthContext);
  const [link] = useState(readCaseLink);
  const [source, setSource] = useState<Source>(link.source);
  const [demo, setDemo] = useState(sampleCases);
  const [saved, setSaved] = useState<DataState>({
    phase: link.source === 'saved' ? 'loading' : 'idle',
    rows: [],
  });
  const [view, setView] = useState<Section>('Bandeja');
  const [area, setArea] = useState<Area | 'all'>('all');
  const [stageFilter, setStageFilter] = useState<Stage | 'all'>('all');
  const [onlyWeek, setOnlyWeek] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [caseId, setCaseId] = useState(link.id);
  const [activeQueueIds, setActiveQueueIds] = useState<string[] | null>(null);
  const [linkedSection, setLinkedSection] = useState(link.section);
  const [createOpen, setCreateOpen] = useState(false);
  const listVersion = useRef(0);
  const lastTrigger = useRef<HTMLElement | null>(null);
  const [notice, setNotice] = useState('');

  const modeDemo = source === 'demo';
  const ready = modeDemo || saved.phase === 'ready';
  const records = modeDemo ? demo : saved.rows;
  const inArea = records.filter((r) => area === 'all' || r.area === area);
  const selected = records.find((r) => r.id === caseId) ?? null;

  const today = modeDemo
    ? demoToday
    : new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Argentina/Buenos_Aires',
      }).format(new Date());

  const upcoming = inArea
    .filter((r) => r.dueDate && r.dueDate >= today)
    .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!));
  const overdue = inArea
    .filter((r) => r.dueDate && r.dueDate < today && r.stage !== 4)
    .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!));
  const through = new Date(Date.parse(today + 'T12:00:00Z') + 7 * 86400000)
    .toISOString()
    .slice(0, 10);
  const week = upcoming.filter((r) => r.dueDate! <= through);
  const later = upcoming.filter((r) => r.dueDate! > through);

  const stageCounts = STAGES.map(
    (_, idx) => inArea.filter((r) => r.stage === idx).length,
  );

  const activeQueue = activeQueueIds
    ? activeQueueIds
        .map((id) => records.find((r) => r.id === id))
        .filter((r): r is CreditCase => Boolean(r))
    : inArea;

  useEffect(() => {
    if (source !== 'saved' || saved.phase !== 'loading') return;
    const version = ++listVersion.current;
    let cancelled = false;
    async function load() {
      try {
        const rows = await listCases();
        if (cancelled || version !== listVersion.current) return;
        setSaved({ phase: 'ready', rows });
        if (caseId && !rows.some((row) => row.id === caseId)) {
          setNotice('La carpeta del enlace no está disponible en tu bandeja.');
          setCaseId(null);
          updateHash(null);
        }
      } catch (error) {
        if (cancelled || version !== listVersion.current) return;
        setSaved({ phase: 'error', rows: [], message: caseErrorMessage(error) });
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [source, saved.phase, caseId]);

  function switchSource(next: Source) {
    if (next === source) {
      if (saved.phase === 'error' && next === 'saved')
        setSaved({ phase: 'loading', rows: [] });
      return;
    }
    setSource(next);
    setCaseId(null);
    setActiveQueueIds(null);
    setStageFilter('all');
    setOnlyWeek(false);
    setNotice('');
    updateHash(null);
    if (next === 'saved') setSaved({ phase: 'loading', rows: [] });
  }

  function openRecord(record: CreditCase, queue?: CreditCase[]) {
    lastTrigger.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setLinkedSection('');
    setCaseId(record.id);
    if (queue) setActiveQueueIds(queue.map((item) => item.id));
    updateHash(record.id);
  }

  function navigateRecord(record: CreditCase) {
    setLinkedSection('');
    setCaseId(record.id);
    updateHash(record.id);
  }

  function closeRecord() {
    setCaseId(null);
    setLinkedSection('');
    updateHash(null);
    requestAnimationFrame(
      () => lastTrigger.current?.isConnected && lastTrigger.current.focus(),
    );
  }

  async function create(input: NewCaseInput) {
    const row = await createCase(input);
    const switchedFromDemo = source === 'demo';
    setSource('saved');
    setArea('all');
    setView('Bandeja');
    setStageFilter('all');
    setOnlyWeek(false);
    setCreateOpen(false);
    const version = ++listVersion.current;
    setSaved({ phase: 'ready', rows: [row] });
    setCaseId(row.id);
    setActiveQueueIds([row.id]);
    updateHash(row.id);
    setNotice(
      switchedFromDemo
        ? 'Carpeta guardada en Mis carpetas · Fabric. Cambiamos la vista a tus carpetas reales.'
        : 'Carpeta guardada en Fabric.',
    );
    try {
      const rows = await listCases();
      if (listVersion.current === version) {
        const merged = rows.some((r) => r.id === row.id) ? rows : [row, ...rows];
        setSaved({ phase: 'ready', rows: merged });
        setActiveQueueIds(merged.map((r) => r.id));
      }
    } catch {
      if (listVersion.current === version)
        setNotice(
          'La carpeta quedó guardada. Volvé a cargar Mis carpetas para actualizar el resto de la bandeja.',
        );
    }
  }

  async function sign(record: CreditCase, input: OpinionInput) {
    if (record.source === 'demo') {
      const opinion = {
        ...input,
        author: 'Analista de muestra',
        time: new Intl.DateTimeFormat('es-AR', {
          dateStyle: 'short',
          timeStyle: 'short',
          timeZone: 'America/Argentina/Buenos_Aires',
        }).format(new Date()),
      };
      setDemo((rows) =>
        rows.map((r) => (r.id === record.id ? { ...r, opinion } : r)),
      );
      return;
    }
    const updated = await saveOpinion(record.id, input);
    setSaved((previous) => ({
      ...previous,
      rows: previous.rows.map((r) => (r.id === record.id ? updated : r)),
    }));
  }

  const email = auth?.session?.user?.email;
  const initial = email?.trim().slice(0, 2).toUpperCase() || 'FL';

  return (
    <div className="min-h-full bg-background text-foreground">
      <a
        href="#workspace"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        Ir al contenido
      </a>

      {/* Compact Sticky Top Bar (56px) */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 sm:gap-6">
            <button
              type="button"
              onClick={() => {
                closeRecord();
                setView('Bandeja');
              }}
              aria-label="Folio · Ir a Mesa de crédito"
              className="flex items-center gap-2 font-heading text-xl font-bold tracking-tight text-foreground"
            >
              <Layers3
                className="size-6 text-primary"
                strokeWidth={2.6}
                aria-hidden="true"
              />
              <span>Folio</span>
            </button>

            <nav
              aria-label="Navegación principal"
              className="hidden h-14 items-stretch gap-1 md:flex"
            >
              {sections.map(({ id, label, icon: Icon }) => {
                const active = !selected && view === id;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-current={active ? 'page' : undefined}
                    onClick={() => {
                      if (caseId) closeRecord();
                      setView(id);
                    }}
                    className={cn(
                      'inline-flex items-center gap-1.5 border-b-2 px-3 text-sm font-medium transition-colors',
                      active
                        ? 'border-primary font-semibold text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    {label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {/* Explicit Source Segmented Switcher */}
            <div
              role="group"
              aria-label="Origen de las carpetas"
              className="inline-flex items-center rounded-full border border-border bg-background p-0.5 text-xs"
            >
              <button
                type="button"
                aria-pressed={source === 'demo'}
                onClick={() => switchSource('demo')}
                className={cn(
                  'rounded-full px-2.5 py-1 font-semibold transition-colors',
                  source === 'demo'
                    ? 'bg-warning-surface text-warning'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Datos de muestra
              </button>
              <button
                type="button"
                aria-pressed={source === 'saved'}
                onClick={() => switchSource('saved')}
                className={cn(
                  'rounded-full px-2.5 py-1 font-semibold transition-colors',
                  source === 'saved'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Mis carpetas · Fabric
              </button>
            </div>

            <Button
              aria-label={isDark ? 'Usar tema claro' : 'Usar tema oscuro'}
              className="rounded-full"
              size="icon-sm"
              variant="outline"
              onClick={toggleTheme}
            >
              {isDark ? <Sun /> : <Moon />}
            </Button>

            <span
              title={email || 'Sesión Fabric'}
              className="hidden size-8 place-items-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground sm:grid"
            >
              {initial}
            </span>
          </div>
        </div>

        {/* Mobile navigation strip */}
        <nav
          aria-label="Navegación móvil"
          className="flex border-t border-border bg-card px-2 md:hidden"
        >
          {sections.map(({ id, label, icon: Icon }) => {
            const active = !selected && view === id;
            return (
              <button
                key={id}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => {
                  if (caseId) closeRecord();
                  setView(id);
                }}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 border-b-2 py-2 text-xs font-medium',
                  active
                    ? 'border-primary font-semibold text-primary'
                    : 'border-transparent text-muted-foreground',
                )}
              >
                <Icon className="size-3.5" aria-hidden="true" />
                {label}
              </button>
            );
          })}
        </nav>
      </header>

      {/* Explicit Demo Mode Notice Bar */}
      {modeDemo && !selected && (
        <div className="border-b border-border bg-accent/60">
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-2 px-4 py-1.5 text-xs sm:px-6 lg:px-8">
            <span className="text-foreground">
              <strong className="font-semibold text-warning">
                Modo demostración:
              </strong>{' '}
              estás explorando {demo.length} carpetas de ejemplo con datos
              ficticios.
            </span>
            <button
              type="button"
              onClick={() => switchSource('saved')}
              className="font-semibold text-primary hover:underline"
            >
              Ir a Mis carpetas · Fabric →
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main
        id="workspace"
        tabIndex={-1}
        className="mx-auto max-w-[1440px] px-4 py-5 pb-12 sm:px-6 lg:px-8"
      >
        {notice && (
          <div
            role="status"
            className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-primary/25 bg-accent px-4 py-2.5 text-sm text-foreground"
          >
            <span>{notice}</span>
            <button
              type="button"
              aria-label="Cerrar aviso"
              onClick={() => setNotice('')}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        {selected && (
          <CaseDetail
            key={selected.id}
            record={selected}
            today={today}
            queue={activeQueue}
            onNavigate={navigateRecord}
            onClose={closeRecord}
            initialReal={linkedSection === 'real'}
            initialTab={
              ['bcra', 'real'].includes(linkedSection) ? 'bcra' : undefined
            }
            onSaveOpinion={sign}
          />
        )}
        {(!selected || view === 'Bandeja') && (
          <div hidden={Boolean(selected)} className="space-y-5">
            {/* Compact Single-Row View Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
                  {view === 'Bandeja' ? 'Mesa de crédito' : view}
                </h1>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <CalendarDays className="size-3.5" aria-hidden="true" />
                  {dueLabel(today, {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div
                  role="group"
                  aria-label="Área de trabajo"
                  className="inline-flex rounded-lg border border-border bg-card p-0.5 text-xs"
                >
                  {(['all', 'ge', 'py'] as const).map((x) => (
                    <button
                      key={x}
                      type="button"
                      aria-pressed={area === x}
                      onClick={() => {
                        setArea(x);
                        setStageFilter('all');
                        setOnlyWeek(false);
                      }}
                      className={cn(
                        'rounded-md px-2.5 py-1 font-semibold transition-colors',
                        area === x
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {x === 'all' ? 'Ambas áreas' : AREA_LABELS[x]}
                    </button>
                  ))}
                </div>

                {view === 'Bandeja' && (
                  <Button
                    size="sm"
                    onClick={() => {
                      lastTrigger.current =
                        document.activeElement as HTMLElement;
                      setCreateOpen(true);
                    }}
                  >
                    <Plus />
                    Nueva carpeta
                  </Button>
                )}
              </div>
            </div>

            {!ready ? (
              <Card
                className={sectionStyle}
                role={saved.phase === 'error' ? 'alert' : 'status'}
              >
                <h2 className={titleStyle}>
                  {saved.phase === 'error'
                    ? 'No se pudo abrir tu bandeja'
                    : 'Buscando tus carpetas en Fabric…'}
                </h2>
                {saved.phase === 'error' && (
                  <>
                    <p className="text-sm break-words text-muted-foreground">
                      {saved.message}
                    </p>
                    <Button
                      className="self-start"
                      variant="outline"
                      onClick={() => setSaved({ phase: 'loading', rows: [] })}
                    >
                      Volver a consultar Fabric
                    </Button>
                  </>
                )}
              </Card>
            ) : (
              <>
                {view === 'Bandeja' && (
                  <>
                    {/* Unified 5-Stage Interactive Funnel Bar */}
                    <div
                      className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6"
                      role="group"
                      aria-label="Filtrar carpetas por etapa"
                    >
                      <button
                        type="button"
                        aria-pressed={stageFilter === 'all'}
                        onClick={() => setStageFilter('all')}
                        className={cn(
                          'rounded-2xl border p-3.5 text-left transition-all',
                          stageFilter === 'all'
                            ? 'folio-featured-card'
                            : 'border-border bg-card text-foreground hover:border-primary/50',
                        )}
                      >
                        <span className="block text-xs font-semibold opacity-90">
                          Todas las etapas
                        </span>
                        <b className="mt-1 block font-heading text-2xl font-bold tracking-tight tabular-nums sm:text-3xl">
                          {inArea.length}
                        </b>
                      </button>

                      {STAGES.map((stageLabel, i) => {
                        const stageKey = i as Stage;
                        const active = stageFilter === stageKey;
                        const count = stageCounts[i];
                        return (
                          <button
                            key={stageLabel}
                            type="button"
                            aria-pressed={active}
                            onClick={() =>
                              setStageFilter(active ? 'all' : stageKey)
                            }
                            className={cn(
                              'rounded-2xl border p-3.5 text-left transition-all',
                              active
                                ? 'border-primary bg-accent ring-1 ring-primary'
                                : 'border-border bg-card hover:border-primary/40',
                            )}
                          >
                            <span className="block truncate text-xs font-semibold text-muted-foreground">
                              {stageLabel}
                            </span>
                            <b
                              className={cn(
                                'mt-1 block font-heading text-2xl font-bold tracking-tight tabular-nums sm:text-3xl',
                                i === 1 && count > 0 && 'text-warning',
                              )}
                            >
                              {count}
                            </b>
                          </button>
                        );
                      })}
                    </div>

                    {/* Main Content Layout */}
                    <div
                      className={cn(
                        'grid items-start gap-5',
                        viewMode === 'table' &&
                          'lg:grid-cols-[minmax(0,2.75fr)_minmax(265px,1fr)]',
                      )}
                    >
                      <Inbox
                        key={source + area}
                        records={inArea}
                        today={today}
                        stageFilter={stageFilter}
                        onStageFilter={setStageFilter}
                        onlyWeek={onlyWeek}
                        onToggleWeek={() => setOnlyWeek((prev) => !prev)}
                        week={week}
                        viewMode={viewMode}
                        onViewMode={setViewMode}
                        onOpen={openRecord}
                        demo={modeDemo}
                      />

                      {viewMode === 'table' && (
                        <aside className="grid content-start gap-4">
                          <Card className={sectionStyle}>
                            <div className="flex items-center justify-between gap-2">
                              <h2 className="font-heading text-base font-bold">
                                Agenda próxima
                              </h2>
                              <button
                                type="button"
                                onClick={() => setView('Agenda')}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                              >
                                Ver todo
                                <ArrowUpRight className="size-3.5" />
                              </button>
                            </div>
                            <AgendaList
                              events={upcoming.slice(0, 4)}
                              today={today}
                              onOpen={openRecord}
                            />
                          </Card>

                          <Card className="gap-2.5 rounded-2xl border border-border bg-accent/60 p-4 shadow-none sm:p-5">
                            <div className="flex items-center gap-2 text-primary">
                              <Sparkles className="size-4" aria-hidden="true" />
                              <span className={captionStyle}>
                                Asistente contextual
                              </span>
                            </div>
                            <h2 className="font-heading text-base font-bold">
                              Consultas sobre la cartera
                            </h2>
                            <p className="text-xs leading-relaxed text-muted-foreground">
                              Consultá vencimientos, riesgo y carpetas en
                              comisión con preguntas guiadas.
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              className="self-start bg-card"
                              onClick={() => setView('Consultas IA')}
                            >
                              Probar una consulta
                              <ArrowRight className="size-3.5" />
                            </Button>
                          </Card>

                          {modeDemo && area === 'py' && (
                            <Button
                              variant="link"
                              className="h-auto justify-start px-0 text-xs font-semibold"
                              onClick={() => {
                                const resolved = demo.find(
                                  (r) => r.id === 'CR-26087',
                                );
                                if (resolved) openRecord(resolved, inArea);
                              }}
                            >
                              Ver caso resuelto · Prisma Talleres
                              <ArrowUpRight className="size-3.5" />
                            </Button>
                          )}
                        </aside>
                      )}
                    </div>
                  </>
                )}

                {view === 'Agenda' && (
                  <div className="grid max-w-4xl gap-4">
                    {overdue.length > 0 && (
                      <Card className={cn(sectionStyle, 'border-danger/40')}>
                        <p className="text-xs font-semibold uppercase tracking-wider text-danger">
                          Vencidos ({overdue.length})
                        </p>
                        <AgendaList
                          events={overdue}
                          today={today}
                          onOpen={openRecord}
                        />
                      </Card>
                    )}

                    <Card className={sectionStyle}>
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className={captionStyle}>Prioridad inmediata</p>
                          <h2 className={titleStyle}>
                            Próximos 7 días ({week.length})
                          </h2>
                        </div>
                      </div>
                      <AgendaList
                        events={week}
                        today={today}
                        onOpen={openRecord}
                      />
                    </Card>

                    <Card className={sectionStyle}>
                      <div>
                        <p className={captionStyle}>Seguimiento</p>
                        <h2 className={titleStyle}>
                          Más adelante ({later.length})
                        </h2>
                      </div>
                      <AgendaList
                        events={later}
                        today={today}
                        onOpen={openRecord}
                      />
                    </Card>
                  </div>
                )}

                {view === 'Consultas IA' && (
                  <PortfolioQueries
                    key={source + area}
                    records={inArea}
                    week={week}
                    onOpen={openRecord}
                    demo={modeDemo}
                  />
                )}
              </>
            )}
          </div>
        )}
      </main>

      {createOpen && (
        <NewCaseDialog
          initialArea={area === 'ge' ? 'ge' : 'py'}
          onClose={() => setCreateOpen(false)}
          onCreate={create}
        />
      )}
    </div>
  );
}

export default App;
