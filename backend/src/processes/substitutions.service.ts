import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/decorators';
import { PERMISSIONS } from '../common/permissions';

@Injectable()
export class SubstitutionsService {
  constructor(private prisma: PrismaService) {}

  private isStaff(user: AuthUser) {
    return user.permissions.includes(PERMISSIONS.PROCESS_INTERNAL_VIEW);
  }

  // Requerente solicita substituição de prancha em processo DEFERIDO (req. 120-121).
  async request(
    user: AuthUser,
    processId: string,
    dto: { newFileId: string; oldFileId?: string; fieldKey?: string; justification: string },
  ) {
    const proc = await this.prisma.process.findUnique({ where: { id: processId } });
    if (!proc) throw new NotFoundException('Processo não encontrado');
    if (proc.requesterId !== user.id) {
      throw new ForbiddenException('Apenas o requerente pode solicitar a substituição');
    }
    if (proc.status !== 'DEFERRED') {
      throw new BadRequestException(
        'A substituição de pranchas só é permitida em processos deferidos.',
      );
    }
    if (!dto.justification) {
      throw new BadRequestException('Justificativa é obrigatória (req. 120).');
    }

    const sub = await this.prisma.plankSubstitution.create({
      data: {
        processId,
        requesterId: user.id,
        newFileId: dto.newFileId,
        oldFileId: dto.oldFileId,
        fieldKey: dto.fieldKey,
        justification: dto.justification,
      },
    });

    // Notifica o analista (registro na tramitação) — mantém status/data do deferimento.
    await this.prisma.processMovement.create({
      data: {
        processId,
        type: 'DISPATCH',
        userId: user.id,
        content: {
          note: 'Substituição de prancha solicitada',
          substitutionId: sub.id,
          justificativa: dto.justification,
        },
      },
    });
    return sub;
  }

  async list(user: AuthUser, processId: string) {
    const proc = await this.prisma.process.findUnique({ where: { id: processId } });
    if (!proc) throw new NotFoundException('Processo não encontrado');
    if (proc.requesterId !== user.id && !this.isStaff(user)) {
      throw new ForbiddenException('Sem acesso');
    }
    return this.prisma.plankSubstitution.findMany({
      where: { processId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Decisão do analista: confirmar, solicitar revisão ou recusar (req. 122, 125).
  async decide(
    user: AuthUser,
    substitutionId: string,
    dto: { decision: 'CONFIRM' | 'REVISION' | 'REJECT'; reason?: string },
  ) {
    if (!this.isStaff(user)) {
      throw new ForbiddenException('Apenas usuários internos decidem substituições');
    }
    const sub = await this.prisma.plankSubstitution.findUnique({
      where: { id: substitutionId },
    });
    if (!sub) throw new NotFoundException('Substituição não encontrada');
    if (sub.status === 'CONFIRMED' || sub.status === 'REJECTED') {
      throw new BadRequestException('Esta substituição já foi finalizada.');
    }

    if (dto.decision === 'REJECT' && !dto.reason) {
      throw new BadRequestException('A recusa exige justificativa (req. 122).');
    }

    const statusMap = {
      CONFIRM: 'CONFIRMED',
      REVISION: 'REVISION_REQUESTED',
      REJECT: 'REJECTED',
    } as const;

    // Ao confirmar, a nova prancha passa a vigente no processo (req. 123-124),
    // preservando status e data de deferimento.
    if (dto.decision === 'CONFIRM' && sub.fieldKey) {
      const file = await this.prisma.file.findUnique({ where: { id: sub.newFileId } });
      const proc = await this.prisma.process.findUnique({ where: { id: sub.processId } });
      if (file && proc) {
        const formData = { ...(proc.formData as Record<string, unknown>) };
        formData[sub.fieldKey] = {
          fileId: file.id,
          filename: file.filename,
          substituida: true,
        };
        await this.prisma.process.update({
          where: { id: sub.processId },
          data: { formData: formData as object },
        });
      }
    }

    const updated = await this.prisma.plankSubstitution.update({
      where: { id: substitutionId },
      data: {
        status: statusMap[dto.decision],
        decisionReason: dto.reason,
        decidedById: user.id,
      },
    });

    // Registra a decisão na tramitação (notifica o requerente — req. 125).
    await this.prisma.processMovement.create({
      data: {
        processId: sub.processId,
        type: 'DISPATCH',
        userId: user.id,
        content: {
          note: `Substituição de prancha: ${statusMap[dto.decision]}`,
          reason: dto.reason ?? null,
        },
      },
    });
    return updated;
  }
}
