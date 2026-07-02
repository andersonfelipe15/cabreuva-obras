import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/decorators';
import { PERMISSIONS } from '../common/permissions';

interface DispatchField {
  key: string;
  label: string;
  type: string;
  required?: boolean;
  readonly?: boolean;
  options?: string[];
  acceptExtensions?: string[];
}

const ADJUST_SUFFIX: Record<string, string> = {
  RETIFICACAO: ' – Retificado',
  REPUBLICACAO: ' – Republicado',
  ATUALIZACAO: ' – Atualizado',
};

@Injectable()
export class DispatchesService {
  constructor(private prisma: PrismaService) {}

  private isStaff(user: AuthUser) {
    return user.permissions.includes(PERMISSIONS.PROCESS_INTERNAL_VIEW);
  }

  // Nível de acesso do destinatário definido no protocolo (req. 42-48).
  // Despachar é ação de interação → bloqueado apenas em "somente visualização".
  private ensureCanDispatch(proc: any) {
    const level = (proc.processType?.accessLevel as string) ?? 'COMPLETO';
    if (level === 'VISUALIZACAO') {
      throw new ForbiddenException(
        `O assunto "${proc.processType?.name}" está configurado como "somente visualização": não é possível lançar ou ajustar despachos.`,
      );
    }
  }

  private async getProcess(user: AuthUser, processId: string) {
    const proc = await this.prisma.process.findUnique({
      where: { id: processId },
      include: { processType: true },
    });
    if (!proc) throw new NotFoundException('Processo não encontrado');
    const isOwner = proc.requesterId === user.id;
    if (!isOwner && !this.isStaff(user)) {
      throw new ForbiddenException('Sem acesso a este processo');
    }
    return proc;
  }

  // Tipos de despacho disponíveis para o assunto do processo (req. 98/100).
  async availableTypes(user: AuthUser, processId: string) {
    const proc = await this.getProcess(user, processId);
    const ids = (proc.processType.dispatchTypeIds as string[]) ?? [];
    const types = await this.prisma.dispatchType.findMany({
      where: { id: { in: ids }, enabled: true },
    });
    // Requerente só enxerga tipos liberados a ele.
    return this.isStaff(user)
      ? types
      : types.filter((t) => t.allowRequester);
  }

