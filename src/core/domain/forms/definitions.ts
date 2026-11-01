import type { Perfil } from '@/core/domain/enums/user';

/**
 * Catálogo dos formulários operacionais (REG-xxx) da Assistência Técnica / Almoxarifado / ADM.
 * Fonte única de verdade para: renderização do formulário, validação no servidor,
 * avaliação de conformidade e alertas. Os registros ficam em `form_records.dados`.
 */

export type FieldType =
  | 'text'
  | 'textarea'
  | 'date'
  | 'time'
  | 'number'
  | 'select'
  | 'checkbox'
  /** Tri-estado de checklist: C (conforme), NC (não conforme), NA (não se aplica). */
  | 'cnc';

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: FieldOption[];
  placeholder?: string;
  unit?: string;
  step?: number;
  /** Exibe (e passa a validar) o campo apenas quando outro campo tem o valor indicado. */
  showIf?: { field: string; equals: string | boolean };
  /** Valor inicial sugerido. */
  defaultValue?: string | number | boolean;
  /** Dica exibida sob o campo. */
  hint?: string;
  /** Campo restrito à governança: apenas Qualidade (gestor) e Diretor podem editar. */
  governanceOnly?: boolean;
}

export interface SectionDef {
  titulo: string;
  descricao?: string;
  campos: FieldDef[];
}

export type SetorFormulario = 'assistencia_tecnica' | 'almoxarifado' | 'administrativo';

export type FormTipo =
  | 'inspecao-recebimento'
  | 'limpeza-equipamento'
  | 'etapas-manutencao'
  | 'verificacao-calibracao'
  | 'checklist-manutencao'
  | 'higienizacao-bancada'
  | 'pulseira-antiestatica'
  | 'temperatura-umidade'
  | 'validade-calibracao';

export interface SubtipoDef {
  key: string;
  label: string;
  /** Seções extras específicas do subtipo (somadas às seções base). */
  secoes: SectionDef[];
}

export interface FormAlertaDef {
  /** Texto curto exibido no cartão do formulário e no painel. */
  mensagem: string;
}

export interface ResponsaveisDocumento {
  elaboradoPor: string;
  revisadoPor: string;
  aprovadoPor: string;
}

export interface FormDef {
  tipo: FormTipo;
  reg: string | null;
  pastaPop?: string;
  titulo: string;
  descricao: string;
  setores: SetorFormulario[];
  /** Perfis que podem preencher o formulário. */
  perfis: Perfil[];
  /** Campo (em `dados`) que representa a data de referência do registro. */
  campoData: string;
  /** Responsáveis oficiais pela elaboração, revisão e aprovação do formulário. */
  responsaveis: ResponsaveisDocumento;
  secoes: SectionDef[];
  subtipos?: SubtipoDef[];
  alerta?: FormAlertaDef;
}

// ---------------------------------------------------------------------------
// Instrumentos de Medição Pré-cadastrados da Planilha Oficial LinkMed (REG-015)
// ---------------------------------------------------------------------------

export interface InstrumentoMedicaoReg015 {
  id: string;
  numeroItem: number;
  equipamento: string;
  localizacao: 'Assistência Técnica' | 'Almoxarifado';
  marca: string;
  modelo: string;
  numeroSerie: string;
  certificado: string;
  laboratorio: string;
  dataCalibracao: string; // YYYY-MM-DD
  frequenciaMeses: number;
  validade: string; // YYYY-MM-DD (Próxima Calibração)
  certificadoPdfNome?: string | null;
  certificadoPdfDataUrl?: string | null;
}

