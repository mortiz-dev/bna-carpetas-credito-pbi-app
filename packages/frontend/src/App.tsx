import { useContext, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  Clock3,
  Folders,
  Inbox as InboxIcon,
  Landmark,
  Layers3,
  Moon,
  Plus,
  ScanLine,
  Sparkles,
  Sun,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AuthContext } from '@/hooks/auth.context';
import { useTheme } from '@/hooks/theme.context';
import { CaseDetail } from '@/folio/CaseDetail';
import { dueLabel } from '@/folio/case-format';
import { Inbox, type Bucket } from '@/folio/Inbox';
import { NewCaseDialog } from '@/folio/NewCaseDialog';
import { PortfolioQueries } from '@/folio/PortfolioQueries';
import {
  AREA_LABELS,
  demoToday,
  sampleCases,
  type Area,
  type CreditCase,
  type NewCaseInput,
  type OpinionInput,
} from '@/folio/cases';
import {
  caseErrorMessage,
  createCase,
  listCases,
  saveOpinion,
} from '@/folio/case-store';

const sections = [
  { label: 'Bandeja', icon: InboxIcon },
  { label: 'Agenda', icon: CalendarDays },
  { label: 'Consultas IA', icon: Sparkles },
] as const;
type Section = (typeof sections)[number]['label'];
type Source = 'demo' | 'saved';
type DataState = {
  phase: 'idle' | 'loading' | 'ready' | 'error';
  rows: CreditCase[];
  message?: string;
};
const metrics = [
  { key: 'open', label: 'En curso', desc: 'Carpetas abiertas', icon: Folders },
  {
    key: 'analysis',
    label: 'En análisis',
    desc: 'En el área de Crédito',
    icon: ScanLine,
  },
  {
    key: 'week',
    label: 'Próximos hitos',
    desc: 'Dentro de los próximos 7 días',
    icon: Clock3,
  },
  {
    key: 'committee',
    label: 'En comisión',
    desc: 'Para tratamiento',
    icon: Landmark,
  },
] as const;

function AgendaList({
  events,
  onOpen,
}: {
  events: CreditCase[];
  onOpen: (r: CreditCase) => void;
}) {
  return (
    <div className="folio-events">
      {events.length ? (
        events.map((r) => (
          <button key={r.id} onClick={() => onOpen(r)}>
            <span className="folio-date">
              <small>{dueLabel(r.dueDate!, { month: 'short' })}</small>
              <b>{dueLabel(r.dueDate!, { day: 'numeric' })}</b>
            </span>
            <span className="min-w-0">
              <strong className="block">{r.name}</strong>
              <small>{r.event}</small>
            </span>
            <ChevronRight
              className="ml-auto shrink-0 text-muted-foreground"
              size={15}
            />
          </button>
        ))
      ) : (
        <p className="py-4 text-sm text-muted-foreground">
          Sin hitos programados para esta selección.
        </p>
      )}
    </div>
  );
}

