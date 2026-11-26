import { useState, type FormEvent } from 'react';
import { Sparkles, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { type CreditCase } from './cases';

const prompts = [
  '¿Qué vence esta semana?',
  '¿Qué carpetas están en riesgo?',
  '¿Cuáles van a comisión?',
];

export function PortfolioQueries({
  records,
  week,
  onOpen,
}: {
  records: CreditCase[];
  week: CreditCase[];
  onOpen: (r: CreditCase) => void;
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
    <Card className="max-w-3xl gap-4 p-6">
      <div className="flex items-center gap-2 text-primary">
        <Sparkles size={20} />
        <h2>Consultas guiadas</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Explorá la bandeja seleccionada con preguntas de ejemplo. El asistente
        funciona en modo de demostración.
      </p>
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
        <div className="rounded-xl bg-secondary p-4" role="status">
          <strong>{question}</strong>
          {result ? (
            <>
              <p className="my-2 text-sm">
                {result.length} carpetas · Fuente: bandeja seleccionada
              </p>
              <div className="grid gap-1">
                {result.map((r) => (
                  <button
                    className="text-left text-sm text-primary underline"
                    key={r.id}
                    onClick={() => onOpen(r)}
                  >
                    {r.name} · {r.code}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm">
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
