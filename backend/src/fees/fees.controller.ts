import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators';
import { FeesService } from './fees.service';

@ApiTags('taxas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class FeesController {
  constructor(private service: FeesService) {}

  // Gestão central (req. 215).
  @Get('fees')
  listAll(@CurrentUser() user: AuthUser, @Query('status') status?: string) {
    return this.service.listAll(user, status);
  }

  // Taxas de um processo (req. 216).
  @Get('processes/:id/fees')
  listByProcess(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.listByProcess(user, id);
  }

  // Inclusão de guia (req. 218).
  @Post('processes/:id/fees')
  create(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { description: string; amount: number; dueDate?: string; boletoFile?: string },
  ) {
    return this.service.create(user, id, body);
  }

  // Cálculo automático (req. 221-222).
  @Post('processes/:id/fees/calculate')
  calculate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.calculate(user, id);
  }

  // Atualização de status (req. 220).
  @Patch('fees/:id/status')
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.service.updateStatus(user, id, status);
  }

  // Comprovante do requerente (req. 219).
  @Post('fees/:id/proof')
  attachProof(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body('proofFile') proofFile: string,
  ) {
    return this.service.attachProof(user, id, proofFile);
  }

  // Captura automática de valor de boleto via IA (req. 217).
  @Post('fees/extract-boleto')
  extractBoleto(@Body() body: { fileBase64: string; mimeType: string }) {
    return this.service.extractBoleto(body.fileBase64, body.mimeType);
  }
}