  // Timeline de despachos do processo (req. 95/99).
  async list(user: AuthUser, processId: string) {
    await this.getProcess(user, processId);
    const dispatches = await this.prisma.dispatch.findMany({
      where: { processId },
      include: {
        dispatchType: { select: { name: true, allowRequester: true } },
        author: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    // Requerente não vê despachos de tipos exclusivos internos (req. 100 v).
    return this.isStaff(user)
      ? dispatches
      : dispatches.filter((d) => d.dispatchType.allowRequester);
  }

  // Cria um despacho respeitando as regras dos campos do tipo (req. 100).
  async create(
    user: AuthUser,
    processId: string,
    dto: { dispatchTypeId: string; values: Record<string, unknown>; situation?: string },
  ) {
    const proc = await this.getProcess(user, processId);
    // Nível de acesso aplicável a internos E externos (req. 46): em "somente
    // visualização" ninguém lança despacho, independentemente do papel.
    this.ensureCanDispatch(proc);
    const type = await this.prisma.dispatchType.findUnique({
      where: { id: dto.dispatchTypeId },
    });
    if (!type) throw new NotFoundException('Tipo de despacho não encontrado');
    if (!type.enabled) throw new BadRequestException('Tipo de despacho desabilitado');

    const ids = (proc.processType.dispatchTypeIds as string[]) ?? [];
    if (!ids.includes(type.id)) {
      throw new BadRequestException(
        'Este tipo de despacho não está habilitado para este assunto.',
      );
    }
    // Tipo exclusivo interno não pode ser operado por requerente (req. 100 v).
    if (!this.isStaff(user) && !type.allowRequester) {
      throw new ForbiddenException(
        'Este tipo de despacho é exclusivo para usuários internos.',
      );
    }

    this.validateValues(type.fields as unknown as DispatchField[], dto.values);
    const situation = this.validateSituation(type.situations, dto.situation);

    return this.prisma.dispatch.create({
      data: {
        processId,
        dispatchTypeId: type.id,
        authorId: user.id,
        title: type.name,
        values: dto.values as object,
        situation,
      },
      include: {
        dispatchType: { select: { name: true } },
        author: { select: { name: true } },
      },
    });
  }

  // Retificação / Republicação / Atualização (req. 102-108).
  async adjust(
    user: AuthUser,
    dispatchId: string,
    dto: {
      adjustmentType: 'RETIFICACAO' | 'REPUBLICACAO' | 'ATUALIZACAO';
      justification?: string;
      values?: Record<string, unknown>;
      situation?: string;
    },
  ) {
    if (!this.isStaff(user)) {
      throw new ForbiddenException('Apenas usuários internos podem ajustar despachos');
    }
    const original = await this.prisma.dispatch.findUnique({
      where: { id: dispatchId },
      include: { dispatchType: true, process: { include: { processType: { select: { accessLevel: true, name: true } } } } },
    });
    if (!original) throw new NotFoundException('Despacho não encontrado');
    this.ensureCanDispatch(original.process);
    // Impede novo ajuste em despacho já ajustado (req. 107).
    if (original.adjusted) {
      throw new BadRequestException(
        'Este despacho já passou por retificação/atualização e não pode ser ajustado novamente.',
      );
    }

    const suffix = ADJUST_SUFFIX[dto.adjustmentType];
    if (!suffix) throw new BadRequestException('Tipo de ajuste inválido');

    // Atualização replica o despacho relacionado (req. 103).
    const values =
      dto.adjustmentType === 'ATUALIZACAO'
        ? (original.values as object)
        : ((dto.values as object) ?? (original.values as object));
    const situation = dto.situation ?? original.situation ?? undefined;

    const child = await this.prisma.dispatch.create({
      data: {
        processId: original.processId,
        dispatchTypeId: original.dispatchTypeId,
        authorId: user.id,
        title: original.title + suffix,
        values,
        situation,
        adjustmentType: dto.adjustmentType,
        justification: dto.justification,
        parentId: original.id,
      },
      include: {
        dispatchType: { select: { name: true } },
        author: { select: { name: true } },
      },
    });

    // Marca o original como ajustado (bloqueia novos ajustes).
    await this.prisma.dispatch.update({
      where: { id: original.id },
      data: { adjusted: true },
    });

    return child;
  }

  // Evolução do status do despacho pela sequência pré-definida de situações (req. 146).
  async advanceStatus(user: AuthUser, dispatchId: string) {
    if (!this.isStaff(user)) {
      throw new ForbiddenException('Apenas usuários internos evoluem o status.');
    }
    const disp = await this.prisma.dispatch.findUnique({
      where: { id: dispatchId },
      include: { dispatchType: true },
    });
    if (!disp) throw new NotFoundException('Despacho não encontrado');
    const situations = (disp.dispatchType.situations as { name: string; color?: string }[]) ?? [];
    if (situations.length === 0) {
      throw new BadRequestException('Este tipo de despacho não possui situações configuradas.');
    }
    const currentIdx = situations.findIndex((s) => s.name === disp.situation);
    const nextIdx = currentIdx + 1;
    if (nextIdx >= situations.length) {
      throw new BadRequestException('O despacho já está no status final.');
    }
    return this.prisma.dispatch.update({
      where: { id: dispatchId },
      data: { situation: situations[nextIdx].name },
      include: { dispatchType: { select: { name: true } }, author: { select: { name: true } } },
    });
  }

  private validateValues(fields: DispatchField[], values: Record<string, unknown>) {
    for (const f of fields ?? []) {
      if (f.readonly) continue;
      const v = values?.[f.key];
      const empty = v === undefined || v === null || v === '';
      if (f.required && empty) {
        throw new BadRequestException(`Campo obrigatório não preenchido: "${f.label}"`);
      }
    }
  }

  private validateSituation(situations: any, chosen?: string): string | undefined {
    const list: { name: string }[] = Array.isArray(situations) ? situations : [];
    if (list.length === 0) return undefined;
    if (!chosen) {
      throw new BadRequestException('Selecione a situação do despacho.');
    }
    if (!list.some((s) => s.name === chosen)) {
      throw new BadRequestException('Situação inválida para este tipo de despacho.');
    }
    return chosen;
  }
}
