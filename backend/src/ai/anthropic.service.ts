import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';

// Agentes/tarefas de IA disponíveis na tela de despachos (req. 212, 214).
const AGENTS = [
  {
    id: 'analise-ferias',
    name: 'Análise de Férias',
    description: 'Analisa um pedido de férias/afastamento com base no processo.',
    prompt:
      'Você é um assistente administrativo de uma prefeitura. Com base nos dados do processo, ' +
      'elabore uma análise técnica sobre pedido de férias/afastamento, apontando conformidade, ' +
      'pendências e uma recomendação (deferir/indeferir), em linguagem formal.',
  },
  {
    id: 'minuta-tr',
    name: 'Minuta de Termo de Referência',
    description: 'Gera uma minuta de Termo de Referência a partir do objeto do processo.',
    prompt:
      'Você é um assistente de licitações. Elabore uma minuta de Termo de Referência para o ' +
      'objeto descrito no processo, com as seções: 1) Objeto, 2) Justificativa, 3) Especificações, ' +
      '4) Prazo de execução, 5) Obrigações. Seja objetivo e formal.',
  },
];

// Módulo XII — IA aplicada à conferência documental (req. 205-210).
// Usa o SDK oficial da Anthropic com o modelo claude-opus-4-8 (visão nativa).
@Injectable()
export class AnthropicService {
  private model = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8';

