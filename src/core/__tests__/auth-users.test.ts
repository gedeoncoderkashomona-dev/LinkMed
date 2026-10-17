import { describe, expect, it, vi } from 'vitest';

import {
  AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '@/core/domain/errors';
import { toPublicUser, type User } from '@/core/domain/entities/user';
import { PERFIL_LABEL, PERFIS } from '@/core/domain/enums/user';
import { AUDIT_ACTIONS } from '@/core/domain/enums/audit';
import { POP_STATUS_LABEL, SETORES } from '@/core/domain/enums/pop';
import { NC_ORIGENS, NC_SEVERIDADES, NC_STATUS } from '@/core/domain/entities/operacional';
import type { UserRepository } from '@/core/repositories/user-repository';
import type { PasswordService } from '@/core/services/password-service';
import type { TokenService } from '@/core/services/token-service';
import { LoginUseCase } from '@/core/use-cases/auth/login';
import { RefreshUseCase } from '@/core/use-cases/auth/refresh';
import { GetCurrentUserUseCase } from '@/core/use-cases/auth/get-current-user';
import { CreateUserUseCase } from '@/core/use-cases/users/create-user';
import { ListUsersUseCase } from '@/core/use-cases/users/list-users';

const mockUser: User = {
  id: 'u-1',
  nomeCompleto: 'Pedro Costa',
  email: 'diretor@regulaon.local',
  cpf: '111.111.111-11',
  senhaHash: 'hashed-pw',
  perfil: 'diretor',
  nivel: null,
  status: 'ativo',
  createdAt: new Date('2026-10-01T10:00:00Z'),
  updatedAt: new Date('2026-10-01T10:00:00Z'),
  deletedAt: null,
};

function makeUserRepo(overrides: Partial<UserRepository> = {}): UserRepository {
  return {
    findById: vi.fn().mockResolvedValue(mockUser),
    findByEmail: vi.fn().mockResolvedValue(mockUser),
    findByCpf: vi.fn().mockResolvedValue(null),
    list: vi.fn().mockResolvedValue([mockUser]),
    create: vi.fn().mockImplementation(async (input) => ({
      ...mockUser,
      id: 'u-new',
      ...input,
      status: input.status ?? 'ativo',
    })),
    update: vi.fn().mockResolvedValue(mockUser),
    softDelete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

const mockPasswords: PasswordService = {
  hash: vi.fn().mockResolvedValue('hashed-new'),
  compare: vi.fn().mockResolvedValue(true),
};

const mockTokens: TokenService = {
  signAccess: vi.fn().mockResolvedValue('access-token-123'),
  signRefresh: vi.fn().mockResolvedValue('refresh-token-456'),
  verifyAccess: vi.fn().mockResolvedValue({
    sub: 'u-1',
    email: 'diretor@regulaon.local',
    perfil: 'diretor',
  }),
  verifyRefresh: vi.fn().mockResolvedValue({
    sub: 'u-1',
    jti: 'jti-1',
  }),
};

describe('Domínio — Enums, Entidades e Erros (Fase 1)', () => {
  it('remove senhaHash em toPublicUser', () => {
    const pub = toPublicUser(mockUser);
    expect(pub).not.toHaveProperty('senhaHash');
    expect(pub.email).toBe('diretor@regulaon.local');
    expect(PERFIL_LABEL[pub.perfil]).toBe('Diretor');
  });

  it('instancia hierarquia de erros de domínio corretamente', () => {
    const vErr = new ValidationError('Dados inválidos', { email: 'Obrigatório' });
    expect(vErr).toBeInstanceOf(AppError);
    expect(vErr.statusCode).toBe(422);
    expect(vErr.details).toEqual({ email: 'Obrigatório' });

    expect(new UnauthorizedError().statusCode).toBe(401);
    expect(new ForbiddenError().statusCode).toBe(403);
    expect(new NotFoundError().statusCode).toBe(404);
    expect(new ConflictError().statusCode).toBe(409);
  });

  it('expõe constantes de enums de domínio', () => {
    expect(PERFIS).toContain('diretor');
    expect(AUDIT_ACTIONS).toContain('pop.approve');
    expect(SETORES).toContain('tecnica');
    expect(POP_STATUS_LABEL.publicado).toBe('Publicado');
    expect(NC_ORIGENS).toContain('assistencia_tecnica');
    expect(NC_SEVERIDADES).toContain('grave');
    expect(NC_STATUS).toContain('concluida');
  });
});

describe('Casos de Uso — Autenticação e Usuários (Fase 1)', () => {
  it('LoginUseCase autentica usuário ativo e emite par de tokens', async () => {
    const repo = makeUserRepo();
    const uc = new LoginUseCase(repo, mockPasswords, mockTokens);
    const out = await uc.execute({ email: 'diretor@regulaon.local', senha: '123' });

    expect(out.accessToken).toBe('access-token-123');
    expect(out.refreshToken).toBe('refresh-token-456');
    expect(out.user.id).toBe('u-1');
  });

  it('LoginUseCase rejeita usuário inexistente, inativo ou senha incorreta', async () => {
    const repoInexistente = makeUserRepo({ findByEmail: vi.fn().mockResolvedValue(null) });
    await expect(
      new LoginUseCase(repoInexistente, mockPasswords, mockTokens).execute({
        email: 'x@x.com',
        senha: '123',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedError);

    const repoInativo = makeUserRepo({
      findByEmail: vi.fn().mockResolvedValue({ ...mockUser, status: 'inativo' }),
    });
    await expect(
      new LoginUseCase(repoInativo, mockPasswords, mockTokens).execute({
        email: 'diretor@regulaon.local',
        senha: '123',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedError);

    const badPw: PasswordService = { ...mockPasswords, compare: vi.fn().mockResolvedValue(false) };
    await expect(
      new LoginUseCase(makeUserRepo(), badPw, mockTokens).execute({
        email: 'diretor@regulaon.local',
        senha: 'errada',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('RefreshUseCase rotaciona tokens e rejeita usuário inativo ou ausente', async () => {
    const uc = new RefreshUseCase(makeUserRepo(), mockTokens);
    const out = await uc.execute('refresh-old');
    expect(out.accessToken).toBe('access-token-123');

    const repoNull = makeUserRepo({ findById: vi.fn().mockResolvedValue(null) });
    await expect(new RefreshUseCase(repoNull, mockTokens).execute('r')).rejects.toBeInstanceOf(
      NotFoundError,
    );

    const repoInativo = makeUserRepo({
      findById: vi.fn().mockResolvedValue({ ...mockUser, status: 'inativo' }),
    });
    await expect(new RefreshUseCase(repoInativo, mockTokens).execute('r')).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });

  it('GetCurrentUserUseCase retorna usuário público ou lança NotFoundError', async () => {
    const uc = new GetCurrentUserUseCase(makeUserRepo());
    const u = await uc.execute('u-1');
    expect(u.nomeCompleto).toBe('Pedro Costa');

    const ucMissing = new GetCurrentUserUseCase(
      makeUserRepo({ findById: vi.fn().mockResolvedValue(null) }),
    );
    await expect(ucMissing.execute('u-999')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('CreateUserUseCase e ListUsersUseCase criam e listam colaboradores', async () => {
    const repo = makeUserRepo();
    const createUc = new CreateUserUseCase(repo, mockPasswords);
    const novo = await createUc.execute({
      nomeCompleto: 'Carlos Técnico',
      email: 'carlos@regulaon.local',
      cpf: '222.333.444-55',
      senha: 'Password@123',
      perfil: 'tecnico',
      nivel: 'Sênior',
    });
    expect(novo.id).toBe('u-new');
    expect(novo.perfil).toBe('tecnico');

    const listUc = new ListUsersUseCase(repo);
    const lista = await listUc.execute();
    expect(lista).toHaveLength(1);
  });
});
