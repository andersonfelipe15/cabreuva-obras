import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/permissions.guard';
import { RequirePermissions } from '../common/decorators';
import { PERMISSIONS } from '../common/permissions';
import { ReportsService } from './reports.service';

@ApiTags('relatorios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('reports')
export class ReportsController {
  constructor(private service: ReportsService) {}

  @Get('dashboard')
  @RequirePermissions(PERMISSIONS.DASHBOARD_VIEW)
  dashboard() {
    return this.service.dashboard();
  }

  @Get('protocols.csv')
  @RequirePermissions(PERMISSIONS.REPORT_GENERATE)
  async protocolsCsv(
    @Res({ passthrough: true }) res: Response,
    @Query('processTypeId') processTypeId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<StreamableFile> {
    const csv = await this.service.protocolsCsv({ processTypeId, from, to });
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="protocolos.csv"',
    });
    return new StreamableFile(Buffer.from(csv, 'utf-8'));
  }

  // Relatório de um processo com seções selecionáveis (req. 183-186).
  @Get('process/:id.pdf')
  @RequirePermissions(PERMISSIONS.REPORT_GENERATE)
  async processReport(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
    @Query('history') history?: string,
    @Query('analyses') analyses?: string,
    @Query('documents') documents?: string,
    @Query('dispatches') dispatches?: string,
    @Query('version') version?: string,
  ): Promise<StreamableFile> {
    const pdf = await this.service.processReport(id, {
      history: history === 'true',
      analyses: analyses === 'true',
      documents: documents === 'true',
      dispatches: dispatches === 'true',
      version: version != null && version !== '' ? Number(version) : undefined,
    });
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="relatorio-${id}.pdf"`,
    });
    return new StreamableFile(pdf);
  }

  @Get('performance.pdf')
  @RequirePermissions(PERMISSIONS.REPORT_GENERATE)
  async performancePdf(
    @Res({ passthrough: true }) res: Response,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('analystId') analystId?: string,
  ): Promise<StreamableFile> {
    const pdf = await this.service.performancePdf({ from, to, analystId });
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="desempenho.pdf"',
    });
    return new StreamableFile(pdf);
  }
}
