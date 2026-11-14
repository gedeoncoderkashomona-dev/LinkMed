import nodemailer from 'nodemailer';

export const DEFAULT_POP_SUGGESTION_EMAIL = 'gedeoncoderkashomona@gmail.com';

export type MailProvider = 'resend' | 'smtp' | 'sendgrid' | 'none';

export interface MailDeliveryResult {
  configured: boolean;
  delivered: boolean;
  provider: MailProvider;
  recipient: string;
  messageId?: string;
  error?: string;
}

export interface PopSuggestionEmailPayload {
  changeRequestId: string;
  popId: string;
  popCodigo: string;
  popTitulo: string;
  popVersao: number;
  popSetor: string;
  descricao: string;
  solicitanteNome: string;
  solicitanteEmail: string | null;
  solicitantePerfil: string;
  enviadoEm?: Date;
  appUrl?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function getPopSuggestionRecipient(): string {
  const configured =
    process.env.POP_SUGGESTION_EMAIL_TO?.trim() ||
    process.env.MAIL_SUGGESTIONS_TO?.trim();
  return configured || DEFAULT_POP_SUGGESTION_EMAIL;
}

export function isMailTransportConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() ||
      process.env.SMTP_PASS?.trim() ||
      process.env.SENDGRID_API_KEY?.trim(),
  );
}

