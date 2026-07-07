import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/permissions.guard';
import { RequirePermissions, CurrentUser, AuthUser } from '../common/decorators';
import { PERMISSIONS } from '../common/permissions';
import { UsersService } from './users.service';

@ApiTags('usuarios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(private service: UsersService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.USER_MANAGE)
  list(@Query('q') q?: string) {
    return this.service.list(q);
  }

  // Perfil do próprio usuário, incluindo os setores em que atua (req. 82).
  // Sem @RequirePermissions: acessível a qualquer usuário autenticado.
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.service.detail(user.id);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.USER_MANAGE)
  detail(@Param('id') id: string) {
    return this.service.detail(id);
  }

  // Histórico diferenciado do usuário (req. 26).
  @Get(':id/history')
  @RequirePermissions(PERMISSIONS.USER_MANAGE)
  history(@Param('id') id: string) {
    return this.service.history(id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.USER_MANAGE)
  create(@CurrentUser() user: AuthUser, @Body() body: any) {
    return this.service.createInternal(body, user.id);
  }

  @Patch(':id/block')
  @RequirePermissions(PERMISSIONS.USER_BLOCK)
  block(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body('blocked') blocked: boolean,
  ) {
    return this.service.block(id, blocked, user.id);
  }

  // Altera os perfis (permissões) de um usuário já cadastrado (req. 14-17).
  @Patch(':id/roles')
  @RequirePermissions(PERMISSIONS.ROLE_ASSIGN)
  setRoles(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body('roleIds') roleIds: string[],
  ) {
    return this.service.setRoles(id, roleIds, user.id);
  }

  // Status de ausência (Férias/Viagem/Licença/Desativado) + substituto (req. 13).
  @Patch(':id/status')
  @RequirePermissions(PERMISSIONS.USER_MANAGE)
  setStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { status: string; substituteId?: string | null },
  ) {
    return this.service.setStatus(id, body, user.id);
  }
}
