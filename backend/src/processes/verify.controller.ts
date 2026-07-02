import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProcessesService } from './processes.service';

// Verificação pública de autenticidade de documentos (req. 192).
// Sem autenticação — é o alvo do QR Code impresso no documento.
@ApiTags('verificacao')
@Controller('verificar')
export class VerifyController {
  constructor(private service: ProcessesService) {}

  @Get(':code')
  verify(@Param('code') code: string) {
    return this.service.verify(code);
  }
}
