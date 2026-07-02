import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';

interface MailInput {
  to: string;
  subject: string;
  body: string;
  event: string;
  processId?: string;
  link?: string;
}

// Serviço de e-mail (req. 132). Ordem de envio: Resend (RESEND_API_KEY) →
// SMTP (SMTP_HOST) → simulado (registra na caixa de saída). Mantém o pipeline
// testável sem credenciais e envia de verdade quando configurado.
@Injectable()
export class MailService {
  private readonly logger = new Logger('MailService');
  private transporter: nodemailer.Transporter | null = null;

  constructor(private prisma: PrismaService) {
    if (process.env.SMTP_HOST) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
      });
    }
  }

  async send(input: MailInput) {
    const from =
      process.env.RESEND_FROM ||
      process.env.SMTP_FROM ||
      'onboarding@resend.dev';
    const html =
      `<p>${input.body.replace(/\n/g, '<br>')}</p>` +
      (input.link
        ? `<p><a href="${input.link}" style="background:#1f7a3d;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;display:inline-block">Redefinir senha</a></p>` +
          `<p style="color:#667">Ou copie e cole no navegador:<br>${input.link}</p>`
        : '');
    let sent = false;
    let simulated = false;
    let error: string | null = null;

    if (process.env.RESEND_API_KEY) {
      // Envio via Resend (API HTTP) — sem dependência extra, usando fetch.
      try {
        const r = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ from, to: input.to, subject: input.subject, html, text: input.body }),
        });
        if (r.ok) sent = true;
        else error = `Resend ${r.status}: ${await r.text()}`;
      } catch (e) {
        error = (e as Error).message;
      }
      if (error) this.logger.error(`Falha (Resend) para ${input.to}: ${error}`);
    } else if (this.transporter) {
      try {
        await this.transporter.sendMail({ from, to: input.to, subject: input.subject, text: input.body, html });
        sent = true;
      } catch (e) {
        error = (e as Error).message;
        this.logger.error(`Falha (SMTP) para ${input.to}: ${error}`);
      }
    } else {
      // Sem provedor configurado: registra como simulado (visível na caixa de saída).
      simulated = true;
      this.logger.log(`[SIMULADO] E-mail para ${input.to}: ${input.subject}`);
    }

    return this.prisma.notification.create({
      data: {
        to: input.to,
        subject: input.subject,
        body: input.body,
        event: input.event,
        processId: input.processId ?? null,
        link: input.link ?? null,
        sent,
        simulated,
        error,
      },
    });
  }

  // Caixa de saída / auditoria de notificações (req. 132).
  outbox(filters: { processId?: string; event?: string }) {
    return this.prisma.notification.findMany({
      where: {
        processId: filters.processId || undefined,
        event: filters.event || undefined,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }
}
