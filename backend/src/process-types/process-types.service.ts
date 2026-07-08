import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProcessTypesService {
  constructor(private prisma: PrismaService) {}

  // Carta de serviços (req. 49): lista assuntos habilitados, agrupáveis por categoria.
  async catalog(
    onlyEnabled = true,
    user?: { roleIds: string[]; permissions: string[] },
  ) {
    const items = await this.prisma.processType.findMany({
      where: onlyEnabled ? { enabled: true } : {},
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        category: true,
        enabled: true,
        responsibleSectorId: true,
        protocolRoleIds: true,
      },
      orderBy: { name: 'asc' },
    });
    // Só mostra assuntos que o usuário pode protocolar (req. 7/54).
    // Quem gerencia tipos de processo enxerga todos.
    const isManager = user?.permissions?.includes('processType.manage');
    const filtered =
      !user || isManager
        ? items
        : items.filter(
            (t) =>
              (t.protocolRoleIds ?? []).length === 0 ||
              (t.protocolRoleIds ?? []).some((r) => user.roleIds.includes(r)),
          );
    return filtered.map(({ protocolRoleIds: _pr, ...rest }) => rest);
  }

  // Lista completa para administração (inclui desabilitados e a definição).
  all() {
    return this.prisma.processType.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const type = await this.prisma.processType.findUnique({ where: { id } });
    if (!type) throw new NotFoundException('Tipo de processo não encontrado');
    return type;
  }

  create(data: Prisma.ProcessTypeCreateInput) {
    return this.prisma.processType.create({ data });
  }

  update(id: string, data: Prisma.ProcessTypeUpdateInput) {
    return this.prisma.processType.update({ where: { id }, data });
  }

  setEnabled(id: string, enabled: boolean) {
    return this.prisma.processType.update({ where: { id }, data: { enabled } });
  }

  // Exclui um assunto. Bloqueia se já houver processos protocolados nele (histórico);
  // nesse caso, oriente a desabilitar (fica fora da Carta de Serviços) em vez de excluir.
  async remove(id: string) {
    await this.findOne(id);
    const used = await this.prisma.process.count({ where: { processTypeId: id } });
    if (used > 0) {
      throw new BadRequestException(
        `Não é possível excluir: há ${used} processo(s) protocolado(s) neste assunto. ` +
          'Desative o assunto (fica fora da Carta de Serviços) em vez de excluir.',
      );
    }
    await this.prisma.processType.delete({ where: { id } });
    return { deleted: true };
  }
}
