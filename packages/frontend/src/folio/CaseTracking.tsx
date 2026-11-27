import { useState, type FormEvent, type ReactNode } from 'react';
import { CheckCircle2 } from 'lucide-react';
import {
  INSTANCES,
  OUTCOMES,
  OUTCOME_LABELS,
  SEGMENTS,
  SUB_STATUSES,
  subStatusFor,
  type CreditInstance,
  type CreditOutcome,
} from '@rayfin-app/shared';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AREA_LABELS, STAGES, type CreditCase, type TrackingInput } from './cases';
import { caseErrorMessage } from './case-store';
import { captionStyle, sectionStyle, titleStyle } from './case-format';

/** Render with `key={record.id}` so the draft resets when another case opens. */
interface Props {
  record: CreditCase;
  onSave(record: CreditCase, input: TrackingInput): Promise<void>;
}

const GUARANTEES = [
  'A sola firma',
  'Con aval',
  'Con garantía prendaria',
  'Con hipoteca',
  'Cheques',
  'Tarjetas',
  'Preferida A',
  'Otras garantías',
];

const MILESTONES: Array<[keyof TrackingInput, string]> = [
  ['riskSentAt', 'Envío a Riesgo'],
  ['riskReturnedAt', 'Devolución de Riesgo'],
  ['legalSentAt', 'Envío a Legales'],
  ['legalOpinionAt', 'Dictamen legal'],
  ['committeeAt', 'Comisión'],
  ['resolvedAt', 'Resolución'],
  ['ratingDueAt', 'Vencimiento de calificación'],
];

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="grid gap-3 border-t border-border pt-4 first:border-t-0 first:pt-0">
      <legend className="mb-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

const numberOrNull = (value: string) =>
  value.trim() === '' ? null : Number(value.replace(',', '.'));

