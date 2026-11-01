'use client';

import * as React from 'react';
import { CheckCircle2, Eraser, PenTool, ShieldCheck } from 'lucide-react';

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
import {
  gerarAssinaturaEletronicaLgpd,
  type RegistroAssinaturaLgpd,
} from '@/core/domain/signatures/electronic-signature';

interface SignaturePadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  signatarioNome?: string;
  signatarioNomePadrao?: string;
  signatarioId?: string;
  signatarioIdPadrao?: string;
  funcaoOuPerfil?: string;
  funcaoPadrao?: string;
  documentoCodigo: string;
  tituloModal?: string;
  documentoTitulo?: string;
  onConfirmSignature?: (registro: RegistroAssinaturaLgpd) => void;
  onConfirm?: (registro: RegistroAssinaturaLgpd) => void;
}

export function SignaturePadDialog({
  open,
  onOpenChange,
  signatarioNome,
  signatarioNomePadrao,
  signatarioId,
  signatarioIdPadrao,
  funcaoOuPerfil,
  funcaoPadrao,
  documentoCodigo,
  tituloModal,
  documentoTitulo,
  onConfirmSignature,
  onConfirm,
}: SignaturePadDialogProps) {
  const nomeResolvido = signatarioNome ?? signatarioNomePadrao ?? 'Colaborador Autenticado';
  const idResolvido = signatarioId ?? signatarioIdPadrao;
  const funcaoResolvida = funcaoOuPerfil ?? funcaoPadrao ?? 'Colaborador';
  const tituloResolvido = tituloModal ?? documentoTitulo ?? 'Assinatura Eletrônica pela Tela';
  const callbackConfirmar = onConfirmSignature ?? onConfirm;
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [desenhando, setDesenhando] = React.useState(false);
  const [temTraço, setTemTraço] = React.useState(false);
  const [aceiteLgpd, setAceiteLgpd] = React.useState(true);
  const [erro, setErro] = React.useState<string | null>(null);

  const limparCanvas = React.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setTemTraço(false);
    setErro(null);
  }, []);

  React.useEffect(() => {
    if (open) {
      setErro(null);
      setAceiteLgpd(true);
      setTimeout(() => limparCanvas(), 50);
    }
  }, [open, limparCanvas]);

  function obterCoordenadas(
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      const touch = e.touches[0] ?? e.changedTouches[0];
      return {
        x: ((touch?.clientX ?? 0) - rect.left) * scaleX,
        y: ((touch?.clientY ?? 0) - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function iniciarDesenho(
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = obterCoordenadas(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f3460';
    setDesenhando(true);
    setTemTraço(true);
  }

  function moverDesenho(
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) {
    if (!desenhando) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = obterCoordenadas(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function finalizarDesenho() {
    setDesenhando(false);
  }

  function handleConfirmar(usarApenasCredencial = false) {
    setErro(null);
    if (!aceiteLgpd) {
      setErro('Confirme o termo de finalidade regulatória LGPD / RDC 665/22.');
      return;
    }

    let rubricaDataUrl: string | null = null;
    if (!usarApenasCredencial && temTraço && canvasRef.current) {
      rubricaDataUrl = canvasRef.current.toDataURL('image/png');
    }

    try {
      const registro = gerarAssinaturaEletronicaLgpd({
        signatarioNome: nomeResolvido,
        signatarioId: idResolvido,
        funcaoOuPerfil: funcaoResolvida,
        documentoCodigo,
        rubricaDataUrl,
        aceiteTermoLgpd: aceiteLgpd,
      });
      callbackConfirmar?.(registro);
      onOpenChange(false);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha ao assinar.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge variant="default" className="gap-1 font-mono text-[10px]">
              <ShieldCheck className="h-3 w-3" />
              LGPD & Lei 14.063/2020
            </Badge>
            <Badge variant="outline" className="font-mono text-[10px]">
              {documentoCodigo}
            </Badge>
          </div>
          <DialogTitle className="mt-1">
            {tituloResolvido}
          </DialogTitle>
          <DialogDescription>
            Assine no quadro abaixo com o dedo, caneta touch ou mouse para gerar o selo criptográfico de auditoria.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {erro && (
            <p className="rounded-lg bg-rose-500/10 p-2.5 text-xs font-medium text-rose-600">
              {erro}
            </p>
          )}

          <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-muted/30 p-2.5 text-xs">
            <div>
              <span className="text-muted-foreground">Signatário:</span>
              <p className="font-semibold text-foreground truncate">{nomeResolvido || '—'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Função / Perfil:</span>
              <p className="font-semibold text-foreground truncate">{funcaoResolvida || '—'}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium flex items-center gap-1.5 text-foreground">
                <PenTool className="h-3.5 w-3.5 text-primary" />
                Quadro de Rubrica Digital (Toque ou Mouse)
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={limparCanvas}
                className="h-7 px-2 text-xs"
              >
                <Eraser className="h-3.5 w-3.5" />
                Limpar traço
              </Button>
            </div>

            <div className="overflow-hidden rounded-xl border-2 border-dashed border-primary/35 bg-white">
              <canvas
                ref={canvasRef}
                width={460}
                height={150}
                onMouseDown={iniciarDesenho}
                onMouseMove={moverDesenho}
                onMouseUp={finalizarDesenho}
                onMouseLeave={finalizarDesenho}
                onTouchStart={iniciarDesenho}
                onTouchMove={moverDesenho}
                onTouchEnd={finalizarDesenho}
                className="h-36 w-full cursor-crosshair touch-none"
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
            <input
              type="checkbox"
              checked={aceiteLgpd}
              onChange={(e) => setAceiteLgpd(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded accent-primary"
            />
            <span>
              Declaro ciência de que esta assinatura eletrônica é protegida por hash criptográfico de integridade para cumprimento estrito da <strong>RDC 665/2022 (ANVISA)</strong>, nos termos do <strong>Art. 7º, II da LGPD (Lei 13.709/2018)</strong> e <strong>Lei 14.063/2020</strong>.
            </span>
          </label>
        </div>

        <DialogFooter className="flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => handleConfirmar(true)}
          >
            Assinar via Credencial Rápida
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => handleConfirmar(false)}
            className="gap-1.5"
          >
            <CheckCircle2 className="h-4 w-4" />
            Confirmar Assinatura na Tela
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