export const INSTRUMENTOS_PADRAO_REG015: InstrumentoMedicaoReg015[] = [
  {
    id: 'inst-reg015-01',
    numeroItem: 1,
    equipamento: 'Simulador de ECG',
    localizacao: 'Assistência Técnica',
    marca: 'CONTEC',
    modelo: 'MS400',
    numeroSerie: '21100230037',
    certificado: '12405/2025',
    laboratorio: 'Laboratório RBC / Metrologia',
    dataCalibracao: '2025-04-11',
    frequenciaMeses: 12,
    validade: '2026-04-11',
    certificadoPdfNome: 'Certificado_12405_2025_Simulador_ECG.pdf',
  },
  {
    id: 'inst-reg015-02',
    numeroItem: 2,
    equipamento: 'Tacômetro Digital',
    localizacao: 'Assistência Técnica',
    marca: 'INSTRUTHERM',
    modelo: 'TD-812',
    numeroSerie: '220115892',
    certificado: '12406/2025',
    laboratorio: 'Laboratório RBC / Metrologia',
    dataCalibracao: '2025-04-11',
    frequenciaMeses: 12,
    validade: '2026-04-11',
    certificadoPdfNome: 'Certificado_12406_2025_Tacometro.pdf',
  },
  {
    id: 'inst-reg015-03',
    numeroItem: 3,
    equipamento: 'Radiômetro',
    localizacao: 'Assistência Técnica',
    marca: 'FANEM',
    modelo: '2620',
    numeroSerie: 'FA6392',
    certificado: '12407/2025',
    laboratorio: 'Laboratório RBC / Metrologia',
    dataCalibracao: '2025-04-11',
    frequenciaMeses: 12,
    validade: '2026-04-11',
    certificadoPdfNome: 'Certificado_12407_2025_Radiometro.pdf',
  },
  {
    id: 'inst-reg015-04',
    numeroItem: 4,
    equipamento: 'Analisador Calibrador de Desfibrilador e Marcapasso Externo Transcutâneo',
    localizacao: 'Assistência Técnica',
    marca: 'TRANSMAI',
    modelo: 'AD-100',
    numeroSerie: '1809045',
    certificado: '12408/2025',
    laboratorio: 'Laboratório RBC / Metrologia',
    dataCalibracao: '2025-04-11',
    frequenciaMeses: 12,
    validade: '2026-04-11',
    certificadoPdfNome: 'Certificado_12408_2025_Analisador_Desfibrilador.pdf',
  },
  {
    id: 'inst-reg015-05',
    numeroItem: 5,
    equipamento: 'Analisador de Segurança Elétrica',
    localizacao: 'Assistência Técnica',
    marca: 'FLUKE',
    modelo: 'ESA612',
    numeroSerie: '3948102',
    certificado: '12409/2025',
    laboratorio: 'Laboratório RBC / Metrologia',
    dataCalibracao: '2025-04-11',
    frequenciaMeses: 12,
    validade: '2026-04-11',
    certificadoPdfNome: 'Certificado_12409_2025_Seguranca_Eletrica.pdf',
  },
  {
    id: 'inst-reg015-06',
    numeroItem: 6,
    equipamento: 'Termômetro Digital',
    localizacao: 'Assistência Técnica',
    marca: 'MINIPA',
    modelo: 'MT-450',
    numeroSerie: '019283',
    certificado: '12410/2025',
    laboratorio: 'Laboratório RBC / Metrologia',
    dataCalibracao: '2025-04-11',
    frequenciaMeses: 12,
    validade: '2026-04-11',
    certificadoPdfNome: 'Certificado_12410_2025_Termometro.pdf',
  },
  {
    id: 'inst-reg015-07',
    numeroItem: 7,
    equipamento: 'Peso Padrão 2kg (Unid. 1)',
    localizacao: 'Assistência Técnica',
    marca: 'KN WAAGEN',
    modelo: '2KG-M1',
    numeroSerie: 'PP-001',
    certificado: '12411/2025',
    laboratorio: 'Laboratório RBC / Metrologia',
    dataCalibracao: '2025-04-11',
    frequenciaMeses: 12,
    validade: '2026-04-11',
    certificadoPdfNome: 'Certificado_12411_2025_Peso_Padrao_1.pdf',
  },
  {
    id: 'inst-reg015-08',
    numeroItem: 8,
    equipamento: 'Peso Padrão 2kg (Unid. 2)',
    localizacao: 'Assistência Técnica',
    marca: 'KN WAAGEN',
    modelo: '2KG-M1',
    numeroSerie: 'PP-002',
    certificado: '12412/2025',
    laboratorio: 'Laboratório RBC / Metrologia',
    dataCalibracao: '2025-04-11',
    frequenciaMeses: 12,
    validade: '2026-04-11',
    certificadoPdfNome: 'Certificado_12412_2025_Peso_Padrao_2.pdf',
  },
  {
    id: 'inst-reg015-09',
    numeroItem: 9,
    equipamento: 'Termohigrômetro Digital (Almoxarifado)',
    localizacao: 'Almoxarifado',
    marca: 'AKSO',
    modelo: 'AK28',
    numeroSerie: '4171930',
    certificado: '12413/2025',
    laboratorio: 'Laboratório RBC / Metrologia',
    dataCalibracao: '2025-04-11',
    frequenciaMeses: 12,
    validade: '2026-04-11',
    certificadoPdfNome: 'Certificado_12413_2025_Termohigrometro_Almox.pdf',
  },
  {
    id: 'inst-reg015-10',
    numeroItem: 10,
    equipamento: 'Paquímetro Convencional',
    localizacao: 'Assistência Técnica',
    marca: 'MITUTOYO',
    modelo: '530-104BR',
    numeroSerie: '2019482',
    certificado: '12414/2025',
    laboratorio: 'Laboratório RBC / Metrologia',
    dataCalibracao: '2025-04-11',
    frequenciaMeses: 12,
    validade: '2026-04-11',
    certificadoPdfNome: 'Certificado_12414_2025_Paquimetro.pdf',
  },
  {
    id: 'inst-reg015-11',
    numeroItem: 11,
    equipamento: 'Simulador de ECG HS20-8',
    localizacao: 'Assistência Técnica',
    marca: 'HEARTSCREEN',
    modelo: 'HS20-8',
    numeroSerie: 'HS-00921',
    certificado: '12415/2025',
    laboratorio: 'Laboratório RBC / Metrologia',
    dataCalibracao: '2025-04-11',
    frequenciaMeses: 12,
    validade: '2026-04-11',
    certificadoPdfNome: 'Certificado_12415_2025_Simulador_HS20.pdf',
  },
  {
    id: 'inst-reg015-12',
    numeroItem: 12,
    equipamento: 'Termohigrômetro Digital (Assistência Técnica)',
    localizacao: 'Assistência Técnica',
    marca: 'MINIPA',
    modelo: 'MT-241-A',
    numeroSerie: '4171931',
    certificado: '12416/2025',
    laboratorio: 'Laboratório RBC / Metrologia',
    dataCalibracao: '2025-04-11',
    frequenciaMeses: 12,
    validade: '2026-04-11',
    certificadoPdfNome: 'Certificado_12416_2025_Termohigrometro_AT.pdf',
  },
  {
    id: 'inst-reg015-13',
    numeroItem: 13,
    equipamento: 'Multímetro Digital True RMS',
    localizacao: 'Assistência Técnica',
    marca: 'FLUKE',
    modelo: '179',
    numeroSerie: '49102381',
    certificado: '12417/2025',
    laboratorio: 'Laboratório RBC / Metrologia',
    dataCalibracao: '2025-04-11',
    frequenciaMeses: 12,
    validade: '2026-04-11',
    certificadoPdfNome: 'Certificado_12417_2025_Multimetro_Fluke.pdf',
  },
  {
    id: 'inst-reg015-14',
    numeroItem: 14,
    equipamento: 'Multímetro Digital Bancada',
    localizacao: 'Assistência Técnica',
    marca: 'MINIPA',
    modelo: 'ET-2082E',
    numeroSerie: '829104',
    certificado: '12418/2025',
    laboratorio: 'Laboratório RBC / Metrologia',
    dataCalibracao: '2025-04-11',
    frequenciaMeses: 12,
    validade: '2026-04-11',
    certificadoPdfNome: 'Certificado_12418_2025_Multimetro_Minipa.pdf',
  },
  {
    id: 'inst-reg015-15',
    numeroItem: 15,
    equipamento: 'Fonte de Alimentação Digital',
    localizacao: 'Assistência Técnica',
    marca: 'MINIPA',
    modelo: 'MPL-3303M',
    numeroSerie: '550192',
    certificado: '12419/2025',
    laboratorio: 'Laboratório RBC / Metrologia',
    dataCalibracao: '2025-04-11',
    frequenciaMeses: 12,
    validade: '2026-04-11',
    certificadoPdfNome: 'Certificado_12419_2025_Fonte_MPL3303M.pdf',
  },
  {
    id: 'inst-reg015-16',
    numeroItem: 16,
    equipamento: 'Simulador Multiparamétrico de Paciente',
    localizacao: 'Assistência Técnica',
    marca: 'FLUKE',
    modelo: 'ProSim 8',
    numeroSerie: '3891204',
    certificado: '01842/2026',
    laboratorio: 'Laboratório RBC / Metrologia',
    dataCalibracao: '2026-01-15',
    frequenciaMeses: 12,
    validade: '2027-01-15',
    certificadoPdfNome: 'Certificado_01842_2026_ProSim8.pdf',
  },
  {
    id: 'inst-reg015-17',
    numeroItem: 17,
    equipamento: 'Manômetro Digital Padrão',
    localizacao: 'Assistência Técnica',
    marca: 'INSTRUTHERM',
    modelo: 'MD-100',
    numeroSerie: '774190',
    certificado: '08912/2025',
    laboratorio: 'Laboratório RBC / Metrologia',
    dataCalibracao: '2025-12-15',
    frequenciaMeses: 12,
    validade: '2026-12-15',
    certificadoPdfNome: 'Certificado_08912_2025_Manometro_Digital.pdf',
  },
];

/**
 * Calcula a data da próxima calibração somando `frequenciaMeses` à `dataCalibracao` (YYYY-MM-DD).
 */
export function calcularProximaCalibracao(
  dataCalibracao: string,
  frequenciaMeses = 12,
): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataCalibracao)) return '';
  const [y, m, d] = dataCalibracao.split('-').map(Number);
  const dt = new Date(Date.UTC(y!, (m! - 1) + frequenciaMeses, d!));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

// ---------------------------------------------------------------------------
// Blocos reutilizáveis
// ---------------------------------------------------------------------------

