import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
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

  // Tipos de ato disponíveis para seleção da íntegra (req. 113).
  @Get('processes/:id/integra/act-types')
  integraActTypes(@Param('id') id: string) {
    return this.integra.availableActTypes(id);
  }

  // Íntegra processual em PDF (req. 109-114). `acts` (CSV) filtra os tipos de ato.
  @Get('processes/:id/integra.pdf')
  async integraPdf(
    @Param('id') id: string,
    @Query('acts') acts: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const pdf = await this.integra.generate(id, this.parseActs(acts));
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="integra-${id}.pdf"`,
    });
    return new StreamableFile(pdf);
  }

  // Íntegra + documentos emitidos empacotados em ZIP (req. 113).
  @Get('processes/:id/integra.zip')
  async integraZip(
    @Param('id') id: string,
    @Query('acts') acts: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { buffer, filename } = await this.integra.generateZip(id, this.parseActs(acts));
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    return new StreamableFile(buffer);
  }

  private parseActs(acts: string | undefined): any[] | undefined {
    if (!acts) return undefined;
    const list = acts.split(',').map((a) => a.trim()).filter(Boolean);
    return list.length ? list : undefined;
  }
}
