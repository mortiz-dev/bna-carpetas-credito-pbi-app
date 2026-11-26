import { lazy, Suspense, useRef, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FolderOpen,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  AREA_LABELS,
  OPINION_CHOICES,
  STAGES,
  type CreditCase,
  type OpinionInput,
} from './cases';
import {
  CaseEvaluation,
  CaseFields,
  CasePower,
  SourceButtons,
} from './case-evaluation';
import {
  amountLabel,
  captionStyle,
  numberLabel,
  sectionStyle,
  shortDate,
  titleStyle,
} from './case-format';

const CaseBcra = lazy(() =>
  import('./case-bcra').then(({ CaseBcra }) => ({ default: CaseBcra })),
);

const detailTabs = {
  evaluacion: 'Evaluación',
  'power-bi': 'Power BI',
  bcra: 'BCRA',
  consultas: 'Consultas IA',
  dictamen: 'Dictamen',
};
export type CaseTab = keyof typeof detailTabs;

interface CaseDetailProps {
  record: CreditCase;
  onClose(): void;
  onSaveOpinion(record: CreditCase, input: OpinionInput): Promise<void>;
  initialTab?: CaseTab;
  initialReal?: boolean;
}

function OpinionPanel({
  record,
  onSaveOpinion,
  go,
}: Pick<CaseDetailProps, 'record' | 'onSaveOpinion'> & {
  go(tab: CaseTab): void;
}) {
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
  return (
    <div className="grid items-start gap-4 md:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
      <Card className={sectionStyle}>
        {editing || !saved ? (
          <form
            className="grid gap-4"
            onSubmit={submit}
            aria-label="Dictamen del analista"
          >
            <div>
              <p className={captionStyle}>Dictamen del analista</p>
              <h3 className={titleStyle}>
                {saved ? 'Editar dictamen' : 'Dejar dictamen'}
              </h3>
            </div>
            <label className="grid gap-1.5 text-sm font-semibold">
              Recomendación
              <select
                value={choice}
                onChange={(e) => setChoice(e.target.value)}
                required
                disabled={submitting}
                className="w-full rounded-lg border border-input bg-card px-3 py-2 font-normal"
              >
                <option value="">Elegí una opción</option>
                {OPINION_CHOICES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold">
              Fundamentos y condiciones
              <Textarea
                placeholder="¿Qué evidencia sustenta tu recomendación?"
                rows={5}
                maxLength={3000}
                required
                value={note}
                disabled={submitting}
                onChange={(e) => setNote(e.target.value)}
                className="min-h-28 resize-y bg-card font-normal"
              />
            </label>
            <p className="text-xs text-muted-foreground">
              {record.source === 'demo'
                ? 'El dictamen de muestra se conserva en esta sesión de demostración.'
                : 'El dictamen quedará asociado a tu identidad de Fabric.'}
            </p>
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
                  Cancelar edición
                </Button>
              )}
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Registrando…' : 'Registrar dictamen'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <div className={captionStyle}>
              <CheckCircle2 className="mr-1 inline size-4" />
              Dictamen registrado
            </div>
            <h3 className={titleStyle}>{saved.choice}</h3>
            <p className="whitespace-pre-wrap break-words text-sm">
              {saved.note}
            </p>
            <p className="text-xs text-muted-foreground">
              {saved.author} · {saved.time}
            </p>
            <Button
              variant="outline"
              onClick={() => {
                resetDraft();
                setEditing(true);
              }}
            >
              Editar dictamen
            </Button>
          </div>
        )}
      </Card>
      <Card className={sectionStyle}>
        <h3 className={titleStyle}>Datos para el dictamen</h3>
        <CaseFields
          items={[
            ['Área responsable', AREA_LABELS[record.area]],
            ...(record.proposal
              ? [
                  [
                    'Zonal / Crédito',
                    `${amountLabel(record.proposal.zonal)} / ${amountLabel(record.proposal.credit)}`,
                  ] as [string, string],
                ]
              : []),
            [
              'Saldo interno',
              record.source === 'demo' && record.used !== null
                ? `${amountLabel(record.used)} · muestra`
                : 'Sin vincular',
            ],
          ]}
        />
        <SourceButtons go={go} />
      </Card>
    </div>
  );
}