const PERFIS_AT: Perfil[] = ['diretor', 'gestor', 'tecnico'];
const PERFIS_ADM: Perfil[] = ['diretor', 'gestor', 'adm'];
const PERFIS_ADM_AT: Perfil[] = ['diretor', 'gestor', 'adm', 'tecnico'];
const PERFIS_AT_ALMOX: Perfil[] = ['diretor', 'gestor', 'tecnico', 'estoquista'];

const hojeDefault = '__hoje__';
export const DEFAULT_HOJE = hojeDefault;

export const RESPONSAVEIS_PADRAO_AT: ResponsaveisDocumento = {
  elaboradoPor: 'Vanessa Ribeiro (Gestão da Qualidade)',
  revisadoPor: 'Marina Lopes (Responsável Técnica)',
  aprovadoPor: 'Pedro Costa (Diretoria)',
};

export const RESPONSAVEIS_PADRAO_ALMOX: ResponsaveisDocumento = {
  elaboradoPor: 'João Silva / Vanessa Ribeiro (Qualidade)',
  revisadoPor: 'Marina Lopes (Responsável Técnica)',
  aprovadoPor: 'Pedro Costa (Diretoria)',
};

export const RESPONSAVEIS_PADRAO_ADM: ResponsaveisDocumento = {
  elaboradoPor: 'Setor Administrativo (ADM) / Qualidade',
  revisadoPor: 'Marina Lopes (Responsável Técnica)',
  aprovadoPor: 'Pedro Costa (Diretoria)',
};

/**
 * Define se o perfil logado possui permissão para alterar quem elaborou,
 * revisou e aprovou os POPs e Formulários (exclusivo para Qualidade e Diretor).
 */
export function canEditGovernance(perfil?: Perfil | null): boolean {
  return perfil === 'diretor' || perfil === 'gestor';
}

function secaoResponsaveis(resp: ResponsaveisDocumento = RESPONSAVEIS_PADRAO_AT): SectionDef {
  return {
    titulo: 'Responsáveis pelo Documento (Elaboração, Revisão e Aprovação)',
    descricao:
      'Governança documental obrigatória conforme RDC 665/2022 (ANVISA) — Seção 5.3. Edição restrita à Qualidade e Diretoria.',
    campos: [
      {
        name: 'elaborado_por',
        label: 'Elaborado por (Responsável pela Elaboração)',
        type: 'text',
        required: true,
        defaultValue: resp.elaboradoPor,
        governanceOnly: true,
      },
      {
        name: 'revisado_por',
        label: 'Revisado por (Responsável pela Revisão)',
        type: 'text',
        required: true,
        defaultValue: resp.revisadoPor,
        governanceOnly: true,
      },
      {
        name: 'aprovado_por',
        label: 'Aprovado por (Responsável pela Aprovação)',
        type: 'text',
        required: true,
        defaultValue: resp.aprovadoPor,
        governanceOnly: true,
      },
    ],
  };
}

function cnc(name: string, label: string, extra: Partial<FieldDef> = {}): FieldDef {
  return { name, label, type: 'cnc', required: true, ...extra };
}

const OPCOES_CNC: FieldOption[] = [
  { value: 'C', label: 'Conforme' },
  { value: 'NC', label: 'Não conforme' },
  { value: 'NA', label: 'Não se aplica' },
];
export { OPCOES_CNC };

const OPCOES_CONFORMIDADE: FieldOption[] = [
  { value: 'conforme', label: 'Conforme' },
  { value: 'nao_conforme', label: 'Não conforme' },
];

export const TIPOS_TRANSPORTE: FieldOption[] = [
  { value: 'transportadora_linkmed', label: 'Transportadora contratada pela Linkmed' },
  { value: 'transportadora_cliente', label: 'Transportadora do próprio cliente' },
  { value: 'correios', label: 'Correios' },
  { value: 'contratado_cliente', label: 'Transporte contratado pelo cliente' },
  { value: 'proprio_cliente', label: 'Transporte do próprio cliente' },
];

// ---------------------------------------------------------------------------
// Checklist de manutenção (REG-035 e REG-009) — itens por marca
// ---------------------------------------------------------------------------

function itensCnc(
  prefixo: string,
  itens: string[],
  showIf?: { field: string; equals: string | boolean },
): FieldDef[] {
  return itens.map((label) =>
    cnc(
      `${prefixo}_${label
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '')}`,
      label,
      showIf ? { showIf } : {},
    ),
  );
}

const OLIDEF_LISTA_ITENS = [
  'Elétrica',
  'Aquecimento',
  'Portinhola',
  'Cúpula',
  'Sensores de controle',
  'Conexão dos cabos',
  'Pintura',
  'Rodízio',
  'Suporte de soro',
  'Amortecedores',
  'Colchão',
  'Bandeja',
  'Passagens de tubos',
  'Travas',
  'Carrinho',
  'Painel de controle',
  'Válvula reguladora',
  'Guarnição de borracha',
  'Rodízios',
  'Balança',
  'Ajustes de altura',
  'Sensor do RN',
  'Potência de aquecimento',
  'Movimento da pantalha',
  'Movimento do leito do RN',
  'Lâmpada auxiliar',
];

const TEB_LISTA_ITENS = [
  'Elétrica',
  'Lona e plataforma',
  'Carenagens',
  'Barulhos / ruídos',
  'Motor / tração',
  'Seguradores',
  'Cabo e acessórios',
  'Inclinação / elevação / velocidade',
  'Amplificador de sinais',
  'Impressora',
  'Bateria',
  'Display',
  'Botão de acionamento (liga / desliga)',
  'Conexão dos cabos',
  'Mecanismos de impressão',
];

const CARDIOS_LISTA_ITENS_REG009 = [
  'Inspeção visual externa do gabinete e tampa de bateria (Cardios)',
  'Integridade do cabo de paciente / vias de ECG ou manguito MAPA',
  'Conector principal e pinos sem oxidação ou folga mecânica',
  'Teste de alimentação, consumo e contatos do compartimento de pilhas/bateria',
  'Verificação de gravação em cartão de memória / comunicação com interface',
  'Teste de calibração de sinal / pressão e resposta dos canais (REG 009)',
  'Teste funcional completo e higienização final do registrador Cardios',
];

const OLIDEF_ITENS: SectionDef[] = [
  {
    titulo: '2. Equipamento — Checagem dos itens (Olidef)',
    campos: itensCnc('ol', OLIDEF_LISTA_ITENS),
  },
];

const TEB_ITENS: SectionDef[] = [
  {
    titulo: '2. Equipamento — Checagem dos itens (TEB)',
    campos: [
      ...itensCnc('teb', TEB_LISTA_ITENS),
      { name: 'teb_banco_dados', label: 'Banco de dados', type: 'text' },
      { name: 'teb_quantidade_exames', label: 'Quantidade de exames', type: 'number' },
      { name: 'teb_versao_sistema', label: 'Versão do sistema', type: 'text' },
    ],
  },
];

