import { useState, type FormEvent } from 'react';
import { ArrowUp, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { STAGES, type CreditCase } from './cases';
import { captionStyle, sectionStyle, titleStyle } from './case-format';

const prompts = [
  '¿Qué vence esta semana?',
  '¿Qué carpetas están en riesgo?',
  '¿Cuáles van a comisión?',
];

export function PortfolioQueries({
  records,
  week,
  onOpen,
  demo = true,
}: {
  records: CreditCase[];
  week: CreditCase[];
  onOpen: (r: CreditCase, queue: CreditCase[]) => void;
  demo?: boolean;
}) {
  const [text, setText] = useState('');
  const [question, setQuestion] = useState('');
  const normalized = question
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const result = /seman|venc|hito/.test(normalized)
    ? week
    : /riesgo/.test(normalized)
      ? records.filter((r) => r.stage === 1)
      : /comision/.test(normalized)
        ? records.filter((r) => r.stage === 3)
        : null;

  function send(e: FormEvent) {
    e.preventDefault();
    if (text.trim()) {
      setQuestion(text.trim());
      setText('');
    }
  }

  return (
    <Card className={sectionStyle + ' max-w-3xl'}>
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-primary" aria-hidden="true" />
        <p className={captionStyle}>
          {demo ? 'Consultas guiadas · Simulación' : 'Consultas sobre cartera'}
        </p>
      </div>
      <div>
        <h2 className={titleStyle}>Asistente de mesa de crédito</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {demo
            ? 'Explorá la bandeja seleccionada con preguntas guiadas en modo demostración.'
            : 'Las consultas en lenguaje natural sobre modelos de Fabric requieren conectar Fabric IQ. Podés usar los filtros rápidos sobre tus carpetas actuales.'}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {prompts.map((p) => (
          <Button
            key={p}
            variant="outline"
            size="sm"
            onClick={() => setQuestion(p)}
          >
            {p}
          </Button>
        ))}
      </div>

      {question && (
        <div
          className="space-y-2.5 rounded-xl border border-border bg-accent/70 p-4"
          role="status"
        >
          <p className="text-sm font-semibold text-foreground">{question}</p>
          {result ? (
            <>
              <p className="text-xs text-muted-foreground">
                {result.length}{' '}
                {result.length === 1 ? 'carpeta' : 'carpetas'} · Fuente: bandeja
                seleccionada
              </p>
              {result.length > 0 ? (
                <div className="divide-y divide-border rounded-lg border border-border bg-card">
                  {result.map((r) => (
                    <button
                      type="button"
                      key={r.id}
                      onClick={() => onOpen(r, result)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent/60"
                    >
                      <span className="min-w-0">
                        <span className="font-semibold text-foreground">
                          {r.name}
                        </span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {r.code}
                        </span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className={'folio-status s' + r.stage}>
                          {STAGES[r.stage]}
                        </span>
                        <ChevronRight className="size-4 text-muted-foreground" />
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No hay carpetas que coincidan con esa consulta en el área
                  actual.
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Elegí una pregunta sobre vencimientos, riesgo o comisión.
            </p>
          )}
        </div>
      )}

      <form className="flex gap-2" onSubmit={send}>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label="Tu pregunta"
          placeholder="Preguntá por etapas o próximos hitos…"
          maxLength={180}
        />
        <Button
          type="submit"
          size="icon"
          aria-label="Enviar pregunta"
          disabled={!text.trim()}
        >
          <ArrowUp />
        </Button>
      </form>
    </Card>
  );
}