const suggestions = [
  'Resumir esta carpeta',
  '¿Cuál es la exposición?',
  '¿Qué falta revisar?',
];
function CaseQuestions({
  record,
  go,
}: {
  record: CreditCase;
  go(tab: CaseTab): void;
}) {
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState<{
    question: string;
    answer: string;
    tab: CaseTab;
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
          'Esta demostración cubre las preguntas sugeridas. Elegí una para ver la respuesta y su fuente.',
        tab: 'consultas',
      });
    }
    setQuestion('');
  }
  if (record.source === 'saved')
    return (
      <Card className={sectionStyle}>
        <p className={captionStyle}>Consultas IA</p>
        <h3 className={titleStyle}>Asistente pendiente de conexión</h3>
        <p className="text-sm text-muted-foreground">
          Las preguntas sobre tus modelos requieren una conexión con Fabric IQ.
          Podés revisar los datos disponibles en las secciones de la carpeta.
        </p>
        <SourceButtons go={go} />
      </Card>
    );
  return (
    <Card className={sectionStyle}>
      <p className={captionStyle}>
        <Sparkles className="mr-1 inline size-4" /> Consultas IA · Simulación
      </p>
      <h3 className={titleStyle}>Preguntá sobre esta carpeta</h3>
      <p className="text-sm text-muted-foreground">
        Respuestas de ejemplo con referencias a los datos ficticios de{' '}
        {record.name}.
      </p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((q) => (
          <Button key={q} variant="outline" size="sm" onClick={() => answer(q)}>
            {q}
          </Button>
        ))}
      </div>
      <div aria-live="polite">
        {response && (
          <div className="space-y-2 rounded-xl bg-accent p-4 text-sm">
            <p className="font-semibold">{response.question}</p>
            <p>{response.answer}</p>
            {response.tab !== 'consultas' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => go(response.tab)}
              >
                Ver fuente de muestra · {detailTabs[response.tab]}{' '}
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
        <Button type="submit" aria-label="Enviar consulta">
          <ArrowRight className="size-4" />
        </Button>
      </form>
    </Card>
  );
}

export function CaseDetail({
  record,
  onClose,
  onSaveOpinion,
  initialTab = 'evaluacion',
  initialReal = false,
}: CaseDetailProps) {
  const [tab, setTab] = useState<CaseTab>(initialTab);
  const [bcraVisited, setBcraVisited] = useState(initialTab === 'bcra');
  const content = useRef<HTMLDivElement>(null);
  function go(value: string) {
    if (!Object.hasOwn(detailTabs, value)) return;
    if (value === 'bcra') setBcraVisited(true);
    setTab(value as CaseTab);
    if (content.current) content.current.scrollTop = 0;
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="flex max-h-[94dvh] max-w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden bg-background p-0 sm:max-w-5xl">
        <DialogHeader className="space-y-2 border-b border-border bg-card px-4 pt-5 pb-4 text-left sm:px-6">
          <p className={captionStyle}>
            <FolderOpen aria-hidden="true" className="mr-1 inline size-4" />{' '}
            {record.code} {record.source === 'demo' ? '· Datos de muestra' : ''}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <DialogTitle className="font-heading text-2xl leading-tight font-semibold tracking-tight break-words sm:text-3xl">
              {record.name}
            </DialogTitle>
            <Badge variant="secondary">{STAGES[record.stage]}</Badge>
          </div>
          <DialogDescription className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
            <span>Área · {AREA_LABELS[record.area]}</span>
            <span>Segmento · {record.segment}</span>
            <span>
              {record.holders} {record.holders === 1 ? 'titular' : 'titulares'}
            </span>
          </DialogDescription>
        </DialogHeader>
        <Tabs
          value={tab}
          onValueChange={go}
          className="flex min-h-0 flex-1 flex-col gap-0"
        >
          <div className="shrink-0 overflow-x-auto border-b border-border bg-card px-3 sm:px-5">
            <TabsList
              className="h-auto w-max gap-1 rounded-none bg-transparent p-0"
              aria-label="Secciones de la carpeta"
            >
              {Object.entries(detailTabs).map(([value, label]) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="rounded-none border-0 border-b-2 border-transparent px-2.5 py-3 text-xs font-medium text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none sm:text-sm"
                >
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <div
            ref={content}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-5"
          >
            <TabsContent value="evaluacion" className="m-0">
              <CaseEvaluation record={record} go={go} />
            </TabsContent>
            <TabsContent value="power-bi" className="m-0 space-y-4">
              <CasePower record={record} />
              <SourcesFooter go={go} next="bcra" />
            </TabsContent>
            <TabsContent
              forceMount
              value="bcra"
              hidden={tab !== 'bcra'}
              className="m-0 space-y-4 data-[state=inactive]:hidden"
            >
              {bcraVisited && (
                <Suspense
                  fallback={
                    <p role="status" className="text-sm text-muted-foreground">
                      Cargando la vista del BCRA…
                    </p>
                  }
                >
                  <CaseBcra record={record} initialReal={initialReal} />
                </Suspense>
              )}
              <SourcesFooter go={go} next="dictamen" />
            </TabsContent>
            <TabsContent
              forceMount
              value="consultas"
              hidden={tab !== 'consultas'}
              className="m-0 data-[state=inactive]:hidden"
            >
              <CaseQuestions record={record} go={go} />
            </TabsContent>
            <TabsContent
              forceMount
              value="dictamen"
              hidden={tab !== 'dictamen'}
              className="m-0 data-[state=inactive]:hidden"
            >
              <OpinionPanel
                record={record}
                onSaveOpinion={onSaveOpinion}
                go={go}
              />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function SourcesFooter({
  go,
  next,
}: {
  go(tab: CaseTab): void;
  next: 'bcra' | 'dictamen';
}) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button variant="outline" onClick={() => go('evaluacion')}>
        <ArrowLeft className="size-4" /> Evaluación
      </Button>
      <Button onClick={() => go(next)}>
        {next === 'bcra' ? 'Consultar BCRA' : 'Ir al dictamen'}
        <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}
