import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
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
import { DocumentsService } from './documents.service';

@ApiTags('documentos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private service: DocumentsService) {}

  // Central de documentos emitidos (req. 153-156, 195).
  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermissions(PERMISSIONS.DOCUMENT_VIEW)
  list(
    @Query('status') status?: string,
    @Query('isPublic') isPublic?: string,
    @Query('signed') signed?: string,
  ) {
    return this.service.list({ status, isPublic, signed });
  }

  // Central de assinaturas: Minhas / Solicitadas / Todas (req. 204).
  @Get('signatures')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(PERMISSIONS.DOCUMENT_VIEW)
  signatures(@CurrentUser() user: AuthUser, @Query('scope') scope?: string) {
    return this.service.signatureCenter(user, scope ?? 'mine');
  }

  // Assinatura em lote (req. 203).
  @Post('sign-batch')
  signBatch(@CurrentUser() user: AuthUser, @Body() body: { ids: string[] }) {
    return this.service.signBatch(user, body.ids);
  }

  // Pacote ZIP com os atos escolhidos (req. 113).
  @Get('zip')
  async zip(
    @Query('ids') ids: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { buffer } = await this.service.zipDocuments((ids ?? '').split(',').filter(Boolean));
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="atos.zip"',
    });
    return new StreamableFile(buffer);
  }

  @Get(':id/detail')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(PERMISSIONS.DOCUMENT_VIEW)
  detail(@Param('id') id: string) {
    return this.service.detail(id);
  }

  // Baixa/visualiza o PDF do documento (com tarja se não vigente).
  @Get(':id/pdf')
  async pdf(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { buffer, filename } = await this.service.getFile(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
    });
    return new StreamableFile(buffer);
  }

  // Assina o documento com certificado A1 (Módulo X).
  @Post(':id/sign')
  sign(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.sign(user, id);
  }

  // Ações do ciclo de vida (req. 196-201).
  @Post(':id/action')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(PERMISSIONS.DOCUMENT_INVALIDATE)
  action(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { action: string; reason?: string },
  ) {
    return this.service.action(user.id, id, body);
  }

  // Estado de renovação (req. 157-158).
  @Post(':id/renewal')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(PERMISSIONS.DOCUMENT_INVALIDATE)
  renewal(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { state: string; observation?: string },
  ) {
    return this.service.renewal(user.id, id, body);
  }

  // Validade / visibilidade (req. 155, 194).
  @Patch(':id/meta')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(PERMISSIONS.DOCUMENT_INVALIDATE)
  meta(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { validUntil?: string; isPublic?: boolean },
  ) {
    return this.service.updateMeta(user.id, id, body);
  }
}