  private getClient(): Anthropic {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new BadRequestException(
        'Defina ANTHROPIC_API_KEY no arquivo .env para usar a IA/OCR.',
      );
    }
    return new Anthropic();
  }

  // Lê o documento (imagem ou PDF em base64), extrai os dados e — se um tipo
  // esperado for informado — confere se o documento corresponde (req. 206-207).
  async analyzeDocument(
    fileBase64: string,
    mimeType: string,
    expectedType?: string,
  ) {
    const client = this.getClient();
    const isPdf = mimeType === 'application/pdf';

    const docBlock: any = isPdf
      ? {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: fileBase64 },
        }
      : {
          type: 'image',
          source: { type: 'base64', media_type: mimeType, data: fileBase64 },
        };

    const schemaHint = `{
  "tipoDocumento": "RG" | "CNH" | "CartaoCNPJ" | "Matricula" | "CertidaoNegativa" | "ContratoSocial" | "Desconhecido",
  "nome": string | null,
  "cpf": string | null,
  "rg": string | null,
  "cnpj": string | null,
  "razaoSocial": string | null,
  "dataNascimento": string | null,
  "numeroDocumento": string | null,
  "matricula": string | null,
  "correspondeAoEsperado": boolean | null,
  "inconsistencias": string[],
  "confianca": "alta" | "media" | "baixa"
}`;

    const instruction =
      'Você é um assistente de conferência documental de uma prefeitura. ' +
      'Analise o documento anexado e extraia os dados solicitados. ' +
      (expectedType
        ? `O documento esperado neste campo é: "${expectedType}". ` +
          'Preencha "correspondeAoEsperado" indicando se o documento anexado corresponde a esse tipo. '
        : 'Deixe "correspondeAoEsperado" como null. ') +
      'NÃO invente dados: use null quando a informação não estiver presente ou ilegível. ' +
      'Em "inconsistencias", liste problemas encontrados (documento ilegível, rasurado, ' +
      'tipo divergente do esperado, campos obrigatórios ausentes). ' +
      'Responda EXCLUSIVAMENTE com um JSON válido (sem markdown, sem texto extra), ' +
      `exatamente neste formato:\n${schemaHint}`;

    let res;
    try {
      res = await client.messages.create({
        model: this.model,
        max_tokens: 1500,
        messages: [
          { role: 'user', content: [docBlock, { type: 'text', text: instruction }] },
        ],
      });
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      // Documento grande demais ou com páginas em excesso (limites da API de IA).
      if (/page|too large|maximum|size|request_too_large|32 ?mb|100 pages/i.test(msg)) {
        return {
          erro:
            'Não foi possível analisar: o documento é grande demais ou tem páginas em excesso. ' +
            'Envie apenas a página do documento (RG, CNH, matrícula, etc.), com no máximo ~100 páginas e 25 MB.',
        };
      }
      return { erro: 'Falha ao analisar o documento com a IA: ' + msg };
    }

    const text = (res.content as any[])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();

    return this.parseJson(text);
  }

  // Captura o valor de um boleto/guia de taxa (req. 217).
  async analyzeBoleto(fileBase64: string, mimeType: string) {
    const client = this.getClient();
    const isPdf = mimeType === 'application/pdf';
    const docBlock: any = isPdf
      ? {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: fileBase64 },
        }
      : {
          type: 'image',
          source: { type: 'base64', media_type: mimeType, data: fileBase64 },
        };

    const instruction =
      'Analise este boleto/guia de taxa e extraia os dados. ' +
      'Responda EXCLUSIVAMENTE com JSON válido (sem markdown) no formato:\n' +
      '{ "valor": number|null, "vencimento": string|null, "linhaDigitavel": string|null }. ' +
      'O "valor" deve ser o valor total do documento em reais (número). Use null se não encontrar.';

    const res = await client.messages.create({
      model: this.model,
      max_tokens: 500,
      messages: [
        { role: 'user', content: [docBlock, { type: 'text', text: instruction }] },
      ],
    });
    const text = (res.content as any[])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();
    return this.parseJson(text);
  }

  // Lista os agentes disponíveis (req. 212/214) — funciona sem API key.
  listAgents() {
    return AGENTS.map((a) => ({ id: a.id, name: a.name, description: a.description }));
  }

  // Minuta simulada quando não há ANTHROPIC_API_KEY — mantém o Agente de IA
  // utilizável em demonstração (com IA real basta configurar a chave no .env).
  private simulatedContent(agentId: string, context: string): string {
    const nota =
      '⚠️ Conteúdo SIMULADO (modelo). Defina ANTHROPIC_API_KEY no .env para gerar com IA real.\n\n';
    if (agentId === 'minuta-tr') {
      return (
        nota +
        'MINUTA DE TERMO DE REFERÊNCIA\n\n' +
        '1. OBJETO\nContratação referente ao processo abaixo.\n\n' +
        '2. JUSTIFICATIVA\nAtendimento à demanda administrativa registrada no processo.\n\n' +
        '3. ESPECIFICAÇÕES\nConforme dados do processo e legislação municipal vigente.\n\n' +
        '4. PRAZO DE EXECUÇÃO\nA definir conforme cronograma.\n\n' +
        '5. OBRIGAÇÕES\nDas partes, na forma da legislação aplicável.\n\n' +
        `--- Dados do processo ---\n${context}`
      );
    }
    // analise-ferias (padrão)
    return (
      nota +
      'ANÁLISE DE PEDIDO DE FÉRIAS/AFASTAMENTO\n\n' +
      'Analisado o pedido à luz dos dados do processo, verifica-se a regularidade formal ' +
      'da solicitação. Não foram identificadas pendências impeditivas.\n\n' +
      'RECOMENDAÇÃO: pelo DEFERIMENTO do pedido, observados os prazos legais.\n\n' +
      `--- Dados do processo ---\n${context}`
    );
  }

  // Executa um agente sobre o contexto do processo, gerando o conteúdo do despacho (req. 213).
  async runAgent(agentId: string, context: string) {
    const agent = AGENTS.find((a) => a.id === agentId);
    if (!agent) throw new NotFoundException('Agente não encontrado');
    // Sem chave: degrada para minuta simulada (coerente com o restante da POC).
    if (!process.env.ANTHROPIC_API_KEY) {
      return {
        agent: { id: agent.id, name: agent.name },
        content: this.simulatedContent(agentId, context),
        simulated: true,
      };
    }
    const client = this.getClient();
    const res = await client.messages.create({
      model: this.model,
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content:
            `${agent.prompt}\n\nDados do processo:\n${context}\n\n` +
            'Produza o conteúdo do despacho em português, pronto para inserir no processo.',
        },
      ],
    });
    const text = (res.content as any[])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();
    return { agent: { id: agent.id, name: agent.name }, content: text };
  }

  private parseJson(text: string) {
    try {
      const json = text
        .replace(/^```(json)?/i, '')
        .replace(/```$/, '')
        .trim();
      return JSON.parse(json);
    } catch {
      return {
        erro: 'Não foi possível interpretar a resposta da IA como JSON.',
        raw: text,
      };
    }
  }
}