function buildSuggestionEmailContent(input: PopSuggestionEmailPayload) {
  const recipient = getPopSuggestionRecipient();
  const timestamp = input.enviadoEm ?? new Date();
  const dataBr = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(timestamp);

  const baseUrl = (
    input.appUrl ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://link-med.vercel.app'
  ).replace(/\/$/, '');
  const popLink = `${baseUrl}/pops?popId=${encodeURIComponent(input.popId)}&tab=sugestoes`;

  const subject = `[LinkMed SGQ] Nova sugestão para ${input.popCodigo} — ${input.popTitulo}`;

  const text = [
    'LinkMed SGQ — Nova Sugestão de Melhoria em POP',
    '================================================',
    `POP: ${input.popCodigo} — ${input.popTitulo} (Rev. ${String(input.popVersao).padStart(2, '0')})`,
    `Setor do POP: ${input.popSetor}`,
    `Solicitante: ${input.solicitanteNome}${input.solicitanteEmail ? ` <${input.solicitanteEmail}>` : ''} (${input.solicitantePerfil})`,
    `Data/Hora (BRT): ${dataBr}`,
    `Protocolo: #${input.changeRequestId.slice(0, 8)}`,
    '',
    'Sugestão enviada:',
    input.descricao,
    '',
    `Abrir no sistema: ${popLink}`,
  ].join('\n');

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<body style="margin:0;padding:24px;background:#f2f9f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f2419;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #d5e6dc;border-radius:16px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#0f3d28,#1a6b44);padding:20px 24px;color:#ffffff;">
      <p style="margin:0;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.85;">LinkMed · Soluções Médicas (RDC 665/22)</p>
      <h1 style="margin:6px 0 0;font-size:18px;font-weight:700;">Nova Sugestão de Melhoria em POP</h1>
    </div>
    <div style="padding:24px;font-size:14px;line-height:1.55;">
      <table style="width:100%;border-collapse:collapse;margin-bottom:18px;font-size:13px;">
        <tr><td style="padding:6px 0;color:#4f6b5c;width:130px;">Documento:</td><td style="padding:6px 0;font-weight:600;">${escapeHtml(input.popCodigo)} — ${escapeHtml(input.popTitulo)}</td></tr>
        <tr><td style="padding:6px 0;color:#4f6b5c;">Versão / Setor:</td><td style="padding:6px 0;">Rev. ${String(input.popVersao).padStart(2, '0')} · ${escapeHtml(input.popSetor)}</td></tr>
        <tr><td style="padding:6px 0;color:#4f6b5c;">Enviado por:</td><td style="padding:6px 0;">${escapeHtml(input.solicitanteNome)}${input.solicitanteEmail ? ` (${escapeHtml(input.solicitanteEmail)})` : ''} · ${escapeHtml(input.solicitantePerfil)}</td></tr>
        <tr><td style="padding:6px 0;color:#4f6b5c;">Data/Hora:</td><td style="padding:6px 0;">${escapeHtml(dataBr)} (Horário de Brasília)</td></tr>
        <tr><td style="padding:6px 0;color:#4f6b5c;">Protocolo:</td><td style="padding:6px 0;font-family:monospace;">#${escapeHtml(input.changeRequestId.slice(0, 8))}</td></tr>
      </table>

      <div style="background:#f6fbf8;border:1px solid #d7eadf;border-left:4px solid #2b8a57;border-radius:10px;padding:14px 16px;margin-bottom:20px;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#1f6e44;">Descrição da Sugestão</p>
        <p style="margin:0;white-space:pre-wrap;color:#132a1e;">${escapeHtml(input.descricao)}</p>
      </div>

      <a href="${escapeHtml(popLink)}" style="display:inline-block;background:#2b8a57;color:#ffffff;text-decoration:none;font-weight:600;font-size:13px;padding:10px 18px;border-radius:10px;">
        Analisar sugestão no LinkMed
      </a>
    </div>
  </div>
</body>
</html>`.trim();

  return { recipient, subject, text, html };
}

export async function sendPopSuggestionEmail(
  input: PopSuggestionEmailPayload,
): Promise<MailDeliveryResult> {
  const { recipient, subject, text, html } = buildSuggestionEmailContent(input);

  // 1. Resend HTTP API (requer apenas RESEND_API_KEY)
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (resendKey) {
    try {
      const from = process.env.MAIL_FROM?.trim() || 'LinkMed SGQ <onboarding@resend.dev>';
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [recipient],
          ...(input.solicitanteEmail ? { reply_to: input.solicitanteEmail } : {}),
          subject,
          text,
          html,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        id?: string;
        message?: string;
      };

      if (!response.ok) {
        return {
          configured: true,
          delivered: false,
          provider: 'resend',
          recipient,
          error: payload.message || `Falha Resend (HTTP ${response.status}).`,
        };
      }

      return {
        configured: true,
        delivered: true,
        provider: 'resend',
        recipient,
        messageId: payload.id,
      };
    } catch (err) {
      return {
        configured: true,
        delivered: false,
        provider: 'resend',
        recipient,
        error: err instanceof Error ? err.message : 'Erro ao enviar via Resend.',
      };
    }
  }

  // 2. SMTP real via Nodemailer (ex.: Gmail App Password — basta SMTP_PASS)
  const smtpPass = process.env.SMTP_PASS?.trim();
  if (smtpPass) {
    try {
      const host = process.env.SMTP_HOST?.trim() || 'smtp.gmail.com';
      const port = Number(process.env.SMTP_PORT || '465');
      const user = process.env.SMTP_USER?.trim() || recipient;
      const from = process.env.MAIL_FROM?.trim() || `LinkMed SGQ <${user}>`;

      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass: smtpPass },
      });

      const info = await transporter.sendMail({
        from,
        to: recipient,
        ...(input.solicitanteEmail ? { replyTo: input.solicitanteEmail } : {}),
        subject,
        text,
        html,
      });

      return {
        configured: true,
        delivered: true,
        provider: 'smtp',
        recipient,
        messageId: info.messageId,
      };
    } catch (err) {
      return {
        configured: true,
        delivered: false,
        provider: 'smtp',
        recipient,
        error: err instanceof Error ? err.message : 'Erro ao enviar via SMTP.',
      };
    }
  }

  // 3. SendGrid HTTP API (caso já possua SENDGRID_API_KEY)
  const sendgridKey = process.env.SENDGRID_API_KEY?.trim();
  if (sendgridKey) {
    try {
      const fromEmail = process.env.MAIL_FROM?.trim() || recipient;
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sendgridKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: recipient }] }],
          from: { email: fromEmail, name: 'LinkMed SGQ' },
          ...(input.solicitanteEmail ? { reply_to: { email: input.solicitanteEmail } } : {}),
          subject,
          content: [
            { type: 'text/plain', value: text },
            { type: 'text/html', value: html },
          ],
        }),
      });

      if (!response.ok) {
        const bodyText = await response.text().catch(() => '');
        return {
          configured: true,
          delivered: false,
          provider: 'sendgrid',
          recipient,
          error: bodyText || `Falha SendGrid (HTTP ${response.status}).`,
        };
      }

      return {
        configured: true,
        delivered: true,
        provider: 'sendgrid',
        recipient,
        messageId: response.headers.get('x-message-id') ?? undefined,
      };
    } catch (err) {
      return {
        configured: true,
        delivered: false,
        provider: 'sendgrid',
        recipient,
        error: err instanceof Error ? err.message : 'Erro ao enviar via SendGrid.',
      };
    }
  }

  return {
    configured: false,
    delivered: false,
    provider: 'none',
    recipient,
    error:
      'Transporte de e-mail ainda não autenticado no servidor. Configure RESEND_API_KEY ou SMTP_PASS (Senha de App do Gmail) nas variáveis de ambiente.',
  };
}
