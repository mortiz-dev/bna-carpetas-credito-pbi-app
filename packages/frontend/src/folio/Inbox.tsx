import { useState } from 'react';
import { Search, ChevronRight, ChevronLeft, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { STAGES, type CreditCase } from './cases';

export type Bucket = 'all' | 'open' | 'week' | 'analysis' | 'committee';
import { dueLabel } from './case-format';
function normalize(s: string) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function Inbox({
  records,
  bucket,
  week,
  onOpen,
  clearBucket,
  demo,
}: {
  records: CreditCase[];
  bucket: Bucket;
  week: CreditCase[];
  onOpen: (c: CreditCase) => void;
  clearBucket: () => void;
  demo: boolean;
}) {
  const [query, setQuery] = useState('');
  const [stage, setStage] = useState('');
  const [segment, setSegment] = useState('');
  const [mine, setMine] = useState(false);
  const [page, setPage] = useState(0);
  const result = records.filter((r) => {
    if (mine && demo && r.owner !== 'Ana Luna') return false;
    if (
      (bucket === 'open' && r.stage === 4) ||
      (bucket === 'week' && !week.includes(r)) ||
      (bucket === 'analysis' && r.stage !== 0) ||
      (bucket === 'committee' && r.stage !== 3)
    )
      return false;
    return (
      (!query ||
        normalize(r.name + ' ' + r.code).includes(normalize(query.trim()))) &&
      (!stage || String(r.stage) === stage) &&
      (!segment || segment === r.segment)
    );
  });
  const max = Math.max(0, Math.ceil(result.length / 6) - 1);
  const current = Math.min(page, max);
  const filterOptions = {
    all: 'Todas',
    open: 'En curso',
    week: 'Próximos 7 días',
    analysis: 'En análisis',
    committee: 'En comisión',
  };
  const first = current * 6;
  return (
    <Card className="folio-inbox gap-0 overflow-hidden py-0">
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-5 pb-4">
        <h2>
          Bandeja de carpetas{' '}
          <span className="folio-count">{result.length}</span>
        </h2>
        {bucket !== 'all' && (
          <Button size="xs" variant="secondary" onClick={clearBucket}>
            {filterOptions[bucket]} ×
          </Button>
        )}
      </div>
      <div className="folio-tools px-5">
        <label className="folio-search">
          <Search size={16} />
          <Input
            type="search"
            placeholder="Buscar empresa o carpeta"
            aria-label="Buscar empresa o carpeta"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
          />
        </label>
        <select
          aria-label="Filtrar por segmento"
          value={segment}
          onChange={(e) => {
            setSegment(e.target.value);
            setPage(0);
          }}
        >
          <option value="">Segmentos</option>
          {['MiPyME', 'Gran empresa', 'Cooperativa'].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <select
          aria-label="Filtrar por etapa"
          value={stage}
          onChange={(e) => {
            setStage(e.target.value);
            setPage(0);
          }}
        >
          <option value="">Etapas</option>
          {STAGES.map((v, i) => (
            <option key={v} value={i}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <div className="folio-scope">
        {(demo ? [false, true] : [false]).map((v) => (
          <button
            key={String(v)}
            aria-pressed={mine === v}
            onClick={() => {
              setMine(v);
              setPage(0);
            }}
          >
            {v ? 'Mis asignadas' : demo ? 'Todas las carpetas' : 'Mis carpetas'}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="folio-table">
          <thead>
            <tr>
              <th>Empresa / carpeta</th>
              <th className="folio-segment">Segmento</th>
              <th>Etapa</th>
              <th className="folio-due">Próximo hito</th>
              <th>
                <span className="sr-only">Abrir ficha</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {result.slice(first, first + 6).map((r, i) => (
              <tr key={r.id} onClick={() => onOpen(r)}>
                <td>
                  <button
                    className="folio-client"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen(r);
                    }}
                  >
                    <span
                      className={'folio-initial i' + (i % 4)}
                      aria-hidden="true"
                    >
                      {r.name
                        .split(/\s+/)
                        .filter((w) => w.length > 2)
                        .slice(0, 2)
                        .map((w) => w[0])
                        .join('')
                        .toUpperCase()}
                    </span>
                    <span>
                      {r.name}
                      <small>{r.code}</small>
                    </span>
                  </button>
                </td>
                <td className="folio-segment">{r.segment}</td>
                <td>
                  <span className={'folio-status s' + r.stage}>
                    {STAGES[r.stage]}
                  </span>
                </td>
                <td className="folio-due">
                  {r.dueDate ? dueLabel(r.dueDate) : '—'}
                </td>
                <td>
                  <ChevronRight size={15} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!result.length && (
        <div className="p-8 text-center text-sm text-muted-foreground">
          <FolderOpen className="mx-auto mb-2" />
          {records.length
            ? 'Ninguna carpeta coincide con estos filtros.'
            : 'Todavía no hay carpetas en esta vista.'}
        </div>
      )}
      <div className="flex items-center justify-between border-t px-5 py-3 text-xs text-muted-foreground">
        <span>
          {result.length
            ? first +
              1 +
              '–' +
              Math.min(first + 6, result.length) +
              ' de ' +
              result.length
            : 0}{' '}
          carpetas
        </span>
        <div className="flex gap-1">
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
      </div>
    </Card>
  );
}
