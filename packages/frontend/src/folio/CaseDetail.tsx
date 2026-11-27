import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  FolderOpen,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  AREA_LABELS,
  OPINION_CHOICES,
  STAGES,
  type CreditCase,
  type OpinionInput,
  type TrackingInput,
} from './cases';
import { CaseEvaluation, CasePower } from './case-evaluation';
import { CaseTracking } from './CaseTracking';
import {
  amountLabel,
  captionStyle,
  numberLabel,
  sectionStyle,
  shortDate,
  titleStyle,
  urgencyInfo,
} from './case-format';

const CaseBcra = lazy(() =>
  import('./case-bcra').then(({ CaseBcra }) => ({ default: CaseBcra })),
);

const evidenceTabs = {
  evaluacion: 'Evaluación',
  seguimiento: 'Seguimiento',
  'power-bi': 'Power BI',
  bcra: 'BCRA',
} as const;
export type EvidenceTab = keyof typeof evidenceTabs;

export type CaseTab = EvidenceTab | 'consultas' | 'dictamen';

interface CaseDetailProps {
  record: CreditCase;
  today?: string;
  queue?: CreditCase[];
  onNavigate?: (record: CreditCase) => void;
  onClose(): void;
  onSaveOpinion(record: CreditCase, input: OpinionInput): Promise<void>;
  onSaveTracking(record: CreditCase, input: TrackingInput): Promise<void>;
  initialTab?: CaseTab;
  initialReal?: boolean;
}

const OPINION_SHORT: Record<string, string> = {
  'Acompañar propuesta': 'Acompañar',
  'Acompañar con condiciones': 'Con condiciones',
  'Solicitar información': 'Solicitar info',
  'Desaconsejar propuesta': 'Desaconsejar',
};

