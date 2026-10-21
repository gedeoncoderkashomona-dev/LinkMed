'use client';

import * as React from 'react';
import { UploadCloud } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectNative } from '@/components/ui/select-native';
import { Textarea } from '@/components/ui/textarea';
import { SETORES, SETOR_LABEL, type Setor } from '@/core/domain/enums/pop';
import { useCreatePop } from '@/hooks/use-pops';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UploadPopDialog({ open, onOpenChange }: Props) {
  const [titulo, setTitulo] = React.useState('');
  const [descricao, setDescricao] = React.useState('');
  const [setor, setSetor] = React.useState<Setor>('qualidade');
  const [periodicidade, setPeriodicidade] = React.useState(24);
  const [elaboradoPor, setElaboradoPor] = React.useState('Vanessa Ribeiro (Gestão da Qualidade)');
  const [revisadoPor, setRevisadoPor] = React.useState('Marina Lopes (Responsável Técnica)');
  const [aprovadoPorNome, setAprovadoPorNome] = React.useState('Pedro Costa (Diretoria)');
  const [arquivo, setArquivo] = React.useState<File | null>(null);
  const create = useCreatePop();

  function reset() {
    setTitulo('');
    setDescricao('');
    setSetor('qualidade');
    setPeriodicidade(24);
    setElaboradoPor('Vanessa Ribeiro (Gestão da Qualidade)');
    setRevisadoPor('Marina Lopes (Responsável Técnica)');
    setAprovadoPorNome('Pedro Costa (Diretoria)');
    setArquivo(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!arquivo) {
      toast.error('Selecione o arquivo PDF.');
      return;
    }
    if (arquivo.type !== 'application/pdf') {
      toast.error('Apenas arquivos PDF.');
      return;
    }
    if (arquivo.size > 20 * 1024 * 1024) {
      toast.error('Arquivo excede 20 MB.');
      return;
    }

    try {
      await create.mutateAsync({
        titulo,
        descricao: descricao || null,
        setor,
        periodicidadeRevisaoMeses: periodicidade,
        elaboradoPor: elaboradoPor.trim() || null,
        revisadoPor: revisadoPor.trim() || null,
        aprovadoPorNome: aprovadoPorNome.trim() || null,
        arquivo,
      });
      toast.success('POP criado com os responsáveis registrados!');
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao subir POP.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Subir POP</DialogTitle>
          <DialogDescription>
            O arquivo precisa ser PDF (até 20 MB). Informe os responsáveis pela elaboração,
            revisão e aprovação (RDC 665/22).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex.: Gestão de Documentos e Registros"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="setor">Setor *</Label>
              <SelectNative
                id="setor"
                value={setor}
                onChange={(e) => setSetor(e.target.value as Setor)}
              >
                {SETORES.map((s) => (
                  <option key={s} value={s}>
                    {SETOR_LABEL[s]}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="periodicidade">Revisão (meses)</Label>
              <Input
                id="periodicidade"
                type="number"
                min={1}
                max={120}
                value={periodicidade}
                onChange={(e) => setPeriodicidade(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2.5">
            <p className="text-xs font-semibold text-foreground">
              Responsáveis pelo POP (Elaboração, Revisão e Aprovação)
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="pop-elaborado" className="text-xs">
                Responsável pela Elaboração *
              </Label>
              <Input
                id="pop-elaborado"
                value={elaboradoPor}
                onChange={(e) => setElaboradoPor(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pop-revisado" className="text-xs">
                Responsável pela Revisão *
              </Label>
              <Input
                id="pop-revisado"
                value={revisadoPor}
                onChange={(e) => setRevisadoPor(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pop-aprovado" className="text-xs">
                Responsável pela Aprovação *
              </Label>
              <Input
                id="pop-aprovado"
                value={aprovadoPorNome}
                onChange={(e) => setAprovadoPorNome(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="descricao">Descrição (opcional)</Label>
            <Textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Resumo do procedimento..."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="arquivo">Arquivo PDF *</Label>
            <label
              htmlFor="arquivo"
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/40 px-4 py-5 text-center transition-colors hover:border-primary/50 hover:bg-muted"
            >
              <UploadCloud className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm font-medium">
                {arquivo ? arquivo.name : 'Clique para escolher o PDF'}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {arquivo
                  ? `${(arquivo.size / 1024 / 1024).toFixed(2)} MB`
                  : 'PDF até 20 MB'}
              </span>
              <input
                id="arquivo"
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Enviando...' : 'Criar POP'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
