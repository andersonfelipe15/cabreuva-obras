import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { assertStrongPassword } from '../common/password';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // Busca com filtros Nome/CPF/E-mail/Cargo (req. 11).
  async list(q?: string) {
    return this.prisma.user.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { document: { contains: q } },
              { email: { contains: q, mode: 'insensitive' } },
              { cargo: { contains: q, mode: 'insensitive' } },
            ],
          }
        : undefined,
      select: {
        id: true,
        name: true,
        document: true,
        email: true,
        phone: true,
        cargo: true,
        status: true,
        roles: { include: { role: { select: { name: true } } } },
      },
      orderBy: { name: 'asc' },
    });
  }

  // Visão detalhada unificada (req. 10).
  async detail(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        roles: { include: { role: true } },
        sectors: { include: { sector: true } },
        substitute: { select: { id: true, name: true } },
      },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    const protocolados = await this.prisma.process.count({
      where: { requesterId: id },
    });
    const acessados = await this.prisma.processMovement.count({
      where: { userId: id },
    });
    // Processos atualmente na caixa de entrada dos setores do usuário (req. 10).
    const sectorIds = user.sectors.map((s) => s.sectorId);
    const naCaixaEntrada = sectorIds.length
      ? await this.prisma.process.count({ where: { currentSectorId: { in: sectorIds } } })
      : 0;
    // Permissões efetivas (união dos perfis) (req. 10).
    const permissions = [
      ...new Set(user.roles.flatMap((ur) => ur.role.permissions)),
    ];
    const { passwordHash, ...rest } = user;
    return {
      ...rest,
      permissions,
      processosNaCaixaEntrada: naCaixaEntrada,
      processosProtocolados: protocolados,
      processosAcessados: acessados,
    };
  }

  // Registro de auditoria de usuário (req. 26).
  private audit(userId: string, action: string, byId?: string, detail?: any) {
    return this.prisma.userAudit.create({
      data: { userId, action, byId: byId ?? null, detail: detail ?? undefined },
    });
  }

  // Histórico diferenciado de um usuário (req. 26).
  async history(id: string) {
    return this.prisma.userAudit.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  // Bloqueio de acesso (req. 8-9).
  async block(id: string, blocked: boolean, byId?: string) {
    const u = await this.prisma.user.update({
      where: { id },
      data: { status: blocked ? 'BLOCKED' : 'ACTIVE' },
    });
    await this.audit(id, blocked ? 'BLOCKED' : 'UNBLOCKED', byId);
    return u;
  }

  // Status de ausência + substituto automático (req. 13).
  async setStatus(
    id: string,
    data: { status: string; substituteId?: string | null },
    byId?: string,
  ) {
    const allowed = ['ACTIVE', 'BLOCKED', 'VACATION', 'TRAVEL', 'LEAVE', 'DISABLED'];
    if (!allowed.includes(data.status)) {
      throw new BadRequestException(`Status inválido: ${data.status}`);
    }
    const absent = ['VACATION', 'TRAVEL', 'LEAVE'].includes(data.status);
    if (absent && !data.substituteId) {
      // Ausências exigem substituto para o encaminhamento automático.
      throw new BadRequestException('Informe um substituto para status de ausência.');
    }
    if (data.substituteId === id) {
      throw new BadRequestException('O usuário não pode ser o próprio substituto.');
    }
    const u = await this.prisma.user.update({
      where: { id },
      data: {
        status: data.status as any,
        substituteId: absent ? data.substituteId : null,
      },
      include: { substitute: { select: { id: true, name: true } } },
    });
    await this.audit(id, 'STATUS', byId, {
      status: data.status,
      substituteId: absent ? data.substituteId : null,
    });
    return u;
  }

  async createInternal(
    data: {
      name: string;
      document: string;
      email: string;
      password: string;
      cargo?: string;
      roleIds?: string[];
      sectorIds?: string[];
    },
    byId?: string,
  ) {
    assertStrongPassword(data.password);
    const user = await this.prisma.user.create({
      data: {
        name: data.name,
        document: data.document,
        email: data.email,
        cargo: data.cargo,
        passwordHash: await bcrypt.hash(data.password, 10),
        emailVerified: true,
        roles: data.roleIds
          ? { create: data.roleIds.map((roleId) => ({ roleId })) }
          : undefined,
        sectors: data.sectorIds
          ? { create: data.sectorIds.map((sectorId) => ({ sectorId })) }
          : undefined,
      },
    });
    await this.audit(user.id, 'CREATED', byId, { cargo: data.cargo ?? null });
    return user;
  }
}
