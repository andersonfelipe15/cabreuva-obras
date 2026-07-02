import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators';
import { PERMISSIONS } from '../common/permissions';
import { PrismaService } from '../prisma/prisma.service';
import { AnthropicService } from './anthropic.service';

class ExtractDto {
  @IsString()
  fileBase64: string;

  @IsString()
  mimeType: string;

  @IsOptional()
  @IsString()
  expectedType?: string;
}

@ApiTags('ia')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(
    private service: AnthropicService,
    private prisma: PrismaService,
  ) {}

  // Extração + conferência documental (Módulo XII).
  @Post('extract')
  extract(@Body() dto: ExtractDto) {
    return this.service.analyzeDocument(dto.fileBase64, dto.mimeType, dto.expectedType);
  }

  // Feedback de precisão da extração por IA (req. 209).
  @Post('feedback')
  feedback(
    @CurrentUser() user: AuthUser,
    @Body() body: { correct: boolean; note?: string; expectedType?: string },
  ) {
    return this.prisma.aiFeedback.create({
      data: {
        userId: user.id,
        correct: !!body.correct,
        note: body.note ?? null,
        expectedType: body.expectedType ?? null,
      },
    });
  }

  // Agentes de IA disponíveis (req. 212, 214).
  @Get('agents')
  agents() {
    return this.service.listAgents();
  }

  // Executa um agente sobre o processo, gerando o conteúdo do despacho (req. 213).
  @Post('agent/run')
  async runAgent(
    @CurrentUser() user: AuthUser,
    @Body() body: { agentId: string; processId: string },
  ) {
    if (!user.permissions.includes(PERMISSIONS.PROCESS_INTERNAL_VIEW)) {
      throw new ForbiddenException('Apenas usuários internos usam o Agente de IA');
    }
    const proc = await this.prisma.process.findUnique({
      where: { id: body.processId },
      include: {
        processType: { select: { name: true } },
        requester: { select: { name: true } },
      },
    });
    if (!proc) throw new NotFoundException('Processo não encontrado');

    const context =
      `Número: ${proc.number}\n` +
      `Assunto: ${proc.processType.name}\n` +
      `Requerente: ${proc.requester.name}\n` +
      `Situação: ${proc.status}\n` +
      `Dados do formulário: ${JSON.stringify(proc.formData)}`;

    return this.service.runAgent(body.agentId, context);
  }
}
