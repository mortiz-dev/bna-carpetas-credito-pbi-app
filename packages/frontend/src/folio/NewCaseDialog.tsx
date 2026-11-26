import { useState, type FormEvent } from 'react';
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
import { AREA_LABELS, type Area, type NewCaseInput } from './cases';

import { caseErrorMessage } from './case-store';

interface Props {
  initialArea: Area;
  onClose: () => void;
  onCreate: (values: NewCaseInput) => Promise<void>;
}

export function NewCaseDialog({ initialArea, onClose, onCreate }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const fields = new FormData(event.currentTarget);
    setError('');
    setBusy(true);
    try {
      await onCreate({
        name: String(fields.get('name')).trim(),
        area: fields.get('area') as Area,
        segment: String(fields.get('segment')),
        holders: Number(fields.get('holders')),
        cuit: String(fields.get('cuit')).trim() || undefined,
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
      <DialogContent showCloseButton={!busy}>
        <DialogHeader>
          <DialogTitle>Nueva carpeta</DialogTitle>
          <DialogDescription>
            Se guardará en tus carpetas de Fabric con tu usuario.
          </DialogDescription>
        </DialogHeader>
        <form className="folio-form" onSubmit={submit}>
          <fieldset disabled={busy} className="grid gap-4">
            <label>
              Empresa o razón social
              <Input name="name" maxLength={160} required autoFocus />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label>
                Área responsable
                <select name="area" defaultValue={initialArea}>
                  <option value="py">{AREA_LABELS.py}</option>
                  <option value="ge">{AREA_LABELS.ge}</option>
                </select>
              </label>
              <label>
                Segmento
                <select
                  name="segment"
                  defaultValue={
                    initialArea === 'ge' ? 'Gran empresa' : 'MiPyME'
                  }
                >
                  <option>MiPyME</option>
                  <option>Gran empresa</option>
                  <option>Cooperativa</option>
                </select>
              </label>
            </div>
            <label>
              Cantidad de titulares
              <Input
                name="holders"
                type="number"
                min={1}
                max={5}
                defaultValue={1}
                required
              />
            </label>
            <label>
              CUIT del titular principal (opcional)
              <Input
                name="cuit"
                inputMode="numeric"
                maxLength={16}
                placeholder="11 dígitos"
              />
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
            <Button disabled={busy}>
              {busy ? 'Guardando…' : 'Crear carpeta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
