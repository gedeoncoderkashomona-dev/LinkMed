import type { Perfil } from '@/core/domain/enums/user';

/**
 * Catálogo dos formulários operacionais (REG-xxx) da Assistência Técnica / Almoxarifado.
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
}

export interface SectionDef {
  titulo: string;
  descricao?: string;
  campos: FieldDef[];
}

export type SetorFormulario = 'assistencia_tecnica' | 'almoxarifado';

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
// Blocos reutilizáveis
// ---------------------------------------------------------------------------

const PERFIS_AT: Perfil[] = ['diretor', 'gestor', 'tecnico'];
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

function secaoResponsaveis(resp: ResponsaveisDocumento = RESPONSAVEIS_PADRAO_AT): SectionDef {
  return {
    titulo: 'Responsáveis pelo Documento (Elaboração, Revisão e Aprovação)',
    descricao: 'Governança documental obrigatória conforme RDC 665/2022 (ANVISA).',
    campos: [
      {
        name: 'elaborado_por',
        label: 'Elaborado por (Responsável pela Elaboração)',
        type: 'text',
        required: true,
        defaultValue: resp.elaboradoPor,
      },
      {
        name: 'revisado_por',
        label: 'Revisado por (Responsável pela Revisão)',
        type: 'text',
        required: true,
        defaultValue: resp.revisadoPor,
      },
      {
        name: 'aprovado_por',
        label: 'Aprovado por (Responsável pela Aprovação)',
        type: 'text',
        required: true,
        defaultValue: resp.aprovadoPor,
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
  { value: 'contratado_cliente', label: 'Transporte contratado pelo cliente' },
  { value: 'proprio_cliente', label: 'Transporte do próprio cliente' },
  { value: 'correios', label: 'Correios' },
];

// ---------------------------------------------------------------------------
// Checklist de manutenção (REG-035) — itens por marca
// ---------------------------------------------------------------------------

function itensCnc(prefixo: string, itens: string[]): FieldDef[] {
  return itens.map((label) =>
    cnc(
      `${prefixo}_${label
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '')}`,
      label,
    ),
  );
}

const OLIDEF_ITENS: SectionDef[] = [
  {
    titulo: '2. Equipamento — Checagem dos itens (Olidef)',
    campos: itensCnc('ol', [
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
    ]),
  },
];

const TEB_ITENS: SectionDef[] = [
  {
    titulo: '2. Equipamento — Checagem dos itens (TEB)',
    campos: [
      ...itensCnc('teb', [
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
      ]),
      { name: 'teb_banco_dados', label: 'Banco de dados', type: 'text' },
      { name: 'teb_quantidade_exames', label: 'Quantidade de exames', type: 'number' },
      { name: 'teb_versao_sistema', label: 'Versão do sistema', type: 'text' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------------

export const FORM_DEFS: FormDef[] = [
  {
    tipo: 'inspecao-recebimento',
    reg: 'REG-022',
    titulo: 'Inspeção de Recebimento',
    descricao:
      'Checklist de inspeção visual no recebimento do equipamento. Disponível na Assistência Técnica e no Almoxarifado.',
    setores: ['assistencia_tecnica', 'almoxarifado'],
    perfis: PERFIS_AT_ALMOX,
    campoData: 'data_liberacao',
    responsaveis: RESPONSAVEIS_PADRAO_ALMOX,
    secoes: [
      {
        titulo: 'Identificação do equipamento',
        campos: [
          { name: 'cliente', label: 'Cliente', type: 'text', required: true },
          { name: 'equipamento', label: 'Equipamento', type: 'text', required: true },
          { name: 'marca', label: 'Marca', type: 'text', required: true },
          { name: 'modelo', label: 'Modelo', type: 'text', required: true },
          { name: 'numero_serie', label: 'Nº de série', type: 'text', required: true },
        ],
      },
      {
        titulo: 'Inspeção visual',
        descricao: 'C = Conforme · NC = Não conforme',
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
        titulo: 'Liberação',
        campos: [
          { name: 'relato_cliente', label: 'Relato do cliente', type: 'textarea' },
          { name: 'responsavel_liberacao', label: 'Responsável pela liberação', type: 'text', required: true },
          { name: 'data_liberacao', label: 'Data da liberação', type: 'date', required: true, defaultValue: hojeDefault },
        ],
      },
      secaoResponsaveis(RESPONSAVEIS_PADRAO_ALMOX),
    ],
  },
  {
    tipo: 'limpeza-equipamento',
    reg: 'REG-034',
    titulo: 'Limpeza de Equipamento',
    descricao: 'Checklist de verificação para limpeza e higienização de equipamentos (álcool 70%).',
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
          { name: 'assinatura_tecnico', label: 'Assinatura do técnico (nome)', type: 'text', required: true },
        ],
      },
      secaoResponsaveis(RESPONSAVEIS_PADRAO_AT),
    ],
  },
  {
    tipo: 'etapas-manutencao',
    reg: 'REG-016',
    titulo: 'Etapas da Manutenção',
    descricao: 'Checklist das etapas de manutenção com a legenda de etiquetas de status do equipamento.',
    setores: ['assistencia_tecnica'],
    perfis: PERFIS_AT,
    campoData: 'data_abertura',
    responsaveis: RESPONSAVEIS_PADRAO_AT,
    secoes: [
      {
        titulo: '1. Identificação',
        campos: [
          { name: 'cliente', label: 'Cliente', type: 'text', required: true },
          { name: 'data_abertura', label: 'Data de abertura', type: 'date', required: true, defaultValue: hojeDefault },
          { name: 'numero_os', label: 'Nº OS', type: 'text', required: true },
          { name: 'equipamento', label: 'Equipamento', type: 'text', required: true },
          { name: 'numero_serie', label: 'Nº de série', type: 'text' },
        ],
      },
      {
        titulo: '2. Verificação antes da manutenção',
        descricao: 'C = Conforme · NA = Não se aplica',
        campos: [
          cnc('conferencia_pecas', 'Conferência de todas as peças listadas na OS do sistema ERP para o conserto'),
          cnc('etiqueta_violeta', 'Após a higienização: etiqueta VIOLETA — Equipamento higienizado'),
          cnc('etiqueta_cinza', 'Após a análise: etiqueta CINZA — Análise completa'),
          cnc('etiqueta_laranja', 'Equipamento em garantia: etiqueta LARANJA'),
          cnc('etiqueta_verde_sem_defeito', 'Nenhum defeito identificado: etiqueta VERDE para finalizar o serviço'),
        ],
      },
      {
        titulo: '3. Etapas do checklist',
        campos: [
          {
            name: 'enviado_fabrica',
            label: 'Equipamento necessita ser encaminhado à fábrica — etiqueta MARROM (Enviado à fábrica)',
            type: 'checkbox',
          },
          {
            name: 'tipo_transporte',
            label: 'Tipo de transporte da devolução ao fabricante',
            type: 'select',
            required: true,
            options: TIPOS_TRANSPORTE,
            showIf: { field: 'enviado_fabrica', equals: true },
            hint: 'Obrigatório quando a etiqueta de devolução ao fabricante é selecionada.',
          },
          cnc('orcamento_enviado', 'Orçamento enviado ao cliente: etiqueta AMARELA — Aguardando aprovação'),
          cnc('orcamento_aprovado', 'Cliente aprovou o orçamento: etiqueta AZUL — Orçamento aprovado'),
          cnc('orcamento_reprovado', 'Cliente reprovou o orçamento: etiqueta VERMELHA — Não aprovado / não conforme'),
          cnc('falta_itens_estoque', 'Estoque com falta de itens e componentes: etiqueta PRETA — Aguardando peças'),
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
          { name: 'assinatura_tecnico', label: 'Assinatura do técnico (nome)', type: 'text', required: true },
        ],
      },
      secaoResponsaveis(RESPONSAVEIS_PADRAO_AT),
    ],
  },
  {
    tipo: 'verificacao-calibracao',
    reg: 'REG-030',
    titulo: 'Controle de Verificação da Calibração',
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
    titulo: 'Checklist de Manutenção de Equipamento',
    descricao: 'Checklist de manutenção com submódulos específicos por marca: OLIDEF e TEB.',
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
    ],
  },
  {
    tipo: 'higienizacao-bancada',
    reg: 'REG-018',
    titulo: 'Higienização da Bancada',
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
    titulo: 'Teste da Pulseira Antiestática',
    descricao: 'Monitoramento do teste da pulseira antiestática dos colaboradores.',
    setores: ['assistencia_tecnica'],
    perfis: PERFIS_AT,
    campoData: 'data',
    responsaveis: RESPONSAVEIS_PADRAO_AT,
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
    titulo: 'Controle de Temperatura e Umidade',
    descricao: 'Leitura do termohigrômetro da Assistência Técnica (mín., máx. e atual).',
    setores: ['assistencia_tecnica'],
    perfis: PERFIS_AT,
    campoData: 'data',
    responsaveis: RESPONSAVEIS_PADRAO_AT,
    alerta: { mensagem: 'Registrar duas vezes ao dia (manhã e tarde).' },
    secoes: [
      {
        titulo: 'Leitura',
        descricao:
          'Aceitação: temperatura até 30 °C · umidade 40% a 70%. Armazenamento ideal: 17 °C a 22 °C. Resetar o termohigrômetro após cada leitura.',
        campos: [
          { name: 'data', label: 'Dia', type: 'date', required: true, defaultValue: hojeDefault },
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
    reg: null,
    titulo: 'Validade de Calibração de Equipamentos',
    descricao: 'Controle de validade das calibrações. Alerta 60 dias antes do vencimento.',
    setores: ['assistencia_tecnica'],
    perfis: PERFIS_AT,
    campoData: 'data_calibracao',
    responsaveis: RESPONSAVEIS_PADRAO_AT,
    alerta: { mensagem: 'Alerta 60 dias antes do vencimento da calibração.' },
    secoes: [
      {
        titulo: 'Equipamento e calibração',
        campos: [
          { name: 'equipamento', label: 'Equipamento', type: 'text', required: true },
          { name: 'marca_modelo', label: 'Marca / modelo', type: 'text' },
          { name: 'numero_serie', label: 'Nº de série', type: 'text', required: true },
          { name: 'data_calibracao', label: 'Data da calibração', type: 'date', required: true, defaultValue: hojeDefault },
          { name: 'validade', label: 'Validade da calibração', type: 'date', required: true },
          { name: 'certificado', label: 'Nº do certificado', type: 'text' },
          { name: 'laboratorio', label: 'Laboratório', type: 'text' },
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

/** Remove do payload campos desconhecidos/ocultos e normaliza tipos. */
export function sanitizarDados(
  def: FormDef,
  subtipo: string | null | undefined,
  dados: Record<string, unknown>,
): Record<string, unknown> {
  const limpo: Record<string, unknown> = {};
  for (const campo of getCampos(def, subtipo)) {
    if (!campoVisivel(campo, dados)) continue;
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
};
