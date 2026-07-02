import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators';
import { SubstitutionsService } from './substitutions.service';

@ApiTags('substituicao-de-pranchas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class SubstitutionsController {
  constructor(private service: SubstitutionsService) {}

  @Post('processes/:id/substitutions')
  request(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { newFileId: string; oldFileId?: string; fieldKey?: string; justification: string },
  ) {
    return this.service.request(user, id, body);
  }

  @Get('processes/:id/substitutions')
  list(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.list(user, id);
  }

  @Post('substitutions/:id/decision')
  decide(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { decision: 'CONFIRM' | 'REVISION' | 'REJECT'; reason?: string },
  ) {
    return this.service.decide(user, id, body);
  }
}
