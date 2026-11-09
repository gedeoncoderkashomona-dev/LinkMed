import { z } from 'zod';

function normalizarEmailLinkmed(val: string): string {
  let e = val.trim().toLowerCase();
  if (!e.includes('@')) {
    if (e === 'estoquista' || e === 'estoque' || e === 'almoxarifado') return 'estoquista@regulaon.local';
    if (e === 'adm' || e === 'administrativo') return 'adm@regulaon.local';
    if (e === 'tecnico' || e === 'at') return 'tecnico@regulaon.local';
    if (e === 'diretor') return 'diretor@regulaon.local';
    if (e === 'gestor' || e === 'qualidade') return 'gestor.qualidade@regulaon.local';
    return `${e}@regulaon.local`;
  }
  e = e.replace(/@regularon(\.local)?$/, '@regulaon.local');
  e = e.replace(/@regulaon$/, '@regulaon.local');
  return e;
}

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .transform(normalizarEmailLinkmed)
    .pipe(z.string().email('E-mail inválido.')),
  senha: z.string().min(6, 'A senha deve ter ao menos 6 caracteres.'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const createUserSchema = z.object({
  nomeCompleto: z.string().trim().min(3, 'Informe o nome completo.'),
  email: z.string().trim().toLowerCase().email('E-mail inválido.'),
  cpf: z
    .string()
    .trim()
    .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF no formato 000.000.000-00.'),
  senha: z.string().min(8, 'A senha deve ter ao menos 8 caracteres.'),
  perfil: z.enum(['diretor', 'gestor', 'tecnico', 'estoquista', 'adm']),
  nivel: z.string().trim().max(30).nullable().optional(),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = createUserSchema.partial().extend({
  status: z.enum(['ativo', 'inativo']).optional(),
  senha: z.string().min(8).optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
