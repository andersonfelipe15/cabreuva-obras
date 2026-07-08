import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class DispatchTypesService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.dispatchType.findMany({ orderBy: { name: 'asc' } });
  }

  async findMany(ids: string[]) {
    return this.prisma.dispatchType.findMany({ where: { id: { in: ids } } });
  }

  create(data: Prisma.DispatchTypeCreateInput) {
    return this.prisma.dispatchType.create({ data });
  }

  async update(id: string, data: Prisma.DispatchTypeUpdateInput) {
    await this.getOr404(id);
    return this.prisma.dispatchType.update({ where: { id }, data });
  }

  setEnabled(id: string, enabled: boolean) {
    return this.prisma.dispatchType.update({ where: { id }, data: { enabled } });
  }

  // Exclui um tipo de despacho. Bloqueia se já houver despachos registrados com ele
  // (histórico). Caso contrário, retira-o das listas de assuntos que o habilitam e apaga.
  async remove(id: string) {
    await this.getOr404(id);
    const used = await this.prisma.dispatch.count({ where: { dispatchTypeId: id } });
    if (used > 0) {
      throw new BadRequestException(
        `Não é possível excluir: há ${used} despacho(s) já registrado(s) com este tipo. ` +
          'Desabilite-o em vez de excluir.',
      );
    }
    const types = await this.prisma.processType.findMany({
      where: { dispatchTypeIds: { has: id } },
      select: { id: true, dispatchTypeIds: true },
    });
    for (const t of types) {
      await this.prisma.processType.update({
        where: { id: t.id },
        data: { dispatchTypeIds: t.dispatchTypeIds.filter((x) => x !== id) },
      });
    }
    await this.prisma.dispatchType.delete({ where: { id } });
    return { deleted: true };
  }

  private async getOr404(id: string) {
    const t = await this.prisma.dispatchType.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Tipo de despacho não encontrado');
    return t;
  }
}
