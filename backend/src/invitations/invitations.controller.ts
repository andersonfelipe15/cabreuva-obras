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
import { InvitationsService } from './invitations.service';

@ApiTags('convites')
@Controller('invitations')
export class InvitationsController {
  constructor(private service: InvitationsService) {}

  // Aceite do convite — público (usuário ainda não existe).
  @Post('accept')
  accept(@Body() dto: { token: string; password: string }) {
    return this.service.accept(dto);
  }

  // Demais rotas exigem gestão de usuários.
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.USER_MANAGE)
  @Get()
  list() {
    return this.service.list();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.USER_MANAGE)
  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: { name: string; document: string; email: string; type?: string },
  ) {
    return this.service.create(user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.USER_MANAGE)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.service.update(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.USER_MANAGE)
  @Post(':id/resend')
  resend(@Param('id') id: string) {
    return this.service.resend(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.USER_MANAGE)
  @Delete(':id')
  cancel(@Param('id') id: string) {
    return this.service.cancel(id);
  }
}