function OpinionPanel({
  record,
  onSaveOpinion,
}: Pick<CaseDetailProps, 'record' | 'onSaveOpinion'>) {
  const saved = record.opinion;
  const [editing, setEditing] = useState(!saved);
  const [choice, setChoice] = useState(saved?.choice ?? '');
  const [note, setNote] = useState(saved?.note ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    if (!choice || !note.trim()) {
      setError('Elegí una recomendación y escribí sus fundamentos.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onSaveOpinion(record, { choice, note: note.trim() });
      setEditing(false);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'No se pudo guardar el dictamen. Podés reintentar.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  function resetDraft() {
    setChoice(saved?.choice ?? '');
    setNote(saved?.note ?? '');
    setError('');
  }

  function insertEvidenceSnippet() {
    const parts: string[] = [];
    if (
      record.source === 'demo' &&
      record.limit !== null &&
      record.used !== null &&
      record.limit > 0
    ) {
      const pct = numberLabel((record.used / record.limit) * 100);
      parts.push(
        `Exposición interna: ${amountLabel(record.used)} / ${amountLabel(record.limit)} (${pct} %).`,
      );
    }
    if (record.proposal?.credit != null) {
      parts.push(
        `Propuesta Zonal ${amountLabel(record.proposal.zonal)} vs. Crédito ${amountLabel(record.proposal.credit)}.`,
      );
    }
    if (record.holders > 1 && record.source === 'demo') {
      parts.push('Pendiente verificar consulta BCRA del segundo cotitular.');
    }
    if (!parts.length) {
      parts.push(
        `Carpeta ${record.code} (${AREA_LABELS[record.area]} · ${record.segment}) en etapa ${STAGES[record.stage]}.`,
      );
    }
    const snippet = parts.join(' ');
    setNote((prev) => (prev.trim() ? `${prev.trim()}\n${snippet}` : snippet));
  }

  if (!editing && saved) {
    return (
      <div className="space-y-3 p-4 sm:p-5">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-success-surface px-2.5 py-1 text-xs font-semibold text-success">
          <CheckCircle2 className="size-3.5" aria-hidden="true" />
          Dictamen registrado
        </div>
        <h3 className={titleStyle}>{saved.choice}</h3>
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {saved.note}
        </p>
        <p className="border-t border-border pt-2.5 text-xs text-muted-foreground">
          {saved.author} · {saved.time}
        </p>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            resetDraft();
            setEditing(true);
          }}
        >
          Editar dictamen
        </Button>
      </div>
    );
  }

  return (
    <form
      className="grid gap-4 p-4 sm:p-5"
      onSubmit={submit}
      aria-label="Dictamen del analista"
    >
      <div>
        <p className={captionStyle}>Criterio del analista</p>
        <h3 className={titleStyle}>
          {saved ? 'Editar dictamen' : 'Redactar dictamen'}
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Mantené abierta la evidencia a la izquierda mientras fundamentás tu
          decisión.
        </p>
      </div>

      <div className="grid gap-1.5">
        <span className="text-xs font-semibold text-foreground">
          Recomendación
        </span>
        <div
          className="grid grid-cols-2 gap-2"
          role="radiogroup"
          aria-label="Recomendación"
        >
          {OPINION_CHOICES.map((option) => {
            const active = choice === option;
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={submitting}
                onClick={() => {
                  setChoice(option);
                  setError('');
                }}
                className={cn(
                  'rounded-lg border px-2.5 py-2 text-left text-xs font-semibold transition-colors',
                  active
                    ? 'border-primary bg-secondary text-secondary-foreground'
                    : 'border-input bg-background text-foreground hover:bg-accent',
                )}
              >
                {OPINION_SHORT[option] ?? option}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor="opinion-note-input"
            className="text-xs font-semibold text-foreground"
          >
            Fundamentos y condiciones
          </label>
          <button
            type="button"
            disabled={submitting}
            onClick={insertEvidenceSnippet}
            className="text-xs font-semibold text-primary hover:underline"
          >
            + Insertar datos clave
          </button>
        </div>
        <Textarea
          id="opinion-note-input"
          placeholder="¿Qué evidencia sustenta tu recomendación?"
          rows={6}
          maxLength={3000}
          required
          value={note}
          disabled={submitting}
          onChange={(e) => setNote(e.target.value)}
          className="min-h-32 resize-y bg-background text-sm font-normal"
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {record.source === 'demo'
              ? 'Conservado en esta sesión de muestra'
              : 'Asociado a tu identidad de Fabric'}
          </span>
          <span className="tabular-nums">{note.length} / 3000</span>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        {saved && (
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={() => {
              resetDraft();
              setEditing(false);
            }}
          >
            Cancelar
          </Button>
        )}
        <Button type="submit" className="flex-1 sm:flex-none" disabled={submitting}>
          {submitting ? 'Registrando…' : 'Registrar dictamen'}
        </Button>
      </div>
    </form>
  );
}

const suggestions = [
  'Resumir esta carpeta',
  '¿Cuál es la exposición?',
  '¿Qué falta revisar?',
];

function CaseQuestions({
  record,
  goEvidence,
}: {
  record: CreditCase;
  goEvidence(tab: EvidenceTab): void;
}) {
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState<{
    question: string;
    answer: string;
    tab?: EvidenceTab;
  } | null>(null);

  function answer(input: string) {
    const q = input.trim();
    if (!q) return;
    const text = q
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    if (/expos|limite|saldo/.test(text)) {
      const { limit, used } = record;
      setResponse({
        question: q,
        answer:
          limit !== null && used !== null && limit > 0
            ? `El saldo utilizado es ${amountLabel(used)} sobre un límite de ${amountLabel(limit)} (${numberLabel((used / limit) * 100)} %). Corte al 31 oct 2026.`
            : 'La carpeta no tiene indicadores internos vinculados.',
        tab: 'power-bi',
      });
    } else if (/falta|pendiente|revisar|bcra/.test(text)) {
      setResponse({
        question: q,
        answer:
          record.holders > 1
            ? 'En la muestra, el segundo titular figura con consulta pendiente. Revisá los antecedentes de cada titular antes de registrar el dictamen.'
            : 'Podés revisar la deuda por entidad y los cheques rechazados del titular en la sección BCRA.',
        tab: 'bcra',
      });
    } else if (/resum|etapa|responsable|carpeta/.test(text)) {
      setResponse({
        question: q,
        answer: `${record.name} está en la etapa «${STAGES[record.stage]}», a cargo de ${record.owner}. ${record.event && record.dueDate ? `Próximo hito el ${shortDate(record.dueDate)}: ${record.event}.` : 'Sin próximo hito registrado.'}`,
        tab: 'evaluacion',
      });
    } else {
      setResponse({
        question: q,
        answer:
          'Esta demostración cubre las preguntas sugeridas. Elegí una para ver la respuesta y saltar a su fuente.',
      });
    }
    setQuestion('');
  }

  if (record.source === 'saved') {
    return (
      <div className="space-y-3 p-4 sm:p-5">
        <p className={captionStyle}>Consultas IA</p>
        <h3 className={titleStyle}>Asistente pendiente de conexión</h3>
        <p className="text-sm text-muted-foreground">
          Las preguntas sobre tus modelos requieren una conexión con Fabric IQ.
          Mientras tanto, podés recorrer la evidencia a la izquierda.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => goEvidence('power-bi')}
          >
            Ver Power BI
          </Button>
          <Button size="sm" variant="outline" onClick={() => goEvidence('bcra')}>
            Ver BCRA
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4 sm:p-5">
      <div>
        <p className={captionStyle}>
          <Sparkles className="mr-1 inline size-3.5" aria-hidden="true" />
          Consultas IA · Simulación
        </p>
        <h3 className={titleStyle}>Preguntá sobre esta carpeta</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Respuestas de ejemplo sobre {record.name} con acceso directo a cada
          sección.
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((q) => (
          <Button key={q} variant="outline" size="xs" onClick={() => answer(q)}>
            {q}
          </Button>
        ))}
      </div>
      <div aria-live="polite">
        {response && (
          <div className="space-y-2 rounded-xl border border-border bg-accent/80 p-3.5 text-sm">
            <p className="text-xs font-semibold text-foreground">
              {response.question}
            </p>
            <p className="text-xs leading-relaxed text-foreground">
              {response.answer}
            </p>
            {response.tab && (
              <Button
                size="xs"
                variant="outline"
                onClick={() => goEvidence(response.tab!)}
              >
                Abrir {evidenceTabs[response.tab]}{' '}
                <ArrowRight className="size-3" />
              </Button>
            )}
          </div>
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          answer(question);
        }}
        className="flex items-center gap-2"
      >
        <Input
          aria-label="Pregunta sobre la carpeta de muestra"
          placeholder="Escribí una consulta…"
          value={question}
          maxLength={200}
          required
          onChange={(e) => setQuestion(e.target.value)}
        />
        <Button type="submit" size="icon-sm" aria-label="Enviar consulta">
          <ArrowRight className="size-4" />
        </Button>
      </form>
    </div>
  );
}

export function CaseDetail({
  record,
  today = '2026-11-26',
  queue,
  onNavigate,
  onClose,
  onSaveOpinion,
  onSaveTracking,
  initialTab = 'evaluacion',
  initialReal = false,
}: CaseDetailProps) {
  const initialEvidence: EvidenceTab =
    initialTab === 'power-bi' ||
    initialTab === 'bcra' ||
    initialTab === 'seguimiento'
      ? initialTab
      : 'evaluacion';
  const [evidenceTab, setEvidenceTab] = useState<EvidenceTab>(initialEvidence);
  const [decisionTab, setDecisionTab] = useState<'dictamen' | 'consultas'>(
    initialTab === 'consultas' ? 'consultas' : 'dictamen',
  );
  const [bcraVisited, setBcraVisited] = useState(initialEvidence === 'bcra');
  const workbenchTop = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  function goEvidence(value: string) {
    if (!Object.hasOwn(evidenceTabs, value)) return;
    if (value === 'bcra') setBcraVisited(true);
    setEvidenceTab(value as EvidenceTab);
    workbenchTop.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }

  const list = queue && queue.length > 0 ? queue : [record];
  const currentIdx = list.findIndex((item) => item.id === record.id);
  const prevRecord = currentIdx > 0 ? list[currentIdx - 1] : null;
  const nextRecord =
    currentIdx >= 0 && currentIdx < list.length - 1
      ? list[currentIdx + 1]
      : null;

  const hasExposure =
    record.source === 'demo' &&
    record.limit !== null &&
    record.used !== null &&
    record.limit > 0;
  const pct = hasExposure ? (record.used! / record.limit!) * 100 : null;
  const urgency = urgencyInfo(record.dueDate, today);
  const bcraBadgeText =
    record.source === 'demo'
      ? record.code === 'CR-26087'
        ? 'Sit. 2 · 1 cheque'
        : record.holders > 1
          ? 'Sit. 1 · 1 cotitular pend.'
          : 'Sit. 1 · Sin alertas'
      : record.cuit
        ? 'CUIT cargado'
        : 'Sin consultar';
  const bcraAlert =
    record.source === 'demo' &&
    (record.code === 'CR-26087' || record.holders > 1);

  return (
    <article
      ref={workbenchTop}
      aria-label={`Expediente de ${record.name}`}
      className="space-y-5"
    >
      {/* Executive Header Card */}
      <Card className="gap-4 rounded-2xl border border-border bg-card p-4 shadow-none sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={onClose}>
              <ArrowLeft className="size-4" />
              Mesa de crédito
            </Button>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <FolderOpen className="size-3.5 text-primary" aria-hidden="true" />
              {record.code}
              {record.source === 'demo' ? ' · Datos de muestra' : ''}
            </span>
            <span className={'folio-status s' + record.stage}>
              {STAGES[record.stage]}
            </span>
          </div>

          {onNavigate && list.length > 1 && currentIdx >= 0 && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="mr-1 text-muted-foreground tabular-nums">
                Carpeta {currentIdx + 1} de {list.length}
              </span>
              <Button
                size="xs"
                variant="outline"
                disabled={!prevRecord}
                onClick={() => prevRecord && onNavigate(prevRecord)}
              >
                <ChevronLeft className="size-3.5" />
                Anterior
              </Button>
              <Button
                size="xs"
                variant="outline"
                disabled={!nextRecord}
                onClick={() => nextRecord && onNavigate(nextRecord)}
              >
                Siguiente
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div className="min-w-0">
            <h1 className="font-heading text-2xl leading-tight font-bold tracking-tight break-words sm:text-3xl">
              {record.name}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>Área · {AREA_LABELS[record.area]}</span>
              <span>Segmento · {record.segment}</span>
              <span>
                {record.holders} {record.holders === 1 ? 'titular' : 'titulares'}
              </span>
              <span>
                Analista · <strong className="text-foreground">{record.owner}</strong>
              </span>
            </p>
          </div>

          {/* Executive KPI Strip */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:shrink-0">
            <button
              type="button"
              onClick={() => goEvidence('power-bi')}
              className="rounded-xl border border-border bg-background px-3 py-2 text-left transition-colors hover:border-primary/50"
            >
              <p className="text-[11px] font-medium text-muted-foreground">
                Exposición
              </p>
              <p className="mt-0.5 text-xs font-bold tabular-nums">
                {pct !== null
                  ? `${numberLabel(pct)} % (${amountLabel(record.used)})`
                  : 'Sin vincular'}
              </p>
            </button>

            <button
              type="button"
              onClick={() => goEvidence('bcra')}
              className={cn(
                'rounded-xl border bg-background px-3 py-2 text-left transition-colors hover:border-primary/50',
                bcraAlert ? 'border-warning/45' : 'border-border',
              )}
            >
              <p className="text-[11px] font-medium text-muted-foreground">
                BCRA
              </p>
              <p
                className={cn(
                  'mt-0.5 text-xs font-bold',
                  bcraAlert
                    ? 'text-warning'
                    : record.source === 'demo'
                      ? 'text-success'
                      : 'text-foreground',
                )}
              >
                {bcraBadgeText}
              </p>
            </button>

            <div className="rounded-xl border border-border bg-background px-3 py-2">
              <p className="text-[11px] font-medium text-muted-foreground">
                Próximo hito
              </p>
              <p
                className={cn(
                  'mt-0.5 text-xs font-bold tabular-nums',
                  urgency.tone === 'danger' && 'text-danger',
                  urgency.tone === 'warning' && 'text-warning',
                )}
              >
                {record.dueDate
                  ? `${urgency.label}${urgency.relative ? ` · ${urgency.relative}` : ''}`
                  : 'Sin programar'}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-background px-3 py-2">
              <p className="text-[11px] font-medium text-muted-foreground">
                Dictamen
              </p>
              <p
                className={cn(
                  'mt-0.5 text-xs font-bold',
                  record.opinion ? 'text-success' : 'text-muted-foreground',
                )}
              >
                {record.opinion ? 'Registrado' : 'Pendiente'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Split Workbench: Left Evidence Dossier + Right Persistent Decision Panel */}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(340px,1fr)]">
        {/* Left column: Evidence Dossier */}
        <section className="min-w-0">
          <Tabs
            value={evidenceTab}
            onValueChange={goEvidence}
            className="gap-4"
          >
            <div className="overflow-x-auto border-b border-border">
              <TabsList
                className="h-auto w-max gap-1 rounded-none bg-transparent p-0"
                aria-label="Secciones de evidencia de la carpeta"
              >
                {Object.entries(evidenceTabs).map(([value, label]) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className="rounded-none border-0 border-b-2 border-transparent px-4 py-2.5 text-sm font-semibold text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
                  >
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <TabsContent value="evaluacion" className="m-0">
              <CaseEvaluation record={record} go={goEvidence} />
            </TabsContent>

            <TabsContent value="seguimiento" className="m-0">
              <CaseTracking
                key={record.id}
                record={record}
                onSave={onSaveTracking}
              />
            </TabsContent>

            <TabsContent value="power-bi" className="m-0 space-y-4">
              <CasePower record={record} />
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goEvidence('evaluacion')}
                >
                  <ArrowLeft className="size-4" /> Evaluación
                </Button>
                <Button size="sm" onClick={() => goEvidence('bcra')}>
                  Consultar BCRA <ArrowRight className="size-4" />
                </Button>
              </div>
            </TabsContent>

            <TabsContent
              forceMount
              value="bcra"
              hidden={evidenceTab !== 'bcra'}
              className="m-0 space-y-4 data-[state=inactive]:hidden"
            >
              {bcraVisited && (
                <Suspense
                  fallback={
                    <Card className={sectionStyle}>
                      <p role="status" className="text-sm text-muted-foreground">
                        Cargando la vista del BCRA…
                      </p>
                    </Card>
                  }
                >
                  <CaseBcra record={record} initialReal={initialReal} />
                </Suspense>
              )}
              <div className="flex flex-wrap justify-start gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goEvidence('evaluacion')}
                >
                  <ArrowLeft className="size-4" /> Volver a Evaluación
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </section>

        {/* Right column: Persistent Decision & AI Panel */}
        <aside className="min-w-0 lg:sticky lg:top-20">
          <Card className="gap-0 overflow-hidden rounded-2xl border border-border bg-card p-0 shadow-none">
            <div
              className="grid grid-cols-2 border-b border-border bg-muted/40"
              role="tablist"
              aria-label="Panel de decisión"
            >
              <button
                type="button"
                role="tab"
                aria-selected={decisionTab === 'dictamen'}
                onClick={() => setDecisionTab('dictamen')}
                className={cn(
                  'inline-flex items-center justify-center gap-1.5 border-b-2 py-3 text-xs font-semibold transition-colors',
                  decisionTab === 'dictamen'
                    ? 'border-primary bg-card text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                <FileText className="size-3.5" aria-hidden="true" />
                Dictamen
                {record.opinion && (
                  <CheckCircle2
                    className="size-3.5 text-success"
                    aria-label="Registrado"
                  />
                )}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={decisionTab === 'consultas'}
                onClick={() => setDecisionTab('consultas')}
                className={cn(
                  'inline-flex items-center justify-center gap-1.5 border-b-2 py-3 text-xs font-semibold transition-colors',
                  decisionTab === 'consultas'
                    ? 'border-primary bg-card text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                <Sparkles className="size-3.5" aria-hidden="true" />
                Consultas IA
              </button>
            </div>

            <div hidden={decisionTab !== 'dictamen'}>
              <OpinionPanel record={record} onSaveOpinion={onSaveOpinion} />
            </div>
            <div hidden={decisionTab !== 'consultas'}>
              <CaseQuestions record={record} goEvidence={goEvidence} />
            </div>
          </Card>
        </aside>
      </div>
    </article>
  );
}
