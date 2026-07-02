import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import type { AuthUser } from '../common/decorators';
import { PERMISSIONS } from '../common/permissions';

// ── Aceites (req. 131-135) ──
@Injectable()
export class AcceptancesService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  private ensureStaff(user: AuthUser) {
    if (!user.permissions.includes(PERMISSIONS.PROCESS_INTERNAL_VIEW)) {
      throw new ForbiddenException('Ação restrita a usuários internos');
    }
  }
  private async getProcess(id: string) {
    const p = await this.prisma.process.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Processo não encontrado');
    return p;
  }

  async create(user: AuthUser, processId: string, userIds: string[]) {
    this.ensureStaff(user);
    const proc = await this.getProcess(processId);
    const base = process.env.PUBLIC_URL || 'http://localhost:5173';
    for (const userId of userIds ?? []) {
      await this.prisma.processAcceptance.create({ data: { processId, userId } });
      // E-mail automático de aceite com link para o processo (req. 132).
      const involved = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });
      if (involved?.email) {
        const link = `${base}/process/${processId}`;
        await this.mail.send({
          to: involved.email,
          subject: `Solicitação de aceite — processo ${proc.number}`,
          body:
            `Olá ${involved.name},\n\n` +
            `Você foi indicado(a) como envolvido(a) no processo ${proc.number}. ` +
            `Acesse o link abaixo para revisar as informações e registrar seu aceite (com o termo de responsabilidade).`,
          event: 'ACCEPTANCE',
          processId,
          link,
        });
      }
    }
    return this.list(processId);
  }

  async list(processId: string) {
    const items = await this.prisma.processAcceptance.findMany({
      where: { processId },
      orderBy: { createdAt: 'asc' },
    });
    const users = await this.prisma.user.findMany({
      where: { id: { in: items.map((i) => i.userId) } },
      select: { id: true, name: true },
    });
    const map = new Map(users.map((u) => [u.id, u.name]));
    return items.map((i) => ({ ...i, userName: map.get(i.userId) ?? '—' }));
  }

  // Responde ao aceite (exige o termo de responsabilidade — req. 134).
  async respond(user: AuthUser, id: string, dto: { accept: boolean; termAccepted: boolean }) {
    const acc = await this.prisma.processAcceptance.findUnique({ where: { id } });
    if (!acc) throw new NotFoundException('Aceite não encontrado');
    if (acc.userId !== user.id) throw new ForbiddenException('Somente o envolvido pode responder');
    if (dto.accept && !dto.termAccepted) {
      throw new BadRequestException('É necessário aceitar o termo de responsabilidade para prosseguir.');
    }
    await this.prisma.processAcceptance.update({
      where: { id },
      data: {
        status: dto.accept ? 'ACCEPTED' : 'REJECTED',
        termAccepted: dto.termAccepted,
        respondedAt: new Date(),
      },
    });

    // Encaminha automaticamente quando 100% dos aceites concluídos (req. 135).
    const all = await this.prisma.processAcceptance.findMany({ where: { processId: acc.processId } });
    const allAccepted = all.length > 0 && all.every((a) => a.status === 'ACCEPTED');
    if (allAccepted) {
      await this.prisma.process.update({ where: { id: acc.processId }, data: { status: 'IN_ANALYSIS' } });
      await this.prisma.processMovement.create({
        data: {
          processId: acc.processId, type: 'DISPATCH', userId: user.id,
          content: { note: 'Todos os aceites concluídos — encaminhado automaticamente para análise.' },
        },
      });
    }
    return { status: dto.accept ? 'ACCEPTED' : 'REJECTED', allAccepted };
  }
}

// ── Prazos e ações automáticas (req. 136-138) ──
const VALID_ACTIONS = ['DEFER', 'INDEFER', 'SEND_ANALYSIS', 'RETURN', 'NOTIFY', 'BLOCK', 'UNBLOCK'];
const STATUS_MAP: Record<string, string> = {
  DEFER: 'DEFERRED', INDEFER: 'INDEFERRED', SEND_ANALYSIS: 'IN_ANALYSIS', RETURN: 'RETURNED',
};

@Injectable()
export class ScheduledService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  private ensureStaff(user: AuthUser) {
    if (!user.permissions.includes(PERMISSIONS.PROCESS_INTERNAL_VIEW)) {
      throw new ForbiddenException('Ação restrita a usuários internos');
    }
  }

  async create(user: AuthUser, processId: string, dto: { action: string; dueAt: string; reason?: string }) {
    this.ensureStaff(user);
    if (!VALID_ACTIONS.includes(dto.action)) throw new BadRequestException('Ação inválida');
    const p = await this.prisma.process.findUnique({ where: { id: processId } });
    if (!p) throw new NotFoundException('Processo não encontrado');
    return this.prisma.scheduledAction.create({
      data: { processId, action: dto.action, dueAt: new Date(dto.dueAt), reason: dto.reason },
    });
  }

  list(processId: string) {
    return this.prisma.scheduledAction.findMany({ where: { processId }, orderBy: { dueAt: 'asc' } });
  }

  // Executa as ações vencidas (chamada por rotina/agenda — req. 137).
  async runDue(user: AuthUser) {
    this.ensureStaff(user);
    const due = await this.prisma.scheduledAction.findMany({
      where: { executed: false, dueAt: { lte: new Date() } },
    });
    for (const a of due) await this.execute(a, user.id);
    return { executed: due.length };
  }

  private async execute(a: any, userId: string) {
    const data: any = {};
    if (STATUS_MAP[a.action]) data.status = STATUS_MAP[a.action];
    if (a.action === 'BLOCK') data.locked = true;
    if (a.action === 'UNBLOCK') data.locked = false;
    if (Object.keys(data).length) {
      await this.prisma.process.update({ where: { id: a.processId }, data });
    }
    await this.prisma.processMovement.create({
      data: {
        processId: a.processId, type: 'DISPATCH', userId,
        content: { note: `Ação programada executada: ${a.action}`, reason: a.reason ?? null },
      },
    });
    // Notificação por e-mail ao requerente quando a ação é NOTIFY (req. 132/137).
    if (a.action === 'NOTIFY') {
      const proc = await this.prisma.process.findUnique({
        where: { id: a.processId },
        include: { requester: { select: { email: true, name: true } } },
      });
      if (proc?.requester?.email) {
        await this.mail.send({
          to: proc.requester.email,
          subject: `Atualização do processo ${proc.number}`,
          body:
            `Olá ${proc.requester.name},\n\n` +
            `Há uma atualização no seu processo ${proc.number}.` +
            (a.reason ? `\nMotivo: ${a.reason}` : ''),
          event: 'SCHEDULED',
          processId: a.processId,
          link: `${process.env.PUBLIC_URL || 'http://localhost:5173'}/process/${a.processId}`,
        });
      }
    }
    await this.prisma.scheduledAction.update({
      where: { id: a.id }, data: { executed: true, executedAt: new Date() },
    });
  }
}
