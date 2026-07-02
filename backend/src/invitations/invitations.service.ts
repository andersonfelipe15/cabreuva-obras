import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { assertStrongPassword } from '../common/password';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Injectable()
export class InvitationsService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  // Link de aceite (simulado — em produção seguiria por e-mail/notificação, req. 23).
  private link(token: string) {
    const base = process.env.PUBLIC_URL || 'http://localhost:5173';
    return `${base}/aceitar-convite?token=${token}`;
  }

  private async validate(email: string, document: string, ignoreId?: string) {
    if (!EMAIL_RE.test(email)) throw new BadRequestException('E-mail inválido.');
    if ((document ?? '').replace(/\D/g, '').length < 11)
      throw new BadRequestException('CPF/CNPJ inválido.');
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user) throw new BadRequestException('Já existe um usuário com este e-mail.');
    const dup = await this.prisma.invitation.findFirst({
      where: { email, status: 'PENDING', id: ignoreId ? { not: ignoreId } : undefined },
    });
    if (dup) throw new BadRequestException('Já existe um convite pendente para este e-mail.');
  }

  // Envio de convite interno/externo (req. 22, 23).
  async create(
    invitedById: string,
    dto: { name: string; document: string; email: string; type?: string },
  ) {
    await this.validate(dto.email, dto.document);
    const token = randomUUID();
    const inv = await this.prisma.invitation.create({
      data: {
        name: dto.name,
        document: dto.document,
        email: dto.email,
        type: dto.type === 'INTERNAL' ? 'INTERNAL' : 'EXTERNAL',
        token,
        invitedById,
      },
    });
    const inviteLink = this.link(token);
    await this.mail.send({
      to: dto.email,
      subject: 'Convite de acesso — Prefeitura de Cabreúva',
      body: `Olá ${dto.name},\n\nVocê foi convidado(a) a acessar o sistema. Use o link abaixo para criar sua senha e ativar o cadastro.`,
      event: 'INVITE',
      link: inviteLink,
    });
    return { ...inv, inviteLink, notified: true };
  }

  async list() {
    return this.prisma.invitation.findMany({ orderBy: { createdAt: 'desc' } });
  }

  private async getPending(id: string) {
    const inv = await this.prisma.invitation.findUnique({ where: { id } });
    if (!inv) throw new NotFoundException('Convite não encontrado.');
    if (inv.status !== 'PENDING')
      throw new BadRequestException('Convite não está mais pendente.');
    return inv;
  }

  // Edição do convite enquanto pendente (req. 25).
  async update(
    id: string,
    dto: { name?: string; document?: string; email?: string; type?: string },
  ) {
    const inv = await this.getPending(id);
    const email = dto.email ?? inv.email;
    const document = dto.document ?? inv.document;
    if (dto.email || dto.document) await this.validate(email, document, id);
    return this.prisma.invitation.update({
      where: { id },
      data: {
        name: dto.name ?? inv.name,
        email,
        document,
        type: dto.type ?? inv.type,
      },
    });
  }

  // Reenvio do convite, com novo token (req. 25).
  async resend(id: string) {
    const inv = await this.getPending(id);
    const token = randomUUID();
    const updated = await this.prisma.invitation.update({
      where: { id },
      data: { token, sentCount: inv.sentCount + 1, lastSentAt: new Date() },
    });
    const inviteLink = this.link(token);
    await this.mail.send({
      to: updated.email,
      subject: 'Reenvio de convite — Prefeitura de Cabreúva',
      body: `Olá ${updated.name},\n\nSeu convite foi reenviado. Use o link abaixo para ativar o cadastro.`,
      event: 'INVITE',
      link: inviteLink,
    });
    return { ...updated, inviteLink, notified: true };
  }

  async cancel(id: string) {
    await this.getPending(id);
    return this.prisma.invitation.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  // Aceite do convite: cria o usuário (perfil Requerente por padrão) — público.
  async accept(dto: { token: string; password: string }) {
    assertStrongPassword(dto.password);
    const inv = await this.prisma.invitation.findUnique({
      where: { token: dto.token },
    });
    if (!inv || inv.status !== 'PENDING')
      throw new BadRequestException('Convite inválido ou já utilizado.');

    const roleName = inv.type === 'INTERNAL' ? 'Analista' : 'Requerente';
    const role = await this.prisma.role.findFirst({ where: { name: roleName } });

    const user = await this.prisma.user.create({
      data: {
        name: inv.name,
        document: inv.document,
        email: inv.email,
        passwordHash: await bcrypt.hash(dto.password, 10),
        emailVerified: true,
        roles: role ? { create: [{ roleId: role.id }] } : undefined,
      },
    });
    await this.prisma.invitation.update({
      where: { id: inv.id },
      data: { status: 'ACCEPTED' },
    });
    return { accepted: true, userId: user.id, email: user.email };
  }
}
