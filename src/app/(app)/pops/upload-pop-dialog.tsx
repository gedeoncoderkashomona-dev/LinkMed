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
  const [arquivo, setArquivo] = React.useState<File | null>(null);
  const create = useCreatePop();

  function reset() {
    setTitulo('');
    setDescricao('');
    setSetor('qualidade');
    setPeriodicidade(24);
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
        arquivo,
      });
      toast.success('POP criado como rascunho.');
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao subir POP.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Subir POP</DialogTitle>
          <DialogDescription>
            O arquivo precisa ser PDF (até 20 MB). O sistema gera o código sequencial e
            calcula o hash SHA-256 automaticamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título</Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex.: Gestão de Documentos e Registros"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="setor">Setor</Label>
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
            <div className="space-y-2">
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

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição (opcional)</Label>
            <Textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Resumo do procedimento..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="arquivo">Arquivo PDF</Label>
            <label
              htmlFor="arquivo"
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/40 px-4 py-6 text-center transition-colors hover:border-primary/50 hover:bg-muted"
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