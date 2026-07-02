import { Injectable, NotFoundException } from '@nestjs/common';
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

  private async getOr404(id: string) {
    const t = await this.prisma.dispatchType.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Tipo de despacho não encontrado');
    return t;
  }
}
