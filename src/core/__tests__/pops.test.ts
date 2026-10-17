import { describe, expect, it, vi } from 'vitest';

import { ConflictError, NotFoundError } from '@/core/domain/errors';
import type { Pop, PopVersion } from '@/core/domain/entities/pop';
import type { User } from '@/core/domain/entities/user';
import type { PopRepository } from '@/core/repositories/pop-repository';
import type { UserRepository } from '@/core/repositories/user-repository';
import type { AuditService } from '@/core/services/audit-service';
import type { HashService } from '@/core/services/hash-service';
import type { SignatureService } from '@/core/services/signature-service';
import type { StorageService } from '@/core/services/storage-service';
import {
  ApprovePopUseCase,
  ChangeRequestUseCases,
  ConfirmReadUseCase,
  CreatePopUseCase,
  GetPopUseCase,
  GetReadReportUseCase,
  ListPopsUseCase,
  NewVersionUseCase,
  PublishPopUseCase,
  RejectPopUseCase,
} from '@/core/use-cases/pops';

const basePop: Pop = {
  id: 'pop-1',
  codigo: 'POP-TEC-001',
  titulo: 'Realização de Assistência Técnica',
  descricao: 'Procedimento mestre',
  setor: 'tecnica',
  versaoAtual: 1,
  periodicidadeRevisaoMeses: 24,
  status: 'rascunho',
  criadoPor: 'u-gestor',
  aprovadoPor: null,
  aprovadoEm: null,
  createdAt: new Date('2026-10-01T10:00:00Z'),
  updatedAt: new Date('2026-10-01T10:00:00Z'),
  deletedAt: null,
};

const baseVersion: PopVersion = {
  id: 'ver-1',
  popId: 'pop-1',
  numeroVersao: 1,
  arquivoUrl: 'data:application/pdf;base64,JVBERi0xLjQK',
  arquivoNome: 'pop-020.pdf',
  arquivoTamanho: 1024,
  hashArquivo: 'abcdef1234567890',
  status: 'vigente',
  publicadoEm: null,
  criadoPor: 'u-gestor',
  createdAt: new Date('2026-10-01T10:00:00Z'),
  deletedAt: null,
};

function makePopRepo(overrides: Partial<PopRepository> = {}): PopRepository {
  return {
    findById: vi.fn().mockResolvedValue(basePop),
    findByCodigo: vi.fn().mockResolvedValue(null),
    list: vi.fn().mockResolvedValue([basePop]),
    listWithDetails: vi.fn().mockResolvedValue([
      {
        ...basePop,
        versaoVigente: baseVersion,
        totalVersoes: 1,
        totalConfirmacoes: 2,
        totalPendentes: 3,
      },
    ]),
    create: vi.fn().mockResolvedValue(basePop),
    update: vi.fn().mockImplementation(async (_id, data) => ({ ...basePop, ...data })),
    softDelete: vi.fn().mockResolvedValue(undefined),
    nextSequentialCode: vi.fn().mockResolvedValue('POP-TEC-001'),
    findVersionById: vi.fn().mockResolvedValue(baseVersion),
    findVersaoVigente: vi.fn().mockResolvedValue(baseVersion),
    listVersions: vi.fn().mockResolvedValue([baseVersion]),
    createVersion: vi.fn().mockResolvedValue(baseVersion),
    markVersionObsolete: vi.fn().mockResolvedValue(undefined),
    publishVersion: vi.fn().mockResolvedValue(undefined),
    countConfirmations: vi.fn().mockResolvedValue(2),
    hasConfirmed: vi.fn().mockResolvedValue(false),
    confirmRead: vi.fn().mockResolvedValue({
      id: 'conf-1',
      popVersionId: 'ver-1',
      userId: 'u-tec',
      confirmadoEm: new Date(),
    }),
    listConfirmations: vi.fn().mockResolvedValue([
      {
        id: 'conf-1',
        popVersionId: 'ver-1',
        userId: 'u-tec-1',
        confirmadoEm: new Date(),
      },
    ]),
    createChangeRequest: vi.fn().mockResolvedValue({
      id: 'cr-1',
      popId: 'pop-1',
      solicitanteId: 'u-tec',
      descricao: 'Incluir item no checklist',
      status: 'pendente',
      respondidoPor: null,
      resposta: null,
      respondidoEm: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    }),
    listChangeRequests: vi.fn().mockResolvedValue([]),
    findChangeRequestById: vi.fn().mockResolvedValue(null),
    updateChangeRequest: vi.fn().mockImplementation(async (_id, data) => ({
      id: 'cr-1',
      popId: 'pop-1',
      solicitanteId: 'u-tec',
      descricao: 'Incluir item no checklist',
      status: data.status ?? 'aprovada',
      respondidoPor: data.respondidoPor ?? 'u-gestor',
      resposta: data.resposta ?? 'Aceito',
      respondidoEm: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    })),
    ...overrides,
  };
}

const mockStorage: StorageService = {
  upload: vi.fn().mockResolvedValue({ url: 'data:application/pdf;base64,AAA', key: 'k1' }),
  read: vi.fn(),
  delete: vi.fn(),
};

const mockHash: HashService = {
  sha256: vi.fn().mockResolvedValue('sha256-hash-mock'),
};

const mockSignature: SignatureService = {
  assinar: vi.fn().mockResolvedValue('sig-sha256-mock'),
};

const mockAudit: AuditService = {
  registrar: vi.fn().mockResolvedValue(undefined),
};

