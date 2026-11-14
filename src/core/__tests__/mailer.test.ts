import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { sendMailMock, createTransportMock } = vi.hoisted(() => {
  const sendMail = vi.fn().mockResolvedValue({ messageId: '<msg-smtp-123@gmail.com>' });
  const createTransport = vi.fn(() => ({ sendMail }));
  return { sendMailMock: sendMail, createTransportMock: createTransport };
});

vi.mock('nodemailer', () => ({
  default: {
    createTransport: createTransportMock,
  },
}));

import {
  DEFAULT_POP_SUGGESTION_EMAIL,
  getPopSuggestionRecipient,
  isMailTransportConfigured,
  sendPopSuggestionEmail,
} from '@/infra/mail/mailer';

const basePayload = {
  changeRequestId: 'cr-12345678-aaaa-bbbb-cccc-123456789012',
  popId: 'pop-006-id',
  popCodigo: 'POP-006',
  popTitulo: 'Limpeza e Higienização dos Ambientes',
  popVersao: 1,
  popSetor: 'Qualidade',
  descricao: 'Incluir verificação de álcool 70% <script>alert(1)</script>.',
  solicitanteNome: 'Carlos Menezes',
  solicitanteEmail: 'tecnico@linkmed.med.br',
  solicitantePerfil: 'tecnico',
  enviadoEm: new Date('2026-11-14T21:00:00.000Z'),
  appUrl: 'https://link-med.vercel.app',
};

describe('Mailer — Envio de Sugestões de POP por E-mail', () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  beforeEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.SMTP_PASS;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SENDGRID_API_KEY;
    delete process.env.POP_SUGGESTION_EMAIL_TO;
    delete process.env.MAIL_SUGGESTIONS_TO;
    delete process.env.MAIL_FROM;
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    global.fetch = originalFetch;
  });

  it('usa gedeoncoderkashomona@gmail.com como destinatário padrão', () => {
    expect(DEFAULT_POP_SUGGESTION_EMAIL).toBe('gedeoncoderkashomona@gmail.com');
    expect(getPopSuggestionRecipient()).toBe('gedeoncoderkashomona@gmail.com');
    expect(isMailTransportConfigured()).toBe(false);
  });

  it('retorna resultado explícito sem lançar exceção quando nenhuma credencial de e-mail está configurada', async () => {
    const res = await sendPopSuggestionEmail(basePayload);
    expect(res.configured).toBe(false);
    expect(res.delivered).toBe(false);
    expect(res.provider).toBe('none');
    expect(res.recipient).toBe('gedeoncoderkashomona@gmail.com');
    expect(res.error).toContain('RESEND_API_KEY');
  });

  it('envia via Resend HTTP API com HTML escapado e reply_to do colaborador', async () => {
    process.env.RESEND_API_KEY = 're_test_key_123';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'resend-id-999' }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const res = await sendPopSuggestionEmail(basePayload);

    expect(isMailTransportConfigured()).toBe(true);
    expect(res).toEqual({
      configured: true,
      delivered: true,
      provider: 'resend',
      recipient: 'gedeoncoderkashomona@gmail.com',
      messageId: 'resend-id-999',
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.resend.com/emails');
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.to).toEqual(['gedeoncoderkashomona@gmail.com']);
    expect(body.reply_to).toBe('tecnico@linkmed.med.br');
    expect(body.subject).toContain('POP-006');
    expect(body.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(body.html).not.toContain('<script>');
  });

  it('envia via SMTP Gmail (Nodemailer) quando SMTP_PASS está definido', async () => {
    process.env.SMTP_PASS = 'abcd efgh ijkl mnop';

    const res = await sendPopSuggestionEmail(basePayload);

    expect(isMailTransportConfigured()).toBe(true);
    expect(res.configured).toBe(true);
    expect(res.delivered).toBe(true);
    expect(res.provider).toBe('smtp');
    expect(res.recipient).toBe('gedeoncoderkashomona@gmail.com');
    expect(res.messageId).toBe('<msg-smtp-123@gmail.com>');

    expect(createTransportMock).toHaveBeenCalledWith({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: 'gedeoncoderkashomona@gmail.com',
        pass: 'abcd efgh ijkl mnop',
      },
    });
    expect(sendMailMock).toHaveBeenCalledOnce();
  });
});
