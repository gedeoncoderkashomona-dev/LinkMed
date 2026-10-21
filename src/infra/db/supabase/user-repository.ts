import { randomUUID } from 'node:crypto';
import type { User } from '@/core/domain/entities/user';
import type {
  CreateUserInput,
  UpdateUserInput,
  UserRepository,
} from '@/core/repositories/user-repository';
import { supabaseAdmin } from './client';

interface UserRow {
  id: string;
  nome_completo: string;
  email: string;
  cpf: string;
  senha_hash: string;
  perfil: string;
  nivel: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

const USER_CACHE_TTL_MS = 60_000;
const userByIdCache = new Map<string, { user: User; expiresAt: number }>();
const userByEmailCache = new Map<string, { user: User; expiresAt: number }>();

function cacheUser(user: User) {
  const expiresAt = Date.now() + USER_CACHE_TTL_MS;
  userByIdCache.set(user.id, { user, expiresAt });
  userByEmailCache.set(user.email.toLowerCase(), { user, expiresAt });
}

function invalidateUserCache() {
  userByIdCache.clear();
  userByEmailCache.clear();
}

function toEntity(row: UserRow): User {
  return {
    id: row.id,
    nomeCompleto: row.nome_completo,
    email: row.email,
    cpf: row.cpf,
    senhaHash: row.senha_hash,
    perfil: row.perfil as any,
    nivel: row.nivel ?? null,
    status: row.status as any,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
  };
}

export class SupabaseUserRepository implements UserRepository {
  async findById(id: string): Promise<User | null> {
    const cached = userByIdCache.get(id);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.user;
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (error || !data) return null;
    const entity = toEntity(data as UserRow);
    cacheUser(entity);
    return entity;
  }

  async findByEmail(email: string): Promise<User | null> {
    const key = email.toLowerCase();
    const cached = userByEmailCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.user;
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', key)
      .is('deleted_at', null)
      .maybeSingle();

    if (error || !data) return null;
    const entity = toEntity(data as UserRow);
    cacheUser(entity);
    return entity;
  }

  async findByCpf(cpf: string): Promise<User | null> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('cpf', cpf)
      .is('deleted_at', null)
      .maybeSingle();

    if (error || !data) return null;
    const entity = toEntity(data as UserRow);
    cacheUser(entity);
    return entity;
  }

  async list(): Promise<User[]> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .is('deleted_at', null)
      .order('nome_completo', { ascending: true });

    if (error || !data) return [];
    const list = (data as UserRow[]).map(toEntity);
    for (const u of list) cacheUser(u);
    return list;
  }

  async create(input: CreateUserInput): Promise<User> {
    const id = randomUUID();
    const now = new Date().toISOString();

    const row = {
      id,
      nome_completo: input.nomeCompleto,
      email: input.email.toLowerCase(),
      cpf: input.cpf,
      senha_hash: input.senhaHash,
      perfil: input.perfil,
      nivel: input.nivel ?? null,
      status: input.status ?? 'ativo',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };

    const { data, error } = await supabaseAdmin
      .from('users')
      .insert(row)
      .select()
      .single();

    if (error) {
      throw new Error(`Falha ao inserir usuário no Supabase: ${error.message}`);
    }

    invalidateUserCache();
    const entity = toEntity(data as UserRow);
    cacheUser(entity);
    return entity;
  }

  async update(id: string, input: UpdateUserInput): Promise<User> {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.nomeCompleto !== undefined) updateData.nome_completo = input.nomeCompleto;
    if (input.email !== undefined) updateData.email = input.email.toLowerCase();
    if (input.cpf !== undefined) updateData.cpf = input.cpf;
    if (input.perfil !== undefined) updateData.perfil = input.perfil;
    if (input.nivel !== undefined) updateData.nivel = input.nivel;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.senhaHash !== undefined) updateData.senha_hash = input.senhaHash;

    const { data, error } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Falha ao atualizar usuário no Supabase: ${error.message}`);
    }

    invalidateUserCache();
    const entity = toEntity(data as UserRow);
    cacheUser(entity);
    return entity;
  }

  async softDelete(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('users')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      throw new Error(`Falha ao excluir usuário no Supabase: ${error.message}`);
    }
    invalidateUserCache();
  }
}
