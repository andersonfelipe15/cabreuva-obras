import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/decorators';
import { PERMISSIONS } from '../common/permissions';
import { AnthropicService } from '../ai/anthropic.service';

@Injectable()
export class FeesService {
  constructor(
    private prisma: PrismaService,
    private ai: AnthropicService,
  ) {}

  private ensureManage(user: AuthUser) {
    if (!user.permissions.includes(PERMISSIONS.FEE_MANAGE)) {
      throw new ForbiddenException('Sem permissão para gerenciar taxas');
    }
  }

  private async getProcess(user: AuthUser, processId: string) {
    const proc = await this.prisma.process.findUnique({
      where: { id: processId },
      include: { processType: true },
    });
    if (!proc) throw new NotFoundException('Processo não encontrado');
    const isOwner = proc.requesterId === user.id;
    const isStaff = user.permissions.includes(PERMISSIONS.PROCESS_INTERNAL_VIEW);
    if (!isOwner && !isStaff) throw new ForbiddenException('Sem acesso');
    return proc;
  }

  // Taxas de um processo (req. 216).
  async listByProcess(user: AuthUser, processId: string) {
    await this.getProcess(user, processId);
    return this.prisma.fee.findMany({
      where: { processId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Interface central de gestão de taxas (req. 215).
  async listAll(user: AuthUser, status?: string) {
    this.ensureManage(user);
    return this.prisma.fee.findMany({
      where: status ? { status: status as any } : {},
      include: {
        process: {
          select: { number: true, requester: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Inclusão de guia de taxa pelo analista (req. 218).
  async create(
    user: AuthUser,
    processId: string,
    dto: { description: string; amount: number; dueDate?: string; boletoFile?: string },
  ) {
    this.ensureManage(user);
    await this.getProcess(user, processId);
    return this.prisma.fee.create({
      data: {
        processId,
        description: dto.description,
        amount: dto.amount,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        boletoFile: dto.boletoFile,
      },
    });
  }

  // Cálculo automático da taxa a partir das regras do assunto (req. 221-222).
  async calculate(user: AuthUser, processId: string) {
    this.ensureManage(user);
    const proc = await this.getProcess(user, processId);
    const rules = proc.processType.feeRules as any;
    if (!rules) {
      throw new BadRequestException(
        'Este assunto não possui regras de cálculo de taxa configuradas.',
      );
    }
    const fd = (proc.formData as Record<string, unknown>) ?? {};
    // Considera a soma de todos os quadros de área, quando houver (req. 61).
    let area = Number(fd[rules.campoArea]) || 0;
    const quadros = fd.quadroAreas as any[];
    if (Array.isArray(quadros) && quadros.length) {
      const soma = quadros.reduce((s, q) => s + (Number(q?.area) || 0), 0);
      if (soma > 0) area = soma;
    }
    const uso = String(fd[rules.campoUso] ?? '');
    const mult = (rules.multiplicadoresUso?.[uso] as number) ?? 1;
    const base = Number(rules.base) || 0;
    const porM2 = Number(rules.valorPorM2) || 0;
    const amount = Math.round((base + area * porM2 * mult) * 100) / 100;

    return this.prisma.fee.create({
      data: {
        processId,
        description: rules.descricao || 'Taxa de análise e aprovação',
        amount,
      },
    });
  }

  // Atualização de status pelo analista (req. 220).
  async updateStatus(user: AuthUser, feeId: string, status: string) {
    this.ensureManage(user);
    const valid = ['AWAITING_PAYMENT', 'PAID', 'CANCELLED'];
    if (!valid.includes(status)) throw new BadRequestException('Status inválido');
    const fee = await this.prisma.fee.findUnique({ where: { id: feeId } });
    if (!fee) throw new NotFoundException('Taxa não encontrada');
    return this.prisma.fee.update({
      where: { id: feeId },
      data: { status: status as any },
    });
  }

  // Requerente anexa o comprovante de pagamento (req. 219).
  async attachProof(user: AuthUser, feeId: string, proofFile: string) {
    const fee = await this.prisma.fee.findUnique({
      where: { id: feeId },
      include: { process: { select: { requesterId: true } } },
    });
    if (!fee) throw new NotFoundException('Taxa não encontrada');
    if (fee.process.requesterId !== user.id) {
      throw new ForbiddenException('Apenas o requerente pode anexar o comprovante');
    }
    return this.prisma.fee.update({
      where: { id: feeId },
      data: { proofFile },
    });
  }

  // Captura automática do valor de um boleto/guia via IA (req. 217).
  async extractBoleto(fileBase64: string, mimeType: string) {
    return this.ai.analyzeBoleto(fileBase64, mimeType);
  }
}
