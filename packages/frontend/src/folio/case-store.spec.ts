import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createCase,
  listCases,
  saveOpinion,
  updateTracking,
} from './case-store';

const getClient = vi.hoisted(() => vi.fn());
vi.mock('@/lib/rayfin-client', () => ({ getRayfinClient: getClient }));

const session = {
  isAuthenticated: true,
  isAnonymous: false,
  user: { id: 'subject', email: 'analista@example.test' },
};
const row = {
  id: '81fbe898-2839-422f-a5e3-bbc39ecf19ad',
  company: 'Carpeta de prueba',
  createdAt: '2026-11-27T01:30:00.000Z',
  area: 'ge',
  segment: 'MiPyME',
  holderCount: 2,
};
const files = {
  create: vi.fn(),
  update: vi.fn(),
  select: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  first: vi.fn().mockReturnThis(),
  after: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  executePaginated: vi.fn(),
  findFirst: vi.fn(),
};

describe('carpetas guardadas en Fabric', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getClient.mockResolvedValue({
      auth: { getSession: () => session },
      data: { CreditFile: files },
    });
  });

  it('uses the session subject and preserves the distinction between the area and the customer segment', async () => {
    files.create.mockImplementation(async (input) => ({
      ...row,
      ...input,
      createdAt: row.createdAt,
    }));
    const saved = await createCase({
      name: '  Carpeta de prueba  ',
      area: 'ge',
      segment: 'MiPyME',
      holders: 2,
      entryDate: '2026-11-26',
    });
    expect(files.create).toHaveBeenCalledWith(
      expect.objectContaining({
        company: row.company,
        owner_id: 'subject',
        createdBy: session.user.email,
        stage: 0,
        subStatus: 'Pendiente en el área',
        area: 'ge',
        segment: 'MiPyME',
        holderCount: 2,
      }),
    );
    expect(saved).toMatchObject({
      createdOn: '2026-11-26',
      source: 'saved',
      opinion: null,
      limit: null,
    });
  });

  it('rejects an invalid primary CUIT before acquiring a client', async () => {
    await expect(
      createCase({
        name: 'Prueba',
        area: 'py',
        segment: 'MiPyME',
        holders: 1,
        cuit: '111',
      }),
    ).rejects.toThrow('CUIT');
    expect(getClient).not.toHaveBeenCalled();
  });

  it('returns a complete list and reports a broken cursor instead of showing partial data', async () => {
    files.executePaginated
      .mockResolvedValueOnce({
        items: [row],
        hasNextPage: true,
        endCursor: 'page2',
      })
      .mockResolvedValueOnce({
        items: [{ ...row, id: 'next' }],
        hasNextPage: false,
      });
    expect((await listCases()).map((file) => file.id)).toEqual([
      row.id,
      'next',
    ]);
    expect(files.after).toHaveBeenCalledWith('page2');
    files.executePaginated.mockResolvedValueOnce({
      items: [row],
      hasNextPage: true,
      endCursor: null,
    });
    await expect(listCases()).rejects.toThrow('incompleta');
  });

  it('writes one signed opinion and keeps the case fields omitted by the update response', async () => {
    files.findFirst.mockResolvedValueOnce(row);
    files.update.mockImplementationOnce(async ({ id }, input) => ({
      id,
      ...input,
    }));
    const saved = await saveOpinion(row.id, {
      choice: 'Solicitar información',
      note: '  Falta el aval.  ',
    });
    expect(files.update).toHaveBeenCalledTimes(1);
    expect(saved).toMatchObject({
      id: row.id,
      name: row.company,
      source: 'saved',
      opinion: {
        choice: 'Solicitar información',
        note: 'Falta el aval.',
        author: session.user.email,
      },
    });
  });

  it('propagates backend rejection without reporting a registered opinion', async () => {
    files.findFirst.mockResolvedValueOnce(row);
    files.update.mockRejectedValueOnce(new Error('Servicio no disponible'));
    await expect(
      saveOpinion(row.id, {
        choice: 'Solicitar información',
        note: 'Falta el aval.',
      }),
    ).rejects.toThrow('Servicio no disponible');
  });
  it('shows legacy rows from other users with their own creator, not the viewer', async () => {
    files.executePaginated.mockResolvedValueOnce({
      items: [{ ...row, createdBy: 'otra@example.test' }],
      hasNextPage: false,
    });
    const [file] = await listCases();
    expect(file).toMatchObject({
      stage: 0,
      owner: 'otra@example.test',
      tracking: { subStatus: 'Pendiente en el área', createdBy: 'otra@example.test' },
    });
  });

  it('derives the common stage from the area status and stores business dates as Argentine days', async () => {
    files.findFirst.mockResolvedValueOnce(row);
    files.update.mockImplementationOnce(async ({ id }, input) => ({ id, ...input }));
    const [base] = await (async () => {
      files.executePaginated.mockResolvedValueOnce({ items: [row], hasNextPage: false });
      return listCases();
    })();
    const saved = await updateTracking(row.id, 'ge', {
      ...base.tracking!,
      subStatus: 'Próximo comité GG',
      instance: 'GG',
      committeeAt: '2026-12-03',
      ratingDueAt: '2027-01-15',
      zonalAmount: 60,
      creditAmount: 48,
      zonalMonths: 12,
      creditMonths: null,
      zonalGuarantee: 'A sola firma',
      creditGuarantee: '',
    });
    const [, changes] = files.update.mock.calls[0];
    expect(changes).toMatchObject({
      stage: 3,
      outcome: null,
      instance: 'GG',
      updatedBy: session.user.email,
      creditGuarantee: null,
    });
    expect(changes.committeeAt.toISOString()).toBe('2026-12-03T12:00:00.000Z');
    expect(saved).toMatchObject({
      stage: 3,
      dueDate: '2026-12-03',
      event: 'Comisión de crédito',
      proposal: { zonal: 60, credit: 48, zMonths: 12, cMonths: null },
    });
  });

  it('requires an outcome before a case can be resolved, without calling Fabric', async () => {
    files.executePaginated.mockResolvedValueOnce({ items: [{ ...row, area: 'py' }], hasNextPage: false });
    const [base] = await listCases();
    getClient.mockClear();
    await expect(
      updateTracking(row.id, 'py', { ...base.tracking!, subStatus: 'Terminada', outcome: null }),
    ).rejects.toThrow('aprobada o devuelta');
    await expect(
      updateTracking(row.id, 'py', { ...base.tracking!, committeeAt: '2026-02-30' }),
    ).rejects.toThrow('no existe');
    expect(getClient).not.toHaveBeenCalled();
    expect(files.update).not.toHaveBeenCalled();
  });
});
