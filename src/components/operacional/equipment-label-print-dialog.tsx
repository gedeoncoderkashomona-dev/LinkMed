'use client';

import * as React from 'react';
import { CheckCircle2, Printer, QrCode, Tag } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface DadosEtiquetaEquipamento {
  numeroOs: string;
  cliente: string;
  equipamento: string;
  marca: string;
  modelo: string;
  numeroSerie: string;
  dataAnalise?: string;
  responsavelAnalise?: string;
  statusEtiqueta?: string;
}

interface EquipmentLabelPrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dados: DadosEtiquetaEquipamento | null;
}

export function EquipmentLabelPrintDialog({
  open,
  onOpenChange,
  dados,
}: EquipmentLabelPrintDialogProps) {
  if (!dados) return null;

  const dataFormatada = dados.dataAnalise
    ? dados.dataAnalise.includes('-')
      ? dados.dataAnalise.slice(0, 10).split('-').reverse().join('/')
      : dados.dataAnalise
    : new Date().toLocaleDateString('pt-BR');

  function handlePrint() {
    if (!dados) return;
    const win = window.open('', '_blank', 'width=560,height=440');
    if (!win) {
      window.print();
      return;
    }

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Etiqueta de Identificação — OS ${dados.numeroOs}</title>
  <style>
    @page { size: 100mm 65mm; margin: 4mm; }
    * { box-sizing: border-box; font-family: Arial, Helvetica, sans-serif; }
    body { margin: 0; padding: 8px; background: #fff; color: #0f172a; }
    .label-box {
      border: 2px solid #0f172a;
      border-radius: 6px;
      padding: 10px 12px;
      width: 100%;
      max-width: 440px;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 6px;
      margin-bottom: 8px;
    }
    .brand { font-size: 13px; font-weight: 800; letter-spacing: 0.4px; }
    .os-pill {
      background: #0f172a;
      color: #fff;
      padding: 3px 8px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 13px;
      font-weight: 700;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 10px;
      font-size: 11px;
    }
    .full { grid-column: span 2; }
    .k { font-size: 9px; text-transform: uppercase; color: #475569; font-weight: 700; }
    .v { font-size: 12px; font-weight: 700; color: #0f172a; margin-top: 1px; }
    .footer {
      margin-top: 8px;
      padding-top: 6px;
      border-top: 1px dashed #64748b;
      display: flex;
      justify-content: space-between;
      font-size: 9px;
      color: #334155;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="label-box">
    <div class="header">
      <div>
        <div class="brand">LINKMED SOLUÇÕES MÉDICAS</div>
        <div style="font-size:9px;color:#475569;">ETIQUETA DE IDENTIFICAÇÃO DO EQUIPAMENTO (ITEM 1 · REG 022)</div>
      </div>
      <div class="os-pill">OS: ${dados.numeroOs}</div>
    </div>
    <div class="grid">
      <div class="full">
        <div class="k">Cliente</div>
        <div class="v">${dados.cliente || '—'}</div>
      </div>
      <div class="full">
        <div class="k">Equipamento</div>
        <div class="v">${dados.equipamento || '—'}</div>
      </div>
      <div>
        <div class="k">Marca</div>
        <div class="v">${dados.marca || '—'}</div>
      </div>
      <div>
        <div class="k">Modelo</div>
        <div class="v">${dados.modelo || '—'}</div>
      </div>
      <div>
        <div class="k">Nº de Série (S/N)</div>
        <div class="v" style="font-family:monospace;">${dados.numeroSerie || '—'}</div>
      </div>
      <div>
        <div class="k">Status / Análise</div>
        <div class="v">${dados.statusEtiqueta || 'CINZA — Análise Completa'}</div>
      </div>
    </div>
    <div class="footer">
      <span>Data da Análise: ${dataFormatada}</span>
      <span>RDC 665/2022 · POP-020 / REG-022 / REG-016</span>
    </div>
  </div>
  <script>
    window.onload = function() { window.print(); };
  </script>
</body>
</html>`;

    win.document.open();
    win.document.write(html);
    win.document.close();
    toast.success(`Etiqueta da OS ${dados.numeroOs} enviada para impressão!`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            Etiqueta de Identificação do Equipamento (Seção 5.4)
          </DialogTitle>
          <DialogDescription>
            Gerada automaticamente após a conclusão da análise técnica (Etiqueta CINZA), puxando os dados do Item 1 do REG 022.
          </DialogDescription>
        </DialogHeader>

        {/* Pré-visualização fiel da etiqueta física */}
        <div className="rounded-xl border-2 border-slate-900 bg-white p-4 text-slate-900 shadow-sm dark:border-slate-300">
          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2.5">
            <div>
              <p className="text-xs font-extrabold tracking-wide text-slate-900">
                LINKMED SOLUÇÕES MÉDICAS
              </p>
              <p className="text-[10px] font-medium text-slate-600">
                IDENTIFICAÇÃO DO EQUIPAMENTO · ORIGEM: ITEM 1 DO REG 022
              </p>
            </div>
            <div className="flex items-center gap-1.5 rounded bg-slate-900 px-2.5 py-1 font-mono text-xs font-bold text-white">
              <QrCode className="h-3.5 w-3.5" />
              OS: {dados.numeroOs}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2.5 text-xs">
            <div className="col-span-2 rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5">
              <p className="text-[9px] font-bold uppercase text-slate-500">Cliente</p>
              <p className="font-bold text-slate-900">{dados.cliente || '—'}</p>
            </div>

            <div className="col-span-2 rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5">
              <p className="text-[9px] font-bold uppercase text-slate-500">Equipamento</p>
              <p className="font-bold text-slate-900">{dados.equipamento || '—'}</p>
            </div>

            <div className="rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5">
              <p className="text-[9px] font-bold uppercase text-slate-500">Marca</p>
              <p className="font-bold text-slate-900">{dados.marca || '—'}</p>
            </div>

            <div className="rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5">
              <p className="text-[9px] font-bold uppercase text-slate-500">Modelo</p>
              <p className="font-bold text-slate-900">{dados.modelo || '—'}</p>
            </div>

            <div className="rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5">
              <p className="text-[9px] font-bold uppercase text-slate-500">
                Número de Série (S/N)
              </p>
              <p className="font-mono font-bold text-slate-900">
                {dados.numeroSerie || '—'}
              </p>
            </div>

            <div className="rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5">
              <p className="text-[9px] font-bold uppercase text-slate-500">
                Etapa / Etiqueta
              </p>
              <Badge variant="secondary" className="mt-0.5 text-[10px] font-bold">
                {dados.statusEtiqueta || 'CINZA — Análise Completa'}
              </Badge>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-dashed border-slate-400 pt-2 text-[10px] font-semibold text-slate-600">
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              Análise concluída em {dataFormatada}
            </span>
            <span className="font-mono">RDC 665/22 · POP-020</span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button type="button" onClick={handlePrint} className="gap-1.5">
            <Printer className="h-4 w-4" />
            Imprimir Etiqueta de Identificação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

