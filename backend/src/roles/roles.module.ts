import { Module, Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/permissions.guard';
import { RequirePermissions } from '../common/decorators';
import { PERMISSIONS } from '../common/permissions';
import { RolesController, RolesService } from './roles.controller';

@Injectable()
export class SectorsService {
  constructor(private prisma: PrismaService) {}
  list() {
    return this.prisma.sector.findMany({ orderBy: { name: 'asc' } });
  }
  create(name: string) {
    return this.prisma.sector.create({ data: { name } });
  }
  async rename(id: string, name: string) {
    if (!name || !name.trim()) throw new BadRequestException('Informe o nome do setor.');
    const sector = await this.prisma.sector.findUnique({ where: { id } });
    if (!sector) throw new NotFoundException('Setor não encontrado');
    return this.prisma.sector.update({ where: { id }, data: { name: name.trim() } });
  }
  // Exclui um setor, desde que não haja processos/assuntos/movimentos vinculados.
  // Vínculos de usuários (UserSector) são removidos em cascata pelo schema.
  async remove(id: string) {
    const sector = await this.prisma.sector.findUnique({ where: { id } });
    if (!sector) throw new NotFoundException('Setor não encontrado');
    const [inbox, respTypes, moves] = await Promise.all([
      this.prisma.process.count({ where: { currentSectorId: id } }),
      this.prisma.processType.count({ where: { responsibleSectorId: id } }),
      this.prisma.processMovement.count({ where: { OR: [{ fromSectorId: id }, { toSectorId: id }] } }),
    ]);
    const blockers: string[] = [];
    if (inbox) blockers.push(`${inbox} processo(s) na caixa deste setor`);
    if (respTypes) blockers.push(`${respTypes} assunto(s) com este setor como responsável`);
    if (moves) blockers.push(`${moves} movimentação(ões) no histórico`);
    if (blockers.length) {
      throw new BadRequestException(
        'Não é possível excluir o setor: há ' + blockers.join(', ') + '. Reatribua antes de excluir.',
      );
    }
    await this.prisma.sector.delete({ where: { id } });
    return { deleted: true };
  }
}

@ApiTags('setores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('sectors')
export class SectorsController {
  constructor(private service: SectorsService) {}

  // Lista de setores — disponível a usuários internos (encaminhamento/ciência).
  @Get()
  @RequirePermissions(PERMISSIONS.PROCESS_INTERNAL_VIEW)
  list() {
    return this.service.list();
  }

  @Post()
  @RequirePermissions(PERMISSIONS.PROCESS_TYPE_MANAGE)
  create(@Body('name') name: string) {
    return this.service.create(name);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.SECTOR_MANAGE)
  rename(@Param('id') id: string, @Body('name') name: string) {
    return this.service.rename(id, name);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.SECTOR_MANAGE)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

@Module({
  providers: [RolesService, SectorsService],
  controllers: [RolesController, SectorsController],
})
export class RolesModule {}
