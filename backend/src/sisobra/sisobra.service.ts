import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SisobraService {
  constructor(private prisma: PrismaService) {}

  // Gera o XML de um documento e valida os dados obrigatórios do SISOBRA.
  private buildXml(processNumber: string, docType: string, data: any) {
    const insc = data?.inscricaoImobiliaria;
    const inscValid = typeof insc === 'string' && insc.trim().length > 0;
    const xml =
      `<Obra>\n` +
      `  <Tipo>${docType}</Tipo>\n` +
      `  <Processo>${processNumber}</Processo>\n` +
      `  <InscricaoImobiliaria>${inscValid ? insc : ''}</InscricaoImobiliaria>\n` +
      `  <AreaConstruida>${data?.areaConstruida ?? ''}</AreaConstruida>\n` +
      `  <Uso>${data?.usoConstrucao ?? ''}</Uso>\n` +
      `</Obra>`;
    const error = inscValid ? null : 'Inscrição imobiliária ausente';
    return { xml, error };
  }

  private log(action: string, result: string, description?: string, batchId?: string, documentId?: string) {
    return this.prisma.sisobraLog.create({
      data: { action, result, description, batchId, documentId },
    });
  }

  // Gera um novo lote a partir dos documentos deferidos ainda não enviados (req. 159).
  async generateBatch(userId: string) {
    const already = await this.prisma.sisobraDocument.findMany({
      select: { documentId: true },
    });
    const sentIds = new Set(already.map((a) => a.documentId));

    const docs = await this.prisma.document.findMany({
      where: { type: { in: ['ALVARA'] }, status: 'VALID' },
      orderBy: { createdAt: 'asc' },
    });
    const eligible = docs.filter((d) => !sentIds.has(d.id));
    if (eligible.length === 0) {
      throw new BadRequestException('Nenhum documento elegível para envio ao SISOBRA.');
    }

    const referenceMonth = new Date().toISOString().slice(0, 7); // AAAA-MM
    const batch = await this.prisma.sisobraBatch.create({
      data: { referenceMonth, createdById: userId },
    });

    for (const d of eligible) {
      const content = d.content as any;
      const data = content?.formData ?? {};
      const { xml, error } = this.buildXml(content?.processNumber ?? '', d.type, data);
      await this.prisma.sisobraDocument.create({
        data: {
          batchId: batch.id,
          documentId: d.id,
          processNumber: content?.processNumber ?? '',
          docType: d.type,
          xml,
          sourceData: data,
          status: error ? 'XML_ERROR' : 'GENERATED',
          error,
        },
      });
      await this.log('GERACAO', error ? 'ERRO_XML' : 'SUCESSO', error ?? undefined, batch.id, d.id);
    }

    return this.getBatch(batch.id);
  }

  async listBatches() {
    return this.prisma.sisobraBatch.findMany({
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getBatch(id: string) {
    const batch = await this.prisma.sisobraBatch.findUnique({
      where: { id },
      include: { items: { orderBy: { createdAt: 'asc' } } },
    });
    if (!batch) throw new NotFoundException('Lote não encontrado');
    return batch;
  }

  // Correção do documento na própria plataforma (req. 161-162).
  async correct(itemId: string, fields: Record<string, unknown>) {
    const item = await this.prisma.sisobraDocument.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Documento não encontrado');
    if (item.status === 'TRANSMITTED') {
      throw new BadRequestException('Documento já transmitido não pode ser corrigido.');
    }
    const data = { ...(item.sourceData as any), ...fields };
    const { xml, error } = this.buildXml(item.processNumber, item.docType, data);
    const updated = await this.prisma.sisobraDocument.update({
      where: { id: itemId },
      data: {
        sourceData: data,
        xml,
        status: error ? 'XML_ERROR' : 'GENERATED',
        error,
      },
    });
    await this.log('CORRECAO', error ? 'ERRO_XML' : 'CORRIGIDO', error ?? 'Documento corrigido', item.batchId, item.documentId);
    return updated;
  }

  // Transmissão do lote (req. 160, 163-165). Só transmite os válidos.
  async transmit(batchId: string, useCertificate: boolean) {
    if (!useCertificate) {
      throw new BadRequestException('Selecione o certificado digital para transmitir.');
    }
    const certPath =
      process.env.SIGN_CERT_PATH || path.join(process.cwd(), 'certs', 'test-a1.p12');
    if (!fs.existsSync(certPath)) {
      throw new BadRequestException(
        `Certificado não encontrado em ${certPath}. Gere um com "npm run gen:cert".`,
      );
    }

    const batch = await this.getBatch(batchId);
    let transmitted = 0;
    let pending = 0;

    for (const item of batch.items) {
      // Apenas documentos válidos e ainda não transmitidos (req. 165).
      if (item.status === 'GENERATED') {
        // Aqui entraria a chamada real ao webservice SISOBRAPREF/SERO com o
        // certificado. Simulamos a resposta de sucesso.
        await this.prisma.sisobraDocument.update({
          where: { id: item.id },
          data: { status: 'TRANSMITTED', transmittedAt: new Date(), error: null },
        });
        await this.log('TRANSMISSAO', 'SUCESSO', 'Transmitido ao SISOBRA', batchId, item.documentId);
        transmitted++;
      } else if (item.status === 'XML_ERROR' || item.status === 'TRANSMISSION_ERROR') {
        await this.log('TRANSMISSAO', 'IGNORADO', item.error ?? 'Documento com pendência', batchId, item.documentId);
        pending++;
      }
    }

    return { batchId, transmitted, pending };
  }

  // Download do lote em XML (req. 160-iii).
  async download(batchId: string): Promise<string> {
    const batch = await this.getBatch(batchId);
    const body = batch.items.map((i) => i.xml).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<LoteSISOBRA referencia="${batch.referenceMonth}">\n${body}\n</LoteSISOBRA>`;
  }

  async logs() {
    return this.prisma.sisobraLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }
}
