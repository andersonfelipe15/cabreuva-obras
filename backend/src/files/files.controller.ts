import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators';
import { FilesService } from './files.service';
import { AnthropicService } from '../ai/anthropic.service';

@ApiTags('arquivos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('files')
export class FilesController {
  constructor(
    private files: FilesService,
    private ai: AnthropicService,
  ) {}

  // Upload real de anexo (armazenado em disco ou S3/MinIO).
  @Post()
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }),
  )
  upload(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Arquivo ausente');
    return this.files.upload(user.id, file);
  }

  // Download/visualização do anexo.
  @Get(':id')
  async download(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { rec, buffer } = await this.files.getWithBytes(id);
    res.set({
      'Content-Type': rec.mimeType,
      'Content-Disposition': `inline; filename="${rec.filename}"`,
    });
    return new StreamableFile(buffer);
  }

  // Leitura do anexo pela IA (conferência documental — Módulo XII).
  @Post(':id/analyze')
  async analyze(
    @Param('id') id: string,
    @Body('expectedType') expectedType?: string,
  ) {
    const { rec, buffer } = await this.files.getWithBytes(id);
    return this.ai.analyzeDocument(
      buffer.toString('base64'),
      rec.mimeType,
      expectedType,
    );
  }
}
