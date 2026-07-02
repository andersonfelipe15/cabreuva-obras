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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/permissions.guard';
import { RequirePermissions } from '../common/decorators';
import { PERMISSIONS } from '../common/permissions';
import { IntegrationsService } from './integrations.service';

// Área de gerenciamento de integrações (req. 177-178).
@ApiTags('integracoes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('integrations')
export class IntegrationsController {
  constructor(private service: IntegrationsService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions(PERMISSIONS.PROCESS_TYPE_MANAGE)
  create(@Body() body: any) {
    return this.service.create(body);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(PERMISSIONS.PROCESS_TYPE_MANAGE)
  update(@Param('id') id: string, @Body() body: any) {
    return this.service.update(id, body);
  }

  @Patch(':id/enabled')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(PERMISSIONS.PROCESS_TYPE_MANAGE)
  setEnabled(@Param('id') id: string, @Body('enabled') enabled: boolean) {
    return this.service.setEnabled(id, enabled);
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(PERMISSIONS.PROCESS_TYPE_MANAGE)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  // Execução/consulta em tempo real (req. 170, 180). Qualquer usuário autenticado.
  @Post(':id/execute')
  execute(@Param('id') id: string, @Body('params') params: Record<string, string>) {
    return this.service.execute(id, params ?? {});
  }
}