export function CaseTracking({ record, onSave }: Props) {
  const initial = record.tracking;
  const [draft, setDraft] = useState<TrackingInput | null>(initial ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  if (!draft || !initial) {
    return (
      <Card className={sectionStyle}>
        <p className={captionStyle}>Seguimiento</p>
        <h3 className={titleStyle}>Datos de muestra</h3>
        <p className="text-sm text-muted-foreground">
          El seguimiento se edita en las carpetas guardadas en Fabric. Creá una
          carpeta nueva para registrar estado, fechas y propuestas.
        </p>
      </Card>
    );
  }

  const status = subStatusFor(record.area, draft.subStatus);
  const needsOutcome = status?.stage === 4 && !status.outcome;

  function set<K extends keyof TrackingInput>(key: K, value: TrackingInput[K]) {
    setDraft((previous) => (previous ? { ...previous, [key]: value } : previous));
    setSaved(false);
    setError('');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !draft) return;
    setBusy(true);
    setError('');
    try {
      await onSave(record, draft);
      setSaved(true);
    } catch (cause) {
      setError(caseErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className={sectionStyle}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className={captionStyle}>Seguimiento · {AREA_LABELS[record.area]}</p>
          <h3 className={titleStyle}>Estado, fechas y propuesta</h3>
        </div>
        {initial.updatedTime && (
          <span className="text-xs text-muted-foreground">
            Actualizado {initial.updatedTime} · {initial.updatedBy}
          </span>
        )}
      </div>

      <form className="folio-form" onSubmit={submit} aria-label="Seguimiento de la carpeta">
        <fieldset disabled={busy} className="grid gap-5">
          <Group title="Estado">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label>
                Estado en el área
                <select
                  className="folio-select"
                  value={draft.subStatus}
                  onChange={(e) => set('subStatus', e.target.value)}
                >
                  {SUB_STATUSES[record.area].map((option) => (
                    <option key={option.label} value={option.label}>
                      {option.label} · {STAGES[option.stage]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Instancia de aprobación
                <select
                  className="folio-select"
                  value={draft.instance ?? ''}
                  onChange={(e) =>
                    set('instance', (e.target.value || null) as CreditInstance | null)
                  }
                >
                  <option value="">Sin definir</option>
                  {INSTANCES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              {needsOutcome && (
                <label>
                  Resultado
                  <select
                    className="folio-select"
                    value={draft.outcome ?? ''}
                    required
                    onChange={(e) =>
                      set('outcome', (e.target.value || null) as CreditOutcome | null)
                    }
                  >
                    <option value="">Elegí un resultado</option>
                    {OUTCOMES.filter((o) => o !== 'stand_by').map((option) => (
                      <option key={option} value={option}>
                        {OUTCOME_LABELS[option]}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="!flex items-center gap-2 self-end pb-2">
                <input
                  type="checkbox"
                  checked={draft.reentry}
                  onChange={(e) => set('reentry', e.target.checked)}
                  className="size-4 accent-primary"
                />
                Reingreso o reconsideración
              </label>
            </div>
          </Group>

          <Group title="Asignación y origen">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label>
                {record.area === 'ge' ? 'Oficial de crédito (OC)' : 'Equipo / analista'}
                <Input
                  value={draft.responsible}
                  maxLength={80}
                  onChange={(e) => set('responsible', e.target.value)}
                />
              </label>
              <label>
                Fecha de ingreso a Crédito
                <Input
                  type="date"
                  value={draft.entryDate ?? ''}
                  onChange={(e) => set('entryDate', e.target.value || null)}
                />
              </label>
              <label>
                Zonal
                <Input
                  value={draft.zonal}
                  maxLength={60}
                  onChange={(e) => set('zonal', e.target.value)}
                />
              </label>
              <label>
                Sucursal
                <Input
                  value={draft.branch}
                  maxLength={60}
                  onChange={(e) => set('branch', e.target.value)}
                />
              </label>
              <label>
                Segmento
                <select
                  className="folio-select"
                  value={draft.segment}
                  onChange={(e) => set('segment', e.target.value)}
                >
                  {SEGMENTS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Cantidad de titulares
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={draft.holders}
                  onChange={(e) => set('holders', Number(e.target.value))}
                />
              </label>
            </div>
          </Group>

          <Group title="Fechas del circuito">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {MILESTONES.map(([key, label]) => (
                <label key={key}>
                  {label}
                  <Input
                    type="date"
                    value={(draft[key] as string | null) ?? ''}
                    onChange={(e) =>
                      set(key, (e.target.value || null) as TrackingInput[typeof key])
                    }
                  />
                </label>
              ))}
            </div>
          </Group>

          <Group title="Propuesta de riesgo (millones de ARS)">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(
                [
                  ['zonal', 'Gerencia Zonal'],
                  ['credit', 'Área de Crédito'],
                ] as const
              ).map(([side, label]) => (
                <div key={side} className="grid gap-2 rounded-xl border border-border bg-background p-3">
                  <span className="text-xs font-semibold">{label}</span>
                  <label>
                    Importe
                    <Input
                      inputMode="decimal"
                      value={draft[`${side}Amount`] ?? ''}
                      onChange={(e) => set(`${side}Amount`, numberOrNull(e.target.value))}
                    />
                  </label>
                  <label>
                    Plazo (meses)
                    <Input
                      type="number"
                      min={1}
                      max={360}
                      value={draft[`${side}Months`] ?? ''}
                      onChange={(e) => set(`${side}Months`, numberOrNull(e.target.value))}
                    />
                  </label>
                  <label>
                    Garantía
                    <Input
                      list="folio-guarantees"
                      maxLength={60}
                      value={draft[`${side}Guarantee`]}
                      onChange={(e) => set(`${side}Guarantee`, e.target.value)}
                    />
                  </label>
                </div>
              ))}
              <datalist id="folio-guarantees">
                {GUARANTEES.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            </div>
          </Group>

          <Group title="Observaciones">
            <Textarea
              aria-label="Observaciones"
              rows={4}
              maxLength={2000}
              value={draft.followUpNote}
              onChange={(e) => set('followUpNote', e.target.value)}
              className="resize-y bg-background text-sm font-normal"
            />
            <span className="text-right text-xs text-muted-foreground tabular-nums">
              {draft.followUpNote.length} / 2000
            </span>
          </Group>
        </fieldset>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-end gap-3">
          {saved && !busy && (
            <span role="status" className="inline-flex items-center gap-1 text-xs font-medium text-success">
              <CheckCircle2 className="size-3.5" aria-hidden="true" /> Seguimiento guardado
            </span>
          )}
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => {
              setDraft(initial);
              setError('');
              setSaved(false);
            }}
          >
            Descartar cambios
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Guardando…' : 'Guardar seguimiento'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
