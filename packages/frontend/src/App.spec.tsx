import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import App from '@/App';
import { sampleCases, type CreditCase } from './folio/cases';
import { listCases } from './folio/case-store';

vi.mock('./folio/case-store', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./folio/case-store')>()),
  listCases: vi.fn(),
}));

afterEach(() => {
  vi.mocked(listCases).mockReset();
  window.history.replaceState(null, '', window.location.pathname);
});

describe('Folio', () => {
  it('conserva la búsqueda, el segmento y Mis asignadas al volver del expediente', () => {
    render(<App />);
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'Linar' },
    });
    fireEvent.change(
      screen.getByRole('combobox', { name: 'Filtrar por segmento' }),
      {
        target: { value: 'MiPyME' },
      },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Mis asignadas' }));
    fireEvent.click(
      within(screen.getByRole('table')).getByRole('button', {
        name: /Linar del Sur/,
      }),
    );

    const detail = screen.getByRole('article', {
      name: 'Expediente de Linar del Sur',
    });
    expect(screen.queryByRole('searchbox')).toBeNull();
    fireEvent.click(
      within(detail).getByRole('button', { name: 'Mesa de crédito' }),
    );
    expect(screen.getByRole('searchbox')).toHaveValue('Linar');
    expect(screen.getByRole('combobox')).toHaveValue('MiPyME');
    expect(
      screen.getByRole('button', { name: 'Mis asignadas' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('conserva la página y reabre la carpeta de Fabric desde su URL', async () => {
    const rows: CreditCase[] = Array.from({ length: 13 }, (_, index) => ({
      ...sampleCases[0],
      source: 'saved',
      id: crypto.randomUUID(),
      name: `Empresa guardada ${index + 1}`,
    }));
    vi.mocked(listCases).mockResolvedValue(rows);
    const { unmount } = render(<App />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Carpetas · Fabric' }),
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Página siguiente' }),
    );
    const openLast = () =>
      fireEvent.click(
        screen.getByRole('button', { name: /Empresa guardada 13/ }),
      );
    openLast();
    fireEvent.click(
      within(screen.getByRole('article')).getByRole('button', {
        name: 'Mesa de crédito',
      }),
    );
    expect(screen.getByText('13–13 de 13 carpetas')).toBeVisible();
    openLast();
    expect(location.hash).toBe('#' + rows[12].id);
    unmount();

    vi.mocked(listCases).mockRejectedValueOnce(
      new Error('Fabric indisponible'),
    );
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Fabric indisponible',
    );
    expect(location.hash).toBe('#' + rows[12].id);
    fireEvent.click(
      screen.getByRole('button', { name: 'Volver a consultar Fabric' }),
    );
    expect(
      await screen.findByRole('article', {
        name: 'Expediente de Empresa guardada 13',
      }),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Carpetas · Fabric' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('filtra los ejemplos por área, alterna a pipeline y abre el seguimiento MiPyME', async () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { name: 'Mesa de crédito' }),
    ).toBeVisible();

    const areaGroup = screen.getByRole('group', { name: 'Área de trabajo' });
    fireEvent.click(within(areaGroup).getByRole('button', { name: 'MiPyMEs' }));
    expect(screen.queryByText('Marea Industrial')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Pipeline' }));
    expect(screen.getByText('Linar del Sur')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Lista' }));

    fireEvent.click(screen.getByRole('button', { name: /Ver caso resuelto/ }));
    expect(
      await screen.findByText('Del ingreso a la resolución'),
    ).toBeVisible();
    expect(
      screen.getByRole('article', { name: 'Expediente de Prisma Talleres' }),
    ).toBeVisible();
  });

  it('distingue una fuente Fabric indisponible de una cartera sin filas', async () => {
    vi.mocked(listCases).mockRejectedValueOnce(
      Object.assign(new Error('HTTP Error 404'), { status: 404 }),
    );
    render(<App />);
    const sourceGroup = screen.getByRole('group', {
      name: 'Origen de las carpetas',
    });
    fireEvent.click(
      within(sourceGroup).getByRole('button', {
        name: 'Carpetas · Fabric',
      }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'esquema de datos',
    );
    expect(screen.queryByText('Marea Industrial')).toBeNull();
  });
});
