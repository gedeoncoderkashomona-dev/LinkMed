export const SETORES = ['qualidade', 'tecnica', 'almoxarifado', 'geral', 'direcao'] as const;
export type Setor = (typeof SETORES)[number];

export const SETOR_LABEL: Record<Setor, string> = {
  qualidade: 'Qualidade',
  tecnica: 'Assistência Técnica',
  almoxarifado: 'Almoxarifado',
  geral: 'Geral',
  direcao: 'Direção',
};

export const SETOR_SIGLA: Record<Setor, string> = {
  qualidade: 'QUA',
  tecnica: 'TEC',
  almoxarifado: 'ALM',
  geral: 'GER',
  direcao: 'DIR',
};

export const POP_STATUSES = [
  'rascunho',
  'aguardando_aprovacao',
  'publicado',
  'obsoleto',
] as const;
export type PopStatus = (typeof POP_STATUSES)[number];

export const POP_STATUS_LABEL: Record<PopStatus, string> = {
  rascunho: 'Rascunho',
  aguardando_aprovacao: 'Aguardando aprovação',
  publicado: 'Publicado',
  obsoleto: 'Obsoleto',
};

export const POP_STATUS_VARIANT: Record<
  PopStatus,
  'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline'
> = {
  rascunho: 'secondary',
  aguardando_aprovacao: 'warning',
  publicado: 'success',
  obsoleto: 'outline',
};

export const VERSION_STATUSES = ['vigente', 'obsoleta'] as const;
export type VersionStatus = (typeof VERSION_STATUSES)[number];

export const CHANGE_REQUEST_STATUSES = ['pendente', 'aprovada', 'rejeitada'] as const;
export type ChangeRequestStatus = (typeof CHANGE_REQUEST_STATUSES)[number];

export const CHANGE_REQUEST_STATUS_LABEL: Record<ChangeRequestStatus, string> = {
  pendente: 'Pendente',
  aprovada: 'Aprovada',
  rejeitada: 'Rejeitada',
};