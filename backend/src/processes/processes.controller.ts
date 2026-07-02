import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators';
import { ProcessesService } from './processes.service';
import {
  AnalyzeDto,
  CorrectDto,
  DecisionDto,
  DispatchDto,
  ForwardDto,
  ProtocolDto,
  ReturnDto,
} from './dto';

@ApiTags('processos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('processes')
export class ProcessesController {
  constructor(private service: ProcessesService) {}

  @Post('protocol')
  protocol(@CurrentUser() user: AuthUser, @Body() dto: ProtocolDto) {
    return this.service.protocol(user, dto);
  }

  // Importação de processos de sistema legado (req. 179).
  @Post('import')
  importLegacy(@CurrentUser() user: AuthUser, @Body() body: { items: any[] }) {
    return this.service.importLegacy(user, body.items);
  }

  @Get('inbox')
  inbox(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
    @Query('processTypeId') processTypeId?: string,
    @Query('q') q?: string,
    @Query('orderBy') orderBy?: string,
    @Query('order') order?: string,
    @Query('sectorId') sectorId?: string,
    @Query('box') box?: string,
  ) {
    return this.service.inbox(user, { status, processTypeId, q, orderBy, order, sectorId, box });
  }

  @Get('mine')
  mine(@CurrentUser() user: AuthUser) {
    return this.service.myProcesses(user);
  }

  // Processos deferidos do requerente, para vínculo (renovações).
  @Get('linkable')
  linkable(@CurrentUser() user: AuthUser) {
    return this.service.linkable(user);
  }

  // Moderadores de campos sigilosos (req. 67, 70).
  @Get(':id/moderators')
  moderators(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.listModerators(user, id);
  }

  @Post(':id/moderators')
  addModerator(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body('userId') userId: string) {
    return this.service.addModerator(user, id, userId);
  }

  @Delete(':id/moderators/:userId')
  removeModerator(@CurrentUser() user: AuthUser, @Param('id') id: string, @Param('userId') userId: string) {
    return this.service.removeModerator(user, id, userId);
  }

  @Get(':id')
  detail(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.detail(user, id);
  }

  @Post(':id/forward')
  forward(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ForwardDto,
  ) {
    return this.service.forward(user, id, dto);
  }

  // Tramitação a múltiplas partes — ciência a vários setores (req. 81).
  @Post(':id/share')
  share(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { sectorIds: string[] },
  ) {
    return this.service.share(user, id, body?.sectorIds);
  }

  @Post(':id/dispatch')
  dispatch(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: DispatchDto,
  ) {
    return this.service.dispatch(user, id, dto);
  }

  @Post(':id/analyze')
  analyze(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AnalyzeDto,
  ) {
    return this.service.analyze(user, id, dto);
  }

  @Post(':id/return')
  returnToRequester(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ReturnDto,
  ) {
    return this.service.returnToRequester(user, id, dto);
  }

  @Post(':id/correct')
  correct(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CorrectDto,
  ) {
    return this.service.correct(user, id, dto);
  }

  @Post(':id/defer')
  defer(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: DecisionDto,
  ) {
    return this.service.defer(user, id, dto);
  }

  @Post(':id/indefer')
  indefer(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: DecisionDto,
  ) {
    return this.service.indefer(user, id, dto);
  }

  // Encerrar/arquivar processo (ação configurável — req. 44).
  @Post(':id/archive')
  archive(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.service.archive(user, id, body?.reason);
  }

  // Desarquivar processo, com motivo (req. 130).
  @Post(':id/reopen')
  reopen(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.service.reopen(user, id, body?.reason);
  }
}
