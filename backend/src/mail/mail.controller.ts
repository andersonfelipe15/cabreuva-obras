import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/permissions.guard';
import { RequirePermissions } from '../common/decorators';
import { PERMISSIONS } from '../common/permissions';
import { MailService } from './mail.service';

@ApiTags('notificacoes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('notifications')
export class MailController {
  constructor(private mail: MailService) {}

  // Caixa de saída de e-mails (req. 132).
  @Get()
  @RequirePermissions(PERMISSIONS.USER_MANAGE)
  outbox(@Query('processId') processId?: string, @Query('event') event?: string) {
    return this.mail.outbox({ processId, event });
  }
}
