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
import { RequirePermissions, CurrentUser, AuthUser } from '../common/decorators';
import { PERMISSIONS } from '../common/permissions';
import { ProcessTypesService } from './process-types.service';

@ApiTags('tipos-de-processo')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('process-types')
export class ProcessTypesController {
  constructor(private service: ProcessTypesService) {}

  // Carta de serviços — filtrada pelos assuntos que o usuário pode protocolar (req. 7/54).
  @Get('catalog')
  catalog(@CurrentUser() user: AuthUser) {
    return this.service.catalog(true, user);
  }

  // Lista completa (administração do editor de formulários).
  @Get('all')
  @RequirePermissions(PERMISSIONS.PROCESS_TYPE_MANAGE)
  all() {
    return this.service.all();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
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

  @Patch(':id/enabled')
  @RequirePermissions(PERMISSIONS.PROCESS_TYPE_MANAGE)
  setEnabled(@Param('id') id: string, @Body('enabled') enabled: boolean) {
    return this.service.setEnabled(id, enabled);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.PROCESS_TYPE_MANAGE)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