/**
 * Regra oficial da Seção 3.2 e Seção 6.2 do Documento de Apoio:
 * O Item 5 do REG 016 (REG 009 / REG 035) fica BLOQUEADO quando a OS está com etiqueta
 * VERMELHA (orçamento reprovado, inclusive se veio de envio à fábrica MARROM + reprovado).
 * A etiqueta MARROM sozinha NÃO bloqueia o Item 5; se MARROM tiver orçamento aprovado (AZUL),
 * o Item 5 permanece LIBERADO.
 */
export function verificarBloqueioItem5Reg016(contexto: {
  etiquetaAtual?: string | null;
  orcamentoReprovado?: unknown;
}): { bloqueado: boolean; motivo: string | null } {
  const tag = String(contexto.etiquetaAtual ?? '').toUpperCase();
  const reprovadoMarcado =
    contexto.orcamentoReprovado === 'C' || contexto.orcamentoReprovado === true;

  if (tag === 'RED' || reprovadoMarcado) {
    return {
      bloqueado: true,
      motivo:
        'Item 5 (REG 009 / REG 035) bloqueado: o equipamento recebeu etiqueta VERMELHA (orçamento não aprovado pelo cliente).',
    };
  }

  return { bloqueado: false, motivo: null };
}

/**
 * Retorna qual formulário compõe o Item 5 do REG 016 conforme a marca escolhida (Seção 3.2).
 */
export function obterFormularioItem5PorMarca(
  marca?: string | null,
): 'REG-009' | 'REG-035 (TEB)' | 'REG-035 (OLIDEF)' | null {
  const m = String(marca ?? '').trim().toUpperCase();
  if (m === 'CARDIOS') return 'REG-009';
  if (m === 'TEB') return 'REG-035 (TEB)';
  if (m === 'OLIDEF') return 'REG-035 (OLIDEF)';
  return null;
}

// ---------------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------------