function App() {
  const { isDark, toggleTheme } = useTheme();
  const auth = useContext(AuthContext);
  const [source, setSource] = useState<Source>('demo');
  const [demo, setDemo] = useState(sampleCases);
  const [saved, setSaved] = useState<DataState>({ phase: 'idle', rows: [] });
  const [view, setView] = useState<Section>('Bandeja');
  const [area, setArea] = useState<Area | 'all'>('all');
  const [bucket, setBucket] = useState<Bucket>('all');
  const [caseId, setCaseId] = useState<string | null>(
    () =>
      sampleCases.find((r) => r.id === location.hash.slice(1).split('/')[0])
        ?.id ?? null,
  );
  const [linkedSection, setLinkedSection] = useState(
    () => location.hash.slice(1).split('/')[1],
  );
  const [createOpen, setCreateOpen] = useState(false);
  const listVersion = useRef(0);
  const lastTrigger = useRef<HTMLElement | null>(null);
  const [notice, setNotice] = useState('');
  const modeDemo = source === 'demo';
  const ready = modeDemo || saved.phase === 'ready';
  const records = modeDemo ? demo : saved.rows;
  const inArea = records.filter((r) => area === 'all' || r.area === area);
  const selected = records.find((r) => r.id === caseId);
  const today = modeDemo
    ? demoToday
    : new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Argentina/Buenos_Aires',
      }).format(new Date());
  const upcoming = inArea
    .filter((r) => r.dueDate && r.dueDate >= today)
    .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!));
  const through = new Date(Date.parse(today + 'T12:00:00Z') + 7 * 86400000)
    .toISOString()
    .slice(0, 10);
  const week = upcoming.filter((r) => r.dueDate! <= through);
  const counts = {
    open: inArea.filter((r) => r.stage !== 4).length,
    analysis: inArea.filter((r) => r.stage === 0).length,
    week: week.length,
    committee: inArea.filter((r) => r.stage === 3).length,
  };
  async function readSaved() {
    const version = ++listVersion.current;
    setSaved({ phase: 'loading', rows: [] });
    try {
      const rows = await listCases();
      if (listVersion.current === version) setSaved({ phase: 'ready', rows });
    } catch (error) {
      if (listVersion.current === version)
        setSaved({
          phase: 'error',
          rows: [],
          message: caseErrorMessage(error),
        });
    }
  }
  function switchSource(next: Source) {
    setSource(next);
    setCaseId(null);
    setBucket('all');
    setNotice('');
    if (next === 'saved') void readSaved();
  }
  function openRecord(record: CreditCase) {
    lastTrigger.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setLinkedSection('');
    setCaseId(record.id);
  }
  function closeRecord() {
    setCaseId(null);
    setLinkedSection('');
    requestAnimationFrame(
      () => lastTrigger.current?.isConnected && lastTrigger.current.focus(),
    );
  }
  async function create(input: NewCaseInput) {
    const row = await createCase(input);
    // Read the complete owner-scoped list so a create from the examples view cannot hide older work.
    setSource('saved');
    setArea(row.area);
    setView('Bandeja');
    setBucket('all');
    setCreateOpen(false);
    const version = ++listVersion.current;
    setSaved({ phase: 'ready', rows: [row] });
    setCaseId(row.id);
    setNotice('Carpeta guardada en Fabric.');
    try {
      const rows = await listCases();
      if (listVersion.current === version)
        setSaved({
          phase: 'ready',
          rows: rows.some((r) => r.id === row.id) ? rows : [row, ...rows],
        });
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
    <div className="folio">
      <a href="#workspace" className="sr-only focus:not-sr-only">
        Ir al contenido
      </a>
      <header className="folio-top">
        <div className="folio-frame folio-header">
          <div className="folio-logo" aria-label="Folio">
            <Layers3 strokeWidth={2.8} />
            Folio
          </div>
          <nav aria-label="Navegación principal">
            {sections.map(({ label, icon: Icon }) => (
              <button
                key={label}
                aria-current={view === label ? 'page' : undefined}
                onClick={() => setView(label)}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <select
              className="folio-source"
              aria-label="Origen de las carpetas"
              value={source}
              onChange={(e) => switchSource(e.target.value as Source)}
            >
              <option value="demo">Datos de muestra</option>
              <option value="saved">Mis carpetas · Fabric</option>
            </select>
            <Button
              aria-label={isDark ? 'Usar tema claro' : 'Usar tema oscuro'}
              className="rounded-full"
              size="icon-sm"
              variant="outline"
              onClick={toggleTheme}
            >
              {isDark ? <Sun /> : <Moon />}
            </Button>
            <span title={email || 'Sesión Fabric'} className="folio-avatar">
              {initial}
            </span>
          </div>
        </div>
      </header>
      <main id="workspace" tabIndex={-1} className="folio-frame folio-main">
        <div className="folio-heading">
          <div>
            <div className="folio-eyebrow">
              <CalendarDays size={13} />
              {dueLabel(today, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </div>
            <h1>{view === 'Bandeja' ? 'Mesa de crédito' : view}</h1>
            <p>
              {view === 'Bandeja'
                ? 'Seguimiento de carpetas y próximos hitos del equipo.'
                : view === 'Agenda'
                  ? 'Próximos hitos del área, ordenados por fecha.'
                  : 'Preguntas sobre la cartera seleccionada.'}
            </p>
          </div>
          {view === 'Bandeja' && (
            <Button
              className="rounded-lg"
              onClick={() => {
                lastTrigger.current = document.activeElement as HTMLElement;
                setCreateOpen(true);
              }}
            >
              <Plus />
              Nueva carpeta
            </Button>
          )}
        </div>
        <div className="folio-areas">
          <span>Área de trabajo</span>
          {(['all', 'ge', 'py'] as const).map((x) => (
            <Button
              key={x}
              size="sm"
              variant={area === x ? 'secondary' : 'outline'}
              aria-pressed={area === x}
              onClick={() => {
                setArea(x);
                setBucket('all');
              }}
            >
              {x === 'all' ? 'Ambas áreas' : AREA_LABELS[x]}
            </Button>
          ))}
        </div>
        {notice && (
          <p role="status" className="mb-3 text-sm text-primary">
            {notice}
          </p>
        )}
        {!ready ? (
          <Card
            className="p-6"
            role={saved.phase === 'error' ? 'alert' : 'status'}
          >
            <h2>
              {saved.phase === 'error'
                ? 'No se pudo abrir tu bandeja'
                : 'Buscando tus carpetas…'}
            </h2>
            {saved.phase === 'error' && (
              <>
                <p className="break-words text-sm text-muted-foreground">
                  {saved.message}
                </p>
                <Button
                  className="self-start"
                  variant="outline"
                  onClick={() => void readSaved()}
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
                <div className="folio-metrics">
                  {metrics.map(({ key, label, desc, icon: Icon }, i) => (
                    <button
                      key={key}
                      className={'folio-metric ' + (i === 0 ? 'featured' : '')}
                      aria-pressed={bucket === key}
                      onClick={() => setBucket(bucket === key ? 'all' : key)}
                    >
                      <span>
                        {label}
                        <Icon size={17} />
                      </span>
                      <b>{counts[key]}</b>
                      <small>{desc}</small>
                    </button>
                  ))}
                </div>
                <div className="folio-layout">
                  <Inbox
                    key={source + area + bucket}
                    records={inArea}
                    bucket={bucket}
                    week={week}
                    onOpen={openRecord}
                    clearBucket={() => setBucket('all')}
                    demo={modeDemo}
                  />
                  <aside className="grid content-start gap-4">
                    <Card className="gap-1 px-5 py-5">
                      <div className="flex items-center justify-between gap-2">
                        <h2>Agenda próxima</h2>
                        <button
                          className="folio-link"
                          onClick={() => setView('Agenda')}
                        >
                          Ver todo <ArrowUpRight size={15} />
                        </button>
                      </div>
                      <AgendaList
                        events={upcoming.slice(0, 3)}
                        onOpen={openRecord}
                      />
                    </Card>
                    <Card className="folio-ai">
                      <Sparkles size={24} />
                      <h2>Asistente de crédito</h2>
                      <p>
                        Consultá etapas y vencimientos de la bandeja con
                        preguntas guiadas.
                      </p>
                      <button onClick={() => setView('Consultas IA')}>
                        Probar una consulta <ArrowRight size={15} />
                      </button>
                    </Card>
                    {modeDemo && area === 'py' && (
                      <button
                        className="folio-link"
                        onClick={() =>
                          openRecord(demo.find((r) => r.id === 'CR-26087')!)
                        }
                      >
                        Ver caso resuelto · Prisma Talleres{' '}
                        <ArrowUpRight size={15} />
                      </button>
                    )}
                  </aside>
                </div>
              </>
            )}
            {view === 'Agenda' && (
              <Card className="max-w-3xl gap-2 px-6 py-5">
                <h2>Hitos programados</h2>
                <AgendaList events={upcoming} onOpen={openRecord} />
              </Card>
            )}
            {view === 'Consultas IA' && (
              <PortfolioQueries
                key={source + area}
                records={inArea}
                week={week}
                onOpen={openRecord}
              />
            )}
          </>
        )}
      </main>
      {createOpen && (
        <NewCaseDialog
          initialArea={area === 'ge' ? 'ge' : 'py'}
          onClose={() => setCreateOpen(false)}
          onCreate={create}
        />
      )}
      {selected && (
        <CaseDetail
          key={selected.id}
          record={selected}
          onClose={closeRecord}
          initialReal={linkedSection === 'real'}
          initialTab={
            ['bcra', 'real'].includes(linkedSection) ? 'bcra' : undefined
          }
          onSaveOpinion={sign}
        />
      )}
    </div>
  );
}
export default App;