describe('Casos de Uso — Gestão de POPs (Fase 2)', () => {
  it('CreatePopUseCase gera código sequencial, faz upload, calcula hash e cria versão 1', async () => {
    const repo = makePopRepo();
    const uc = new CreatePopUseCase(repo, mockStorage, mockHash, mockAudit);
    const pop = await uc.execute({
      titulo: 'Realização de Assistência Técnica',
      setor: 'tecnica',
      criadoPor: 'u-gestor',
      arquivo: {
        nome: 'pop.pdf',
        tamanho: 500,
        mimeType: 'application/pdf',
        content: new ArrayBuffer(8),
      },
      context: { ip: '127.0.0.1', userAgent: 'Vitest' },
    });

    expect(pop.codigo).toBe('POP-TEC-001');
    expect(repo.createVersion).toHaveBeenCalledOnce();
    expect(mockAudit.registrar).toHaveBeenCalledOnce();
  });

  it('ListPopsUseCase e GetPopUseCase retornam detalhes completos', async () => {
    const repo = makePopRepo();
    const list = await new ListPopsUseCase(repo).execute({ setor: 'tecnica' });
    expect(list).toHaveLength(1);

    const detail = await new GetPopUseCase(repo).execute('pop-1');
    expect(detail.pop.id).toBe('pop-1');
    expect(detail.versaoVigente?.id).toBe('ver-1');

    const repoMissing = makePopRepo({ findById: vi.fn().mockResolvedValue(null) });
    await expect(new GetPopUseCase(repoMissing).execute('404')).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('PublishPopUseCase, ApprovePopUseCase e RejectPopUseCase transitam estados corretamente', async () => {
    const repoRascunho = makePopRepo();
    const pub = await new PublishPopUseCase(repoRascunho, mockAudit).execute(
      'pop-1',
      'u-gestor',
      { ip: '127.0.0.1', userAgent: 'Vitest' },
    );
    expect(pub.status).toBe('aguardando_aprovacao');

    const repoAguardando = makePopRepo({
      findById: vi.fn().mockResolvedValue({ ...basePop, status: 'aguardando_aprovacao' }),
    });
    const approved = await new ApprovePopUseCase(
      repoAguardando,
      mockSignature,
      mockAudit,
    ).execute('pop-1', 'u-diretor', { ip: '127.0.0.1', userAgent: 'Vitest' });
    expect(approved.pop.status).toBe('publicado');
    expect(approved.assinatura).toBe('sig-sha256-mock');

    const rejected = await new RejectPopUseCase(repoAguardando, mockAudit).execute(
      'pop-1',
      'u-diretor',
      'Revisar item 4',
      { ip: '127.0.0.1', userAgent: 'Vitest' },
    );
    expect(rejected.status).toBe('rascunho');

    // Conflito ao rejeitar POP que já está publicado
    const repoPublicado = makePopRepo({
      findById: vi.fn().mockResolvedValue({ ...basePop, status: 'publicado' }),
    });
    await expect(
      new RejectPopUseCase(repoPublicado).execute('pop-1', 'u-diretor', 'Motivo'),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('NewVersionUseCase marca versão anterior como obsoleta e incrementa versão', async () => {
    const repo = makePopRepo();
    const uc = new NewVersionUseCase(repo, mockStorage, mockHash, mockAudit);
    const res = await uc.execute({
      popId: 'pop-1',
      criadoPor: 'u-gestor',
      arquivo: {
        nome: 'pop-v2.pdf',
        tamanho: 600,
        mimeType: 'application/pdf',
        content: new ArrayBuffer(8),
      },
      context: { ip: '127.0.0.1', userAgent: 'Vitest' },
    });

    expect(repo.markVersionObsolete).toHaveBeenCalledWith('ver-1');
    expect(res.pop.versaoAtual).toBe(2);
    expect(res.pop.status).toBe('publicado');
  });

  it('ConfirmReadUseCase, GetReadReportUseCase e ChangeRequestUseCases operam corretamente', async () => {
    const repo = makePopRepo();
    const conf = await new ConfirmReadUseCase(repo, mockAudit).execute('pop-1', 'u-tec-1', {
      ip: '127.0.0.1',
      userAgent: 'Vitest',
    });
    expect(conf.userId).toBe('u-tec');

    const mockUsers: UserRepository = {
      findById: vi.fn(),
      findByEmail: vi.fn(),
      findByCpf: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      list: vi.fn().mockResolvedValue([
        {
          id: 'u-tec-1',
          nomeCompleto: 'Carlos',
          email: 'carlos@regulaon.local',
          cpf: '111.111.111-11',
          senhaHash: 'h',
          perfil: 'tecnico',
          nivel: 'Sênior',
          status: 'ativo',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        } satisfies User,
        {
          id: 'u-tec-2',
          nomeCompleto: 'Rafael',
          email: 'rafael@regulaon.local',
          cpf: '222.222.222-22',
          senhaHash: 'h',
          perfil: 'tecnico',
          nivel: 'Júnior',
          status: 'ativo',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        } satisfies User,
      ]),
    };

    const report = await new GetReadReportUseCase(repo, mockUsers).execute('pop-1');
    expect(report.totalEsperado).toBe(2);
    expect(report.totalConfirmado).toBe(1);
    expect(report.pendentes).toHaveLength(1);

    const crUc = new ChangeRequestUseCases(repo, mockAudit);
    const cr = await crUc.create({
      popId: 'pop-1',
      solicitanteId: 'u-tec-1',
      descricao: 'Sugestão de melhoria',
      context: { ip: '127.0.0.1', userAgent: 'Vitest' },
    });
    expect(cr.status).toBe('pendente');

    const resp = await crUc.respond({
      popId: 'pop-1',
      crId: 'cr-1',
      respondidoPor: 'u-gestor',
      status: 'aprovada',
      resposta: 'Aprovado na revisão 2',
      context: { ip: '127.0.0.1', userAgent: 'Vitest' },
    });
    expect(resp.status).toBe('aprovada');
  });
});
