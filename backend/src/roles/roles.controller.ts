import {
  Body,
  Controller,
  Get,
  Injectable,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/permissions.guard';
import { RequirePermissions } from '../common/decorators';
import { PERMISSIONS, PERMISSION_LABELS } from '../common/permissions';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}
  list() {
    return this.prisma.role.findMany({ orderBy: { name: 'asc' } });
  }
  permissions() {
    return Object.entries(PERMISSION_LABELS).map(([key, label]) => ({ key, label }));
  }
  create(data: any) {
    return this.prisma.role.create({
      data: { name: data.name, description: data.description, permissions: data.permissions ?? [] },
    });
  }
  update(id: string, data: any) {
    return this.prisma.role.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        permissions: data.permissions,
      },
    });
  }
}

@ApiTags('perfis')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('roles')
export class RolesController {
  constructor(private service: RolesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.USER_MANAGE)
  list() {
    return this.service.list();
  }

  @Get('permissions')
  @RequirePermissions(PERMISSIONS.USER_MANAGE)
  permissions() {
    return this.service.permissions();
  }

  @Post()
  @RequirePermissions(PERMISSIONS.PROCESS_TYPE_MANAGE)
  create(@Body() body: any) {
    return this.service.create(body);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.PROCESS_TYPE_MANAGE)
  update(@Param('id') id: string, @Body() body: any) {
    return this.service.update(id, body);
  }
}
