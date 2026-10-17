/**
 * Enums de usuário — perfil e status.
 * Mantidos como `const` + union para compatibilidade total com TS strict.
 */

export const PERFIS = ['diretor', 'gestor', 'tecnico', 'estoquista'] as const;
export type Perfil = (typeof PERFIS)[number];

export const STATUS_USUARIO = ['ativo', 'inativo'] as const;
export type StatusUsuario = (typeof STATUS_USUARIO)[number];

export const PERFIL_LABEL: Record<Perfil, string> = {
  diretor: 'Diretor',
  gestor: 'Gestor da Qualidade / RT',
  tecnico: 'Técnico',
  estoquista: 'Estoquista / Almoxarifado',
};

export const PERFIL_SHORT_LABEL: Record<Perfil, string> = {
  diretor: 'Diretor',
  gestor: 'Gestor RT',
  tecnico: 'Técnico',
  estoquista: 'Estoquista',
};

export const PERFIL_COR: Record<Perfil, string> = {
  diretor: 'bg-primary/10 text-primary border-primary/25',
  gestor: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25',
  tecnico: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
  estoquista: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25',
};