export const FORM_DEFS: FormDef[] = [
  {
    tipo: 'inspecao-recebimento',
    reg: 'REG-022',
    pastaPop: 'POP-020',
    titulo: 'Inspeção de Recebimento (ADM)',
    descricao:
      'Preenchido pelo setor Administrativo (ADM) na chegada do equipamento, identificando o nº da OS (ERP). Os dados são reaproveitados automaticamente no REG 016.',
    setores: ['administrativo'],
    perfis: PERFIS_ADM,
    campoData: 'data_liberacao',
    responsaveis: RESPONSAVEIS_PADRAO_ADM,
    secoes: [
      {
        titulo: '1. Identificação do equipamento e Nº da OS',
        descricao:
          'Os dados preenchidos aqui alimentam automaticamente o REG 016 e a Etiqueta de Identificação do Equipamento.',
        campos: [
          {
            name: 'numero_os',
            label: 'Nº da OS (Sistema ERP)',
            type: 'text',
            required: true,
            placeholder: 'Ex.: OS-2026-0145',
            hint: 'Não são permitidos números de OS duplicados (mesmo finalizadas ou canceladas).',
          },
          { name: 'cliente', label: 'Cliente', type: 'text', required: true },
          { name: 'equipamento', label: 'Equipamento', type: 'text', required: true },
          { name: 'marca', label: 'Marca (Ex.: Cardios, TEB, OLIDEF)', type: 'text', required: true },
          { name: 'modelo', label: 'Modelo', type: 'text', required: true },
          { name: 'numero_serie', label: 'Nº de série', type: 'text', required: true },
        ],
      },
      {
        titulo: '2. Inspeção visual de recebimento',
        descricao: 'C = Conforme · NC = Não conforme · NA = Não se aplica',
        campos: [
          cnc('embalagem_adequada', 'Embalagem adequada'),
          cnc('sem_danos_externos', 'Sem danos externos visíveis'),
          cnc('cabos_integros', 'Cabos íntegros'),
          cnc('tela_sem_trincas', 'Tela/painel sem trincas'),
          cnc('pecas_soltas_ausentes', 'Peças soltas/ausentes'),
          cnc('sinais_violacao', 'Sinais de violação/lacre rompido'),
          cnc('limpeza_sujidade', 'Limpeza/sujidade aparente'),
        ],
      },
      {
        titulo: '3. Liberação pelo ADM',
        campos: [
          { name: 'relato_cliente', label: 'Relato do cliente', type: 'textarea' },
          { name: 'responsavel_liberacao', label: 'Responsável pela liberação (ADM)', type: 'text', required: true },
          { name: 'data_liberacao', label: 'Data da liberação', type: 'date', required: true, defaultValue: hojeDefault },
        ],
      },
      secaoResponsaveis(RESPONSAVEIS_PADRAO_ADM),
    ],
  },
  {
    tipo: 'limpeza-equipamento',
    reg: 'REG-034',
    pastaPop: 'POP-020',
    titulo: 'Limpeza de Equipamento',
    descricao: 'Checklist de verificação para limpeza e higienização de equipamentos (álcool 70%) na Assistência Técnica.',
    setores: ['assistencia_tecnica'],
    perfis: PERFIS_AT,
    campoData: 'data',
    responsaveis: RESPONSAVEIS_PADRAO_AT,
    secoes: [
      {
        titulo: '1. Identificação',
        campos: [
          { name: 'data', label: 'Data', type: 'date', required: true, defaultValue: hojeDefault },
          { name: 'cliente', label: 'Cliente', type: 'text', required: true },
          { name: 'numero_os', label: 'Nº OS', type: 'text', required: true },
          { name: 'equipamento', label: 'Equipamento', type: 'text', required: true },
          { name: 'numero_serie', label: 'Nº de série', type: 'text' },
          { name: 'acessorios', label: 'Acessórios', type: 'textarea' },
        ],
      },
      {
        titulo: '2. Higienização do produto',
        descricao: 'C = Conforme · NC = Não conforme · NA = Não aplicável',
        campos: [
          cnc('inspecao_visual', 'Inspeção visual realizada (acessórios, conectores, cabos e integridade física)'),
          cnc('produto_alcool_70', 'Produto utilizado para limpeza: Álcool 70%'),
          cnc('limpeza_realizada', 'Limpeza realizada'),
          { name: 'assinatura_tecnico', label: 'Assinatura do técnico (nome / protocolo LGPD)', type: 'text', required: true },
        ],
      },
      secaoResponsaveis(RESPONSAVEIS_PADRAO_AT),
    ],
  },
  {
    tipo: 'etapas-manutencao',
    reg: 'REG-016',
    pastaPop: 'POP-020',
    titulo: 'Etapas da Manutenção (Pasta POP 020)',
    descricao:
      'Checklist oficial de etapas da manutenção (iniciado pelo ADM com etiqueta BRANCA e conduzido pela AT), integrando o Item 5 por marca (Cardios / REG 009, TEB / REG 035 e OLIDEF / REG 035).',
    setores: ['assistencia_tecnica', 'administrativo'],
    perfis: PERFIS_ADM_AT,
    campoData: 'data_abertura',
    responsaveis: RESPONSAVEIS_PADRAO_AT,
    secoes: [
      {
        titulo: '1. Identificação (Herdada automaticamente do REG 022)',
        campos: [
          { name: 'cliente', label: 'Cliente', type: 'text', required: true },
          { name: 'data_abertura', label: 'Data de abertura', type: 'date', required: true, defaultValue: hojeDefault },
          { name: 'numero_os', label: 'Nº OS', type: 'text', required: true },
          { name: 'equipamento', label: 'Equipamento', type: 'text', required: true },
          { name: 'marca', label: 'Marca', type: 'text' },
          { name: 'modelo', label: 'Modelo', type: 'text' },
          { name: 'numero_serie', label: 'Nº de série', type: 'text' },
        ],
      },
      {
        titulo: '2. Recebimento e Verificação antes da manutenção',
        descricao: 'C = Conforme · NA = Não se aplica',
        campos: [
          cnc('etiqueta_branca_adm', 'ADM: Equipamento deu entrada na empresa — etiqueta BRANCA (Notifica a AT)'),
          cnc('conferencia_pecas', 'Conferência de todas as peças listadas na OS do sistema ERP para o conserto'),
          cnc('etiqueta_violeta', 'Após a higienização (REG 034): etiqueta VIOLETA — Equipamento higienizado'),
          cnc('etiqueta_cinza', 'Após a análise na bancada: etiqueta CINZA — Análise completa (Libera impressão da etiqueta física)'),
          cnc('etiqueta_laranja', 'Equipamento em garantia: etiqueta LARANJA (automática ao responder SIM)'),
          cnc('etiqueta_verde_sem_defeito', 'Nenhum defeito identificado: etiqueta VERDE para finalizar o serviço'),
        ],
      },
      {
        titulo: '3. Etapas do checklist (Envio à Fábrica, Orçamento e Peças)',
        campos: [
          {
            name: 'enviado_fabrica',
            label: 'Equipamento necessita ser encaminhado à fábrica — etiqueta MARROM (Enviado à fábrica)',
            type: 'checkbox',
          },
          {
            name: 'tipo_transporte',
            label: 'Tipo de transporte do envio à fábrica',
            type: 'select',
            required: true,
            options: TIPOS_TRANSPORTE,
            showIf: { field: 'enviado_fabrica', equals: true },
            hint: 'Obrigatório quando o equipamento é encaminhado à fábrica (Transportadora Linkmed, Transportadora do cliente ou Correios).',
          },
          cnc('orcamento_enviado', 'Orçamento enviado ao cliente pelo ADM: etiqueta AMARELA — Aguardando aprovação'),
          cnc('orcamento_aprovado', 'Cliente aprovou o orçamento: etiqueta AZUL — Orçamento aprovado'),
          cnc('orcamento_reprovado', 'Cliente reprovou o orçamento: etiqueta VERMELHA — Não aprovado (Bloqueia o Item 5)'),
          cnc('falta_itens_estoque', 'Almoxarifado com falta de itens/componentes: etiqueta PRETA — Aguardando peças (Stand-by POP 009)'),
        ],
      },
      {
        titulo: '4. Verificação após a manutenção',
        campos: [
          cnc('inspecao_final', 'Inspeção final realizada, com confirmação da integridade física do equipamento'),
          cnc('etiqueta_manutencao', 'Etiqueta de manutenção, contendo a data do conserto, fixada no dispositivo'),
          cnc('lacre_antiviolacao', 'Lacre antiviolação fixado no dispositivo'),
          cnc('etiqueta_calibracao', 'Etiqueta de calibração fixada no dispositivo'),
          cnc('liberado_qualidade', 'Equipamento liberado pelo setor da Qualidade: etiqueta VERDE — Serviço finalizado'),
          { name: 'assinatura_tecnico', label: 'Assinatura do técnico (nome / protocolo LGPD)', type: 'text', required: true },
        ],
      },
      {
        titulo: '5. Item 5 — Etapa Final da Manutenção por Marca (REG 009 / REG 035)',
        descricao:
          'Seção 3.2: Selecione a marca do equipamento (Cardios → REG 009 | TEB → REG 035 TEB | OLIDEF → REG 035 OLIDEF). Este item fica bloqueado automaticamente caso o orçamento seja reprovado (Etiqueta VERMELHA).',
        campos: [
          {
            name: 'item5_marca',
            label: 'Marca do Equipamento para o Item 5 (REG 009 / REG 035)',
            type: 'select',
            options: [
              { value: 'Cardios', label: 'Cardios — Exibe formulário REG 009' },
              { value: 'TEB', label: 'TEB — Exibe formulário REG 035 (TEB)' },
              { value: 'OLIDEF', label: 'OLIDEF — Exibe formulário REG 035 (OLIDEF)' },
            ],
            hint: 'Ao selecionar a marca, os campos específicos do REG 009 (Cardios) ou REG 035 (TEB / OLIDEF) são abertos abaixo.',
          },
          // Campos quando Marca = Cardios (REG 009)
          ...itensCnc('item5_cardios', CARDIOS_LISTA_ITENS_REG009, {
            field: 'item5_marca',
            equals: 'Cardios',
          }),
          {
            name: 'item5_cardios_laudo',
            label: 'REG 009 (Cardios) — Diagnóstico técnico e serviços executados',
            type: 'textarea',
            required: true,
            showIf: { field: 'item5_marca', equals: 'Cardios' },
          },
          // Campos quando Marca = TEB (REG 035 TEB)
          ...itensCnc('item5_teb', TEB_LISTA_ITENS, {
            field: 'item5_marca',
            equals: 'TEB',
          }),
          {
            name: 'item5_teb_laudo',
            label: 'REG 035 (TEB) — Diagnóstico técnico, banco de dados e versão do sistema',
            type: 'textarea',
            required: true,
            showIf: { field: 'item5_marca', equals: 'TEB' },
          },
          // Campos quando Marca = OLIDEF (REG 035 OLIDEF)
          ...itensCnc('item5_olidef', OLIDEF_LISTA_ITENS, {
            field: 'item5_marca',
            equals: 'OLIDEF',
          }),
          {
            name: 'item5_olidef_laudo',
            label: 'REG 035 (OLIDEF) — Diagnóstico técnico, testes de segurança elétrica e peças',
            type: 'textarea',
            required: true,
            showIf: { field: 'item5_marca', equals: 'OLIDEF' },
          },
        ],
      },
      secaoResponsaveis(RESPONSAVEIS_PADRAO_AT),
    ],
  },
  {
    tipo: 'verificacao-calibracao',
    reg: 'REG-030',
    pastaPop: 'POP-011',
    titulo: 'Controle de Verificação da Calibração (Pasta POP 011)',
    descricao: 'Registro da verificação da calibração de equipamentos, com resultados e conformidade.',
    setores: ['assistencia_tecnica'],
    perfis: PERFIS_AT,
    campoData: 'data_calibracao',
    responsaveis: RESPONSAVEIS_PADRAO_AT,
    secoes: [
      {
        titulo: '1. Identificação do equipamento',
        campos: [
          { name: 'equipamento', label: 'Equipamento', type: 'text', required: true },
          { name: 'marca_modelo', label: 'Marca / modelo', type: 'text', required: true },
          { name: 'numero_serie', label: 'Nº de série', type: 'text', required: true },
        ],
      },
      {
        titulo: '2. Informações da calibração',
        campos: [
          { name: 'data_calibracao', label: 'Data da calibração', type: 'date', required: true, defaultValue: hojeDefault },
          { name: 'procedimento', label: 'Procedimento utilizado', type: 'text', required: true },
          { name: 'laboratorio', label: 'Laboratório responsável', type: 'text', required: true },
          { name: 'certificado', label: 'Nº do certificado de calibração', type: 'text', required: true },
        ],
      },
      {
        titulo: '3. Condições ambientais durante a calibração',
        campos: [
          { name: 'temperatura', label: 'Temperatura', type: 'number', unit: '°C', step: 0.1, required: true },
          { name: 'umidade', label: 'Umidade relativa', type: 'number', unit: '%', step: 0.1, required: true },
        ],
      },
      ...[
        ['frequencia_gravacao', 'Frequência de gravação (Hz)'],
        ['nivel_sinal', 'Nível de sinal (dB)'],
        ['ruido_fundo', 'Ruído de fundo (dB)'],
        ['distorcao_harmonica', 'Distorção harmônica total (%)'],
      ].map(
        ([key, label]): SectionDef => ({
          titulo: `4. Resultado — ${label}`,
          campos: [
            { name: `${key}_medido`, label: 'Valor medido', type: 'number', step: 0.0001, required: true },
            { name: `${key}_referencia`, label: 'Valor de referência', type: 'number', step: 0.0001, required: true },
            { name: `${key}_erro`, label: 'Erro', type: 'number', step: 0.0001, required: true },
            { name: `${key}_incerteza`, label: 'Incerteza expandida', type: 'number', step: 0.0001, required: true },
            {
              name: `${key}_conformidade`,
              label: 'Conformidade',
              type: 'select',
              required: true,
              options: OPCOES_CONFORMIDADE,
            },
          ],
        }),
      ),
      {
        titulo: '5. Equipamento aprovado para uso',
        descricao:
          'A conformidade deve ser avaliada com base nas tolerâncias especificadas pelo fabricante ou norma técnica.',
        campos: [
          {
            name: 'resultado_final',
            label: 'Após a calibração, o equipamento foi considerado',
            type: 'select',
            required: true,
            options: [
              { value: 'conforme', label: 'Conforme' },
              { value: 'nao_conforme', label: 'Não conforme' },
              { value: 'ajustado_aprovado', label: 'Ajustado e aprovado' },
            ],
          },
          {
            name: 'acoes_tomadas',
            label: 'Ações tomadas (ajustes, recomendações de manutenção ou substituição)',
            type: 'textarea',
            required: true,
            showIf: { field: 'resultado_final', equals: 'nao_conforme' },
          },
          { name: 'supervisor_tecnico', label: 'Supervisor técnico (nome)', type: 'text', required: true },
        ],
      },
      secaoResponsaveis(RESPONSAVEIS_PADRAO_AT),
    ],
  },
  {
    tipo: 'checklist-manutencao',
    reg: 'REG-035',
    pastaPop: 'POP-020',
    titulo: 'Checklist de Manutenção de Equipamento (Integrado ao Item 5 do REG-016)',
    descricao: 'Checklist de manutenção com submódulos específicos por marca: Cardios (REG-009), OLIDEF (REG-035) e TEB (REG-035).',
    setores: ['assistencia_tecnica'],
    perfis: PERFIS_AT,
    campoData: 'data_entrada',
    responsaveis: RESPONSAVEIS_PADRAO_AT,
    secoes: [
      {
        titulo: '1. Identificação',
        campos: [
          { name: 'equipamento', label: 'Equipamento', type: 'text', required: true },
          { name: 'modelo', label: 'Modelo do equipamento', type: 'text', required: true },
          { name: 'numero_serie', label: 'Nº de série', type: 'text', required: true },
          { name: 'numero_os', label: 'Nº da OS', type: 'text', required: true },
          { name: 'data_entrada', label: 'Data da entrada', type: 'date', required: true, defaultValue: hojeDefault },
          { name: 'tecnico', label: 'Técnico', type: 'text', required: true },
        ],
      },
    ],
    subtipos: [
      {
        key: 'olidef',
        label: 'OLIDEF',
        secoes: [...OLIDEF_ITENS, ...procedimentosManutencao(), secaoResponsaveis(RESPONSAVEIS_PADRAO_AT)],
      },
      {
        key: 'teb',
        label: 'TEB',
        secoes: [...TEB_ITENS, ...procedimentosManutencao(), secaoResponsaveis(RESPONSAVEIS_PADRAO_AT)],
      },
      {
        key: 'cardios',
        label: 'Cardios (REG-009)',
        secoes: [
          {
            titulo: '2. Equipamento — Checagem dos itens (Cardios — REG 009)',
            campos: itensCnc('cardios', CARDIOS_LISTA_ITENS_REG009),
          },
          ...procedimentosManutencao(),
          secaoResponsaveis(RESPONSAVEIS_PADRAO_AT),
        ],
      },
    ],
  },
  {
    tipo: 'higienizacao-bancada',
    reg: 'REG-018',
    pastaPop: 'POP-006',
    titulo: 'Higienização da Bancada (Pasta POP 006)',
    descricao: 'Registro de higienização de bancada com álcool 70%.',
    setores: ['assistencia_tecnica'],
    perfis: PERFIS_AT,
    campoData: 'data',
    responsaveis: RESPONSAVEIS_PADRAO_AT,
    alerta: { mensagem: 'Realizada 1x por semana, sempre no início da semana.' },
    secoes: [
      {
        titulo: 'Registro',
        campos: [
          { name: 'bancada', label: 'Bancada', type: 'text', required: true },
          { name: 'data', label: 'Dia', type: 'date', required: true, defaultValue: hojeDefault },
          { name: 'produto_utilizado', label: 'Produto utilizado', type: 'text', required: true, defaultValue: 'Álcool 70%' },
          { name: 'responsavel', label: 'Assinatura do responsável (nome)', type: 'text', required: true },
          { name: 'supervisor', label: 'Assinatura do supervisor (nome)', type: 'text' },
          { name: 'observacoes', label: 'Observações', type: 'textarea' },
        ],
      },
      secaoResponsaveis(RESPONSAVEIS_PADRAO_AT),
    ],
  },
  {
    tipo: 'pulseira-antiestatica',
    reg: 'REG-040',
    pastaPop: 'POP-007',
    titulo: 'Teste da Pulseira Antiestática (Pasta POP 007)',
    descricao: 'Monitoramento diário obrigatório do teste da pulseira elétrica/antiestática na Assistência Técnica.',
    setores: ['assistencia_tecnica'],
    perfis: PERFIS_AT,
    campoData: 'data',
    responsaveis: RESPONSAVEIS_PADRAO_AT,
    alerta: { mensagem: 'Atividade obrigatória diária da Assistência Técnica.' },
    secoes: [
      {
        titulo: 'Monitoramento',
        campos: [
          { name: 'data', label: 'Data', type: 'date', required: true, defaultValue: hojeDefault },
          { name: 'colaborador', label: 'Nome do colaborador', type: 'text', required: true },
          { name: 'local_teste', label: 'Local do teste', type: 'text', required: true, defaultValue: 'Assistência Técnica' },
          {
            name: 'resultado',
            label: 'Resultado',
            type: 'select',
            required: true,
            options: [
              { value: 'aprovado', label: 'Aprovado' },
              { value: 'reprovado', label: 'Reprovado' },
            ],
          },
          { name: 'responsavel_monitoramento', label: 'Responsável pelo monitoramento', type: 'text', required: true },
          { name: 'observacoes', label: 'Observações', type: 'textarea' },
        ],
      },
      secaoResponsaveis(RESPONSAVEIS_PADRAO_AT),
    ],
  },
  {
    tipo: 'temperatura-umidade',
    reg: 'REG-017',
    pastaPop: 'POP-007',
    titulo: 'Controle de Temperatura e Umidade (Pasta POP 007)',
    descricao: 'Leitura obrigatória diária do termohigrômetro (Assistência Técnica e Almoxarifado).',
    setores: ['assistencia_tecnica', 'almoxarifado'],
    perfis: PERFIS_AT_ALMOX,
    campoData: 'data',
    responsaveis: RESPONSAVEIS_PADRAO_AT,
    alerta: { mensagem: 'Atividade obrigatória diária (Assistência Técnica e Almoxarifado).' },
    secoes: [
      {
        titulo: 'Leitura',
        descricao:
          'Aceitação: temperatura até 30 °C · umidade 40% a 70%. Armazenamento ideal: 17 °C a 22 °C. Resetar o termohigrômetro após cada leitura.',
        campos: [
          { name: 'data', label: 'Dia', type: 'date', required: true, defaultValue: hojeDefault },
          {
            name: 'setor_medicao',
            label: 'Setor monitorado',
            type: 'select',
            required: true,
            defaultValue: 'Assistência Técnica',
            options: [
              { value: 'Assistência Técnica', label: 'Assistência Técnica' },
              { value: 'Almoxarifado', label: 'Almoxarifado' },
            ],
          },
          {
            name: 'periodo',
            label: 'Período da leitura',
            type: 'select',
            required: true,
            options: [
              { value: 'manha', label: 'Manhã' },
              { value: 'tarde', label: 'Tarde' },
            ],
          },
          { name: 'hora', label: 'Hora', type: 'time', required: true },
          { name: 'termohigrometro', label: 'Termohigrômetro (nº de série)', type: 'text', defaultValue: 'MT-241-A / 4171931' },
          { name: 'temperatura_atual', label: 'Temperatura atual', type: 'number', unit: '°C', step: 0.1, required: true },
          { name: 'temperatura_min', label: 'Temperatura mínima', type: 'number', unit: '°C', step: 0.1, required: true },
          { name: 'temperatura_max', label: 'Temperatura máxima', type: 'number', unit: '°C', step: 0.1, required: true },
          { name: 'umidade_atual', label: 'Umidade atual', type: 'number', unit: '%', step: 0.1, required: true },
          { name: 'umidade_min', label: 'Umidade mínima', type: 'number', unit: '%', step: 0.1, required: true },
          { name: 'umidade_max', label: 'Umidade máxima', type: 'number', unit: '%', step: 0.1, required: true },
          { name: 'responsavel', label: 'Responsável', type: 'text', required: true },
          {
            name: 'observacao',
            label: 'Observação',
            type: 'textarea',
            hint: 'Se fora dos limites, faça outra medição em horário diferente do dia e registre aqui.',
          },
        ],
      },
      secaoResponsaveis(RESPONSAVEIS_PADRAO_AT),
    ],
  },
  {
    tipo: 'validade-calibracao',
    reg: 'REG-015',
    pastaPop: 'POP-011',
    titulo: 'Controle de Instrumentos de Medição — Validade de Calibração (Pasta POP 011)',
    descricao:
      'Exibe todos os equipamentos de medição cadastrados e suas validades de calibração, permitindo anexar o certificado PDF de cada equipamento e incluir novos instrumentos adquiridos pela Linkmed. Gera alerta automático 60 dias antes do vencimento.',
    setores: ['assistencia_tecnica', 'almoxarifado'],
    perfis: PERFIS_AT_ALMOX,
    campoData: 'data_calibracao',
    responsaveis: RESPONSAVEIS_PADRAO_AT,
    alerta: { mensagem: 'Alerta automático 60 dias antes do vencimento da calibração (REG-015).' },
    secoes: [
      {
        titulo: 'Incluir Novo Equipamento / Atualizar Calibração (REG-015)',
        descricao:
          'Utilize este quadro quando a empresa adquirir novos instrumentos de medição ou renovar o certificado de calibração.',
        campos: [
          { name: 'equipamento', label: 'Instrumento / Equipamento', type: 'text', required: true },
          {
            name: 'localizacao',
            label: 'Localização / Setor',
            type: 'select',
            required: true,
            defaultValue: 'Assistência Técnica',
            options: [
              { value: 'Assistência Técnica', label: 'Assistência Técnica' },
              { value: 'Almoxarifado', label: 'Almoxarifado' },
            ],
          },
          { name: 'marca_modelo', label: 'Marca / Modelo', type: 'text', required: true },
          { name: 'numero_serie', label: 'Nº de série', type: 'text', required: true },
          { name: 'certificado', label: 'Nº do Certificado de Calibração', type: 'text', required: true },
          { name: 'laboratorio', label: 'Laboratório Acreditado', type: 'text', defaultValue: 'Laboratório RBC / Metrologia' },
          { name: 'data_calibracao', label: 'Data da calibração', type: 'date', required: true, defaultValue: hojeDefault },
          { name: 'frequencia_meses', label: 'Frequência da calibração (Meses)', type: 'number', defaultValue: 12 },
          { name: 'validade', label: 'Próxima Calibração / Validade', type: 'date', required: true },
          { name: 'certificado_pdf_nome', label: 'Arquivo do Certificado Anexado (PDF)', type: 'text' },
        ],
      },
      secaoResponsaveis(RESPONSAVEIS_PADRAO_AT),
    ],
  },
];

