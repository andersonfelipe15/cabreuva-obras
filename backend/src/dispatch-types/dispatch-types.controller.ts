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
import { DispatchTypesService } from './dispatch-types.service';

@ApiTags('tipos-de-despacho')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('dispatch-types')
export class DispatchTypesController {
  constructor(private service: DispatchTypesService) {}

  @Get()
  list() {
    return this.service.list();
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
