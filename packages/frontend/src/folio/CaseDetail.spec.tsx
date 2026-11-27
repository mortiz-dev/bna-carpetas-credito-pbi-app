import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CaseDetail } from './CaseDetail';
import { sampleCases, type CreditCase } from './cases';

vi.mock('./case-bcra', () => ({
  CaseBcra: () => <h3>Antecedentes por titular</h3>,
}));

afterEach(cleanup);

describe('Ficha de carpeta (Split Workbench)', () => {
  it('mantiene visible y conserva el borrador del dictamen mientras el analista revisa Power BI y BCRA y permite reintentar el guardado', async () => {
    const record = sampleCases.find((r) => r.code === 'CR-26082')!;
    const save = vi
      .fn()
      .mockRejectedValueOnce(new Error('Error de prueba'))
      .mockResolvedValueOnce(undefined);
    render(
      <CaseDetail
        record={record}
        queue={sampleCases}
        onNavigate={vi.fn()}
        onClose={vi.fn()}
        onSaveOpinion={save}
        onSaveTracking={vi.fn()}
      />,
    );

    expect(screen.getByText('ARS 12 M menos')).toBeInTheDocument();

    // Dictamen panel is persistently visible alongside evidence
    const opinion = screen.getByRole('form', { name: 'Dictamen del analista' });
    fireEvent.click(
      within(opinion).getByRole('radio', { name: 'Con condiciones' }),
    );
    fireEvent.change(within(opinion).getByRole('textbox'), {
      target: { value: 'Revisar el aval.' },
    });

    // Switch evidence tabs on the left while opinion stays visible on the right
    fireEvent.click(
      screen.getByRole('button', { name: 'Abrir fuente: Power BI' }),
    );
    expect(within(opinion).getByRole('textbox')).toHaveValue(
      'Revisar el aval.',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Consultar BCRA' }));
    expect(
      await screen.findByRole('heading', { name: 'Antecedentes por titular' }),
    ).toBeInTheDocument();
    expect(within(opinion).getByRole('textbox')).toHaveValue(
      'Revisar el aval.',
    );

    fireEvent.submit(opinion);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Error de prueba',
    );
    fireEvent.submit(opinion);
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    expect(save).toHaveBeenLastCalledWith(record, {
      choice: 'Acompañar con condiciones',
      note: 'Revisar el aval.',
    });
  });

  it('usa únicamente los hitos registrados en una carpeta propia de MiPyMEs', () => {
    const record: CreditCase = {
      id: 'uuid',
      code: 'CR-1',
      name: 'Carpeta registrada',
      area: 'py',
      segment: 'Cooperativa',
      stage: 0,
      holders: 1,
      source: 'saved',
      owner: 'Analista',
      createdOn: '2026-10-05',
      dueDate: null,
      event: '',
      limit: null,
      used: null,
      opinion: null,
    };
    render(
      <CaseDetail
        record={record}
        onClose={vi.fn()}
        onSaveOpinion={vi.fn()}
        onSaveTracking={vi.fn()}
      />,
    );
    const overview = screen.getByRole('tabpanel', { name: 'Evaluación' });
    expect(
      within(overview).getByText('Del ingreso a la resolución'),
    ).toBeInTheDocument();
    expect(within(overview).getAllByText('Sin registro')).toHaveLength(4);
    expect(
      within(overview).queryByText('Comparación de propuestas'),
    ).not.toBeInTheDocument();
    expect(
      within(overview).queryByText('TERMINADO', { exact: true }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      within(overview).getByRole('button', { name: 'Abrir fuente: Power BI' }),
    );
    expect(
      screen.getByText(/Falta vincular el modelo semántico/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Corte al 31 oct 2026/)).not.toBeInTheDocument();
  });
});
