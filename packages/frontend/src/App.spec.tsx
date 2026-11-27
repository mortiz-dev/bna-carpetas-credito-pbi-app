import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from '@/App';
import { listCases } from './folio/case-store';

vi.mock('./folio/case-store', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./folio/case-store')>()),
  listCases: vi.fn(),
}));

describe('Folio', () => {
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
        name: 'Mis carpetas · Fabric',
      }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'esquema de datos',
    );
    expect(screen.queryByText('Marea Industrial')).toBeNull();
  });
});
