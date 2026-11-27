import { useState, type FormEvent } from 'react';
import { AlertCircle, CheckCircle2, Minus, Plus } from 'lucide-react';
import { normalizeCuit } from '@rayfin-app/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { AREA_LABELS, type Area, type NewCaseInput } from './cases';
import { formatCuitDisplay } from './case-format';
import { caseErrorMessage } from './case-store';

interface Props {
  initialArea: Area;
  onClose: () => void;
  onCreate: (values: NewCaseInput) => Promise<void>;
}

const SEGMENTS = ['MiPyME', 'Gran empresa', 'Cooperativa'] as const;

export function NewCaseDialog({ initialArea, onClose, onCreate }: Props) {
  const [name, setName] = useState('');
  const [area, setArea] = useState<Area>(initialArea);
  const [segment, setSegment] = useState<string>(
    initialArea === 'ge' ? 'Gran empresa' : 'MiPyME',
  );
  const [holders, setHolders] = useState(1);
  const [cuit, setCuit] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const cuitDigits = cuit.replace(/\D/g, '');
  const cuitValid = cuitDigits.length === 11 && normalizeCuit(cuit) !== null;
  const cuitInvalid = cuitDigits.length === 11 && !cuitValid;

  function selectArea(next: Area) {
    setArea(next);
    if (segment !== 'Cooperativa') {
      setSegment(next === 'ge' ? 'Gran empresa' : 'MiPyME');
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (cuit.trim() && !normalizeCuit(cuit)) {
      setError('Revisá los 11 dígitos y el verificador del CUIT.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await onCreate({
        name: name.trim(),
        area,
        segment,
        holders,
        cuit: cuit.trim() || undefined,
      });
    } catch (cause) {
      setError(caseErrorMessage(cause));
      setBusy(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent showCloseButton={!busy} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">
            Nueva carpeta de crédito
          </DialogTitle>
          <DialogDescription>
            Se guardará en tus carpetas de Fabric asociada a tu usuario.
          </DialogDescription>
        </DialogHeader>
        <form className="folio-form" onSubmit={submit}>
          <fieldset disabled={busy} className="grid gap-4">
            <label>
              Empresa o razón social
              <Input
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Molinos del Litoral S.A."
                maxLength={160}
                required
                autoFocus
              />
            </label>

            <div className="grid gap-1.5">
              <span className="text-[13px] font-semibold">
                Área responsable
              </span>
              <div
                className="grid grid-cols-2 gap-2"
                role="group"
                aria-label="Área responsable"
              >
                {(['py', 'ge'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={area === option}
                    onClick={() => selectArea(option)}
                    className={cn(
                      'rounded-lg border px-3 py-2 text-left text-xs font-semibold transition-colors',
                      area === option
                        ? 'border-primary bg-secondary text-secondary-foreground'
                        : 'border-input bg-card text-foreground hover:bg-accent',
                    )}
                  >
                    {AREA_LABELS[option]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label>
                Segmento
                <select
                  name="segment"
                  className="folio-select"
                  value={segment}
                  onChange={(e) => setSegment(e.target.value)}
                >
                  {SEGMENTS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-1.5">
                <span className="text-[13px] font-semibold">
                  Cantidad de titulares
                </span>
                <div className="flex h-9 items-center justify-between rounded-lg border border-input bg-card px-2">
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    aria-label="Restar titular"
                    disabled={holders <= 1}
                    onClick={() => setHolders((h) => Math.max(1, h - 1))}
                  >
                    <Minus />
                  </Button>
                  <span
                    className="text-sm font-semibold tabular-nums"
                    aria-live="polite"
                  >
                    {holders} {holders === 1 ? 'titular' : 'titulares'}
                  </span>
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    aria-label="Sumar titular"
                    disabled={holders >= 5}
                    onClick={() => setHolders((h) => Math.min(5, h + 1))}
                  >
                    <Plus />
                  </Button>
                </div>
              </div>
            </div>

            <label>
              <span>
                CUIT del titular principal{' '}
                <span className="font-normal text-muted-foreground">
                  (opcional)
                </span>
              </span>
              <Input
                name="cuit"
                value={cuit}
                onChange={(e) => {
                  setCuit(formatCuitDisplay(e.target.value));
                  setError('');
                }}
                inputMode="numeric"
                maxLength={13}
                className="font-mono tabular-nums"
                placeholder="XX-XXXXXXXX-X"
              />
              {cuitValid && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                  <CheckCircle2 className="size-3.5" aria-hidden="true" /> CUIT
                  válido · quedará precargado en BCRA
                </span>
              )}
              {cuitInvalid && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                  <AlertCircle className="size-3.5" aria-hidden="true" /> El
                  dígito verificador no coincide
                </span>
              )}
            </label>
          </fieldset>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={busy}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={busy || cuitInvalid}>
              {busy ? 'Guardando…' : 'Crear carpeta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
