/**
 * Feriados iniciais para a janela de horário (Decisão D9 · R06):
 * Feriados Nacionais do Brasil + Pernambuco / Recife-PE (configuráveis pelo ADM).
 */
export interface FeriadoRecord {
  data: string; // 'YYYY-MM-DD'
  descricao: string;
  escopo: 'nacional' | 'estadual_pe' | 'municipal_recife' | 'personalizado';
}

export const FERIADOS_PADRAO_RECIFE_PE: FeriadoRecord[] = [
  // 2026 — Nacionais + PE + Recife
  { data: '2026-01-01', descricao: 'Confraternização Universal', escopo: 'nacional' },
  { data: '2026-02-17', descricao: 'Carnaval', escopo: 'nacional' },
  { data: '2026-03-06', descricao: 'Data Magna de Pernambuco (Revolução Pernambucana)', escopo: 'estadual_pe' },
  { data: '2026-04-03', descricao: 'Sexta-Feira Santa (Paixão de Cristo)', escopo: 'nacional' },
  { data: '2026-04-21', descricao: 'Tiradentes', escopo: 'nacional' },
  { data: '2026-05-01', descricao: 'Dia Mundial do Trabalho', escopo: 'nacional' },
  { data: '2026-06-04', descricao: 'Corpus Christi', escopo: 'municipal_recife' },
  { data: '2026-06-24', descricao: 'São João (Recife / Pernambuco)', escopo: 'municipal_recife' },
  { data: '2026-07-16', descricao: 'Nossa Senhora do Carmo (Padroeira do Recife)', escopo: 'municipal_recife' },
  { data: '2026-09-07', descricao: 'Independência do Brasil', escopo: 'nacional' },
  { data: '2026-10-12', descricao: 'Nossa Senhora Aparecida', escopo: 'nacional' },
  { data: '2026-11-02', descricao: 'Finados', escopo: 'nacional' },
  { data: '2026-11-15', descricao: 'Proclamação da República', escopo: 'nacional' },
  { data: '2026-11-20', descricao: 'Dia Nacional de Zumbi e da Consciência Negra', escopo: 'nacional' },
  { data: '2026-12-08', descricao: 'Nossa Senhora da Conceição (Recife)', escopo: 'municipal_recife' },
  { data: '2026-12-25', descricao: 'Natal', escopo: 'nacional' },

  // 2027 — Nacionais + PE + Recife
  { data: '2027-01-01', descricao: 'Confraternização Universal', escopo: 'nacional' },
  { data: '2027-02-09', descricao: 'Carnaval', escopo: 'nacional' },
  { data: '2027-03-06', descricao: 'Data Magna de Pernambuco', escopo: 'estadual_pe' },
  { data: '2027-03-26', descricao: 'Sexta-Feira Santa (Paixão de Cristo)', escopo: 'nacional' },
  { data: '2027-04-21', descricao: 'Tiradentes', escopo: 'nacional' },
  { data: '2027-05-01', descricao: 'Dia Mundial do Trabalho', escopo: 'nacional' },
  { data: '2027-05-27', descricao: 'Corpus Christi', escopo: 'municipal_recife' },
  { data: '2027-06-24', descricao: 'São João (Recife / Pernambuco)', escopo: 'municipal_recife' },
  { data: '2027-07-16', descricao: 'Nossa Senhora do Carmo (Padroeira do Recife)', escopo: 'municipal_recife' },
  { data: '2027-09-07', descricao: 'Independência do Brasil', escopo: 'nacional' },
  { data: '2027-10-12', descricao: 'Nossa Senhora Aparecida', escopo: 'nacional' },
  { data: '2027-11-02', descricao: 'Finados', escopo: 'nacional' },
  { data: '2027-11-15', descricao: 'Proclamação da República', escopo: 'nacional' },
  { data: '2027-11-20', descricao: 'Dia Nacional de Zumbi e da Consciência Negra', escopo: 'nacional' },
  { data: '2027-12-08', descricao: 'Nossa Senhora da Conceição (Recife)', escopo: 'municipal_recife' },
  { data: '2027-12-25', descricao: 'Natal', escopo: 'nacional' },
];

export const FERIADOS_DATAS_PADRAO: string[] = FERIADOS_PADRAO_RECIFE_PE.map((f) => f.data);
