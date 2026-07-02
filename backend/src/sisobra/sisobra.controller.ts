import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/permissions.guard';
import { RequirePermissions, CurrentUser, AuthUser } from '../common/decorators';
import { PERMISSIONS } from '../common/permissions';
import { SisobraService } from './sisobra.service';

@ApiTags('sisobra')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(PERMISSIONS.SISOBRA_ACCESS)
@Controller('sisobra')
export class SisobraController {
  constructor(private service: SisobraService) {}

  @Post('batches')
  generate(@CurrentUser() user: AuthUser) {
    return this.service.generateBatch(user.id);
  }

  @Get('batches')
  list() {
    return this.service.listBatches();
  }

  @Get('batches/:id')
  getBatch(@Param('id') id: string) {
    return this.service.getBatch(id);
  }

  @Patch('documents/:id')
  correct(@Param('id') id: string, @Body('fields') fields: Record<string, unknown>) {
    return this.service.correct(id, fields ?? {});
  }

  @Post('batches/:id/transmit')
  transmit(@Param('id') id: string, @Body('useCertificate') useCertificate: boolean) {
    return this.service.transmit(id, !!useCertificate);
  }

  @Get('batches/:id/download')
  async download(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const xml = await this.service.download(id);
    res.set({
      'Content-Type': 'application/xml; charset=utf-8',
      'Content-Disposition': `attachment; filename="lote-${id}.xml"`,
    });
    return new StreamableFile(Buffer.from(xml, 'utf-8'));
  }

  @Get('logs')
  logs() {
    return this.service.logs();
  }
}
