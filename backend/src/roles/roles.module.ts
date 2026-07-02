import { Module, Injectable } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Get,
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
}

@Module({
  providers: [RolesService, SectorsService],
  controllers: [RolesController, SectorsController],
})
export class RolesModule {}
