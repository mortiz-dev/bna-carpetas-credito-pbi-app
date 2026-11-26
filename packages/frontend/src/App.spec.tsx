import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from '@/App';
import { listCases } from './folio/case-store';

vi.mock('./folio/case-store', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./folio/case-store')>()),
  listCases: vi.fn(),
}));

describe('Folio', () => {
  it('filtra los ejemplos por área y abre el seguimiento MiPyME', async () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { name: 'Mesa de crédito' }),
    ).toBeVisible();
    fireEvent.click(
      screen.getByRole('button', { name: 'MiPyMEs' }),
    );
    expect(screen.queryByText('Marea Industrial')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Ver caso resuelto/ }));
    expect(
      await screen.findByText('Del ingreso a la resolución'),
    ).toBeVisible();
  });
  it('distingue una fuente Fabric indisponible de una cartera sin filas', async () => {
    vi.mocked(listCases).mockRejectedValueOnce(
      Object.assign(new Error('HTTP Error 404'), { status: 404 }),
    );
    render(<App />);
    fireEvent.change(screen.getByLabelText('Origen de las carpetas'), {
      target: { value: 'saved' },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'esquema de datos',
    );
    expect(screen.queryByText('Marea Industrial')).toBeNull();
  });
});
