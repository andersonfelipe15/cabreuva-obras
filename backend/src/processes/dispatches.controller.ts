import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators';
import { DispatchesService } from './dispatches.service';
import { IntegraService } from './integra.service';

@ApiTags('despachos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class DispatchesController {
  constructor(
    private dispatches: DispatchesService,
    private integra: IntegraService,
  ) {}

  @Get('processes/:id/dispatch-types')
  availableTypes(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.dispatches.availableTypes(user, id);
  }

  @Get('processes/:id/dispatches')
  list(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.dispatches.list(user, id);
  }

  @Post('processes/:id/dispatches')
  create(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { dispatchTypeId: string; values: Record<string, unknown>; situation?: string },
  ) {
    return this.dispatches.create(user, id, body);
  }

  @Post('dispatches/:id/adjust')
  adjust(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.dispatches.adjust(user, id, body);
  }

  // Evolui o status do despacho para a próxima situação (req. 146).
  @Post('dispatches/:id/advance-status')
  advanceStatus(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.dispatches.advanceStatus(user, id);
  }

  // Íntegra processual em PDF (req. 109-114).
  @Get('processes/:id/integra.pdf')
  async integraPdf(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const pdf = await this.integra.generate(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="integra-${id}.pdf"`,
    });
    return new StreamableFile(pdf);
  }
}
