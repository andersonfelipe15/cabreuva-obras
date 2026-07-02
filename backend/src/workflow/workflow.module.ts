import { Module, Controller, Body, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators';
import { AcceptancesService, ScheduledService } from './workflow.service';

@ApiTags('workflow')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class WorkflowController {
  constructor(
    private acceptances: AcceptancesService,
    private scheduled: ScheduledService,
  ) {}

  // Aceites (req. 131-135)
  @Post('processes/:id/acceptances')
  createAcceptances(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body('userIds') userIds: string[]) {
    return this.acceptances.create(user, id, userIds);
  }

  @Get('processes/:id/acceptances')
  listAcceptances(@Param('id') id: string) {
    return this.acceptances.list(id);
  }

  @Post('acceptances/:id/respond')
  respond(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { accept: boolean; termAccepted: boolean }) {
    return this.acceptances.respond(user, id, body);
  }

  // Ações agendadas (req. 136-138)
  @Post('processes/:id/scheduled-actions')
  createScheduled(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { action: string; dueAt: string; reason?: string }) {
    return this.scheduled.create(user, id, body);
  }

  @Get('processes/:id/scheduled-actions')
  listScheduled(@Param('id') id: string) {
    return this.scheduled.list(id);
  }

  @Post('scheduled-actions/run')
  runDue(@CurrentUser() user: AuthUser) {
    return this.scheduled.runDue(user);
  }
}

@Module({
  providers: [AcceptancesService, ScheduledService],
  controllers: [WorkflowController],
})
export class WorkflowModule {}