/** Dias de antecedência do alerta de vencimento de calibração. */
export const ALERTA_CALIBRACAO_DIAS = 60;

function procedimentosManutencao(): SectionDef[] {
  return [
    {
      titulo: '3. Procedimentos',
      descricao: 'C = Conforme · NA = Não aplicável',
      campos: [
        cnc('proc_inspecao_visual', 'Inspeção visual interna e externa'),
        cnc('proc_teste_desempenho', 'Teste de desempenho'),
        cnc('proc_teste_seguranca_eletrica', 'Teste de segurança elétrica'),
        cnc('proc_teste_integridade', 'Teste de integridade dos componentes'),
        cnc('proc_teste_funcional', 'Teste funcional'),
      ],
    },
    {
      titulo: '4. Manutenção e peças',
      campos: [
        {
          name: 'tipo_manutencao',
          label: 'Manutenção',
          type: 'select',
          required: true,
          options: [
            { value: 'orcamento', label: 'Orçamento' },
            { value: 'garantia', label: 'Em garantia' },
          ],
        },
        {
          name: 'troca_peca',
          label: 'Necessário a troca de peça',
          type: 'select',
          required: true,
          options: [
            { value: 'sim', label: 'Sim' },
            { value: 'nao', label: 'Não' },
          ],
        },
        { name: 'problema_cliente', label: 'Problema relatado pelo cliente', type: 'textarea', required: true },
        { name: 'problema_tecnico', label: 'Problema identificado pelo técnico', type: 'textarea', required: true },
        { name: 'tecnico_responsavel', label: 'Técnico responsável (nome)', type: 'text', required: true },
        { name: 'data_conclusao', label: 'Data', type: 'date', required: true, defaultValue: hojeDefault },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------

export function getFormDef(tipo: string): FormDef | undefined {
  return FORM_DEFS.find((d) => d.tipo === tipo);
}

export function getSubtipo(def: FormDef, subtipo: string | null | undefined): SubtipoDef | undefined {
  return def.subtipos?.find((s) => s.key === subtipo);
}

/** Seções efetivas do formulário (base + subtipo). */
export function getSecoes(def: FormDef, subtipo?: string | null): SectionDef[] {
  const extra = getSubtipo(def, subtipo)?.secoes ?? [];
  return [...def.secoes, ...extra];
}

export function getCampos(def: FormDef, subtipo?: string | null): FieldDef[] {
  return getSecoes(def, subtipo).flatMap((s) => s.campos);
}

/** Verifica se o campo está visível dado o estado atual do formulário. */
export function campoVisivel(campo: FieldDef, dados: Record<string, unknown>): boolean {
  if (!campo.showIf) return true;
  const atual = dados[campo.showIf.field];
  if (typeof campo.showIf.equals === 'boolean') return Boolean(atual) === campo.showIf.equals;
  return atual === campo.showIf.equals;
}

function vazio(v: unknown): boolean {
  return v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
}

function obterValorComDefault(campo: FieldDef, dados: Record<string, unknown>): unknown {
  const valor = dados[campo.name];
  if (
    vazio(valor) &&
    campo.defaultValue !== undefined &&
    campo.defaultValue !== DEFAULT_HOJE
  ) {
    return campo.defaultValue;
  }
  return valor;
}

/** Valida os dados contra a definição. Retorna mapa campo → mensagem. */
export function validarDados(
  def: FormDef,
  subtipo: string | null | undefined,
  dados: Record<string, unknown>,
): Record<string, string> {
  const erros: Record<string, string> = {};

  if (def.subtipos && !getSubtipo(def, subtipo)) {
    erros.subtipo = 'Selecione o submódulo (marca).';
    return erros;
  }

  // Regra Seção 3.2: se no REG 016 o orçamento estiver reprovado (VERMELHA), bloqueia preenchimento do Item 5
  if (def.tipo === 'etapas-manutencao' && !vazio(dados.item5_marca)) {
    const bloqueio = verificarBloqueioItem5Reg016({
      etiquetaAtual: String(dados.etiqueta_atual ?? ''),
      orcamentoReprovado: dados.orcamento_reprovado,
    });
    if (bloqueio.bloqueado && bloqueio.motivo) {
      erros.item5_marca = bloqueio.motivo;
    }
  }

  for (const campo of getCampos(def, subtipo)) {
    if (!campoVisivel(campo, dados)) continue;
    const valor = obterValorComDefault(campo, dados);

    if (campo.required && (campo.type === 'checkbox' ? false : vazio(valor))) {
      erros[campo.name] = 'Campo obrigatório.';
      continue;
    }
    if (vazio(valor)) continue;

    if (campo.type === 'number' && !Number.isFinite(Number(valor))) {
      erros[campo.name] = 'Informe um número válido.';
    } else if (campo.type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(String(valor))) {
      erros[campo.name] = 'Data inválida.';
    } else if (campo.type === 'cnc' && !['C', 'NC', 'NA'].includes(String(valor))) {
      erros[campo.name] = 'Selecione C, NC ou NA.';
    } else if (
      campo.type === 'select' &&
      campo.options &&
      !campo.options.some((o) => o.value === String(valor))
    ) {
      erros[campo.name] = 'Opção inválida.';
    }
  }

  return erros;
}

/** Remove do payload campos desconhecidos/ocultos, normaliza tipos e aplica bloqueio de governança por perfil. */
export function sanitizarDados(
  def: FormDef,
  subtipo: string | null | undefined,
  dados: Record<string, unknown>,
  perfil?: Perfil | null,
): Record<string, unknown> {
  const limpo: Record<string, unknown> = {};
  const bloquearGovernanca = perfil !== undefined && !canEditGovernance(perfil);

  for (const campo of getCampos(def, subtipo)) {
    if (!campoVisivel(campo, dados)) continue;
    if (bloquearGovernanca && campo.governanceOnly && campo.defaultValue !== undefined) {
      limpo[campo.name] = String(campo.defaultValue).trim();
      continue;
    }
    const valor = obterValorComDefault(campo, dados);
    if (campo.type === 'checkbox') {
      limpo[campo.name] = Boolean(valor);
    } else if (!vazio(valor)) {
      limpo[campo.name] = campo.type === 'number' ? Number(valor) : String(valor).trim();
    }
  }
  return limpo;
}

export type StatusRegistro = 'conforme' | 'nao_conforme';

/** Faixas de aceitação do REG-017. */
export const FAIXA_TEMPERATURA_MAX = 30;
export const FAIXA_UMIDADE = { min: 40, max: 70 } as const;

/** Avalia a conformidade do registro (itens NC, resultados reprovados, leituras fora da faixa). */
export function avaliarConformidade(
  def: FormDef,
  subtipo: string | null | undefined,
  dados: Record<string, unknown>,
): StatusRegistro {
  const campos = getCampos(def, subtipo);
  if (campos.some((c) => c.type === 'cnc' && dados[c.name] === 'NC')) return 'nao_conforme';

  switch (def.tipo) {
    case 'pulseira-antiestatica':
      return dados.resultado === 'reprovado' ? 'nao_conforme' : 'conforme';
    case 'verificacao-calibracao':
      return dados.resultado_final === 'nao_conforme' ||
        Object.entries(dados).some(([k, v]) => k.endsWith('_conformidade') && v === 'nao_conforme')
        ? 'nao_conforme'
        : 'conforme';
    case 'temperatura-umidade': {
      const t = Number(dados.temperatura_atual);
      const u = Number(dados.umidade_atual);
      const tempFora = Number.isFinite(t) && t > FAIXA_TEMPERATURA_MAX;
      const umidFora = Number.isFinite(u) && (u < FAIXA_UMIDADE.min || u > FAIXA_UMIDADE.max);
      return tempFora || umidFora ? 'nao_conforme' : 'conforme';
    }
    default:
      return 'conforme';
  }
}

export const STATUS_REGISTRO_LABEL: Record<StatusRegistro, string> = {
  conforme: 'Conforme',
  nao_conforme: 'Não conforme',
};

export const SETOR_FORM_LABEL: Record<SetorFormulario, string> = {
  assistencia_tecnica: 'Assistência Técnica',
  almoxarifado: 'Almoxarifado',
  administrativo: 'Administrativo (ADM)',
};
