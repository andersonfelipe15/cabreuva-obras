import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

// Serviços externos SIMULADOS, apenas para demonstrar as integrações localmente
// (sem depender de rede externa). Em produção, aponte a integração para o
// serviço real de zoneamento/cadastro do município.
@ApiTags('integracoes-mock')
@Controller('integrations/mock')
export class MockController {
  @Get('zoneamento')
  zoneamento(@Query('cep') cep = '') {
    return {
      cep,
      zona: 'ZM-1 (Zona Mista 1)',
      usoPermitido: ['Residencial', 'Comercial', 'Misto'],
      coeficienteAproveitamento: 2.0,
      taxaOcupacaoMax: 0.6,
      recuoFrontalMin: 5,
    };
  }

  @Get('inscricao')
  inscricao(@Query('inscricao') inscricao = '') {
    return {
      inscricao,
      proprietario: 'CONTRIBUINTE EXEMPLO',
      areaTerreno: 360,
      logradouro: 'Rua das Flores',
      numero: '100',
      situacaoCadastral: 'Regular',
    };
  }
}
