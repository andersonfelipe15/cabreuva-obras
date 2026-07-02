import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { PdfService } from './pdf.service';
import { SignatureService } from './signature.service';
import type { AuthUser } from '../common/decorators';
import { PERMISSIONS } from '../common/permissions';

@Injectable()
export class DocumentsService {
  private storageDir = path.join(process.cwd(), 'storage', 'documents');

  constructor(
    private prisma: PrismaService,
    private pdf: PdfService,
    private signature: SignatureService,
  ) {
    fs.mkdirSync(this.storageDir, { recursive: true });
  }

  private filePath(number: string) {
    return path.join(this.storageDir, `${number.replace(/\//g, '-')}.pdf`);
  }

  private async getOr404(id: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Documento não encontrado');
    return doc;
  }

  // Gera (e persiste) o PDF não assinado, se ainda não existir.
  async generate(id: string): Promise<{ path: string; buffer: Buffer }> {
    const doc = await this.getOr404(id);
    const buffer = await this.pdf.generateAlvara(doc as any);
    const p = this.filePath(doc.number);
    fs.writeFileSync(p, buffer);
    if (!doc.filePath) {
      await this.prisma.document.update({
        where: { id },
        data: { filePath: p },
      });
    }
    return { path: p, buffer };
  }

  // Assina o documento com A1 e marca como assinado (Módulo X).
  async sign(user: AuthUser, id: string) {
    if (!user.permissions.includes(PERMISSIONS.DOCUMENT_SIGN)) {
      throw new ForbiddenException('Sem permissão para assinar documentos');
    }
    const doc = await this.getOr404(id);
    if (doc.signed) {
      return { alreadySigned: true, number: doc.number };
    }

    const pdfBuffer = await this.pdf.generateAlvara(doc as any);
    const signed = await this.signature.signPdf(pdfBuffer, {
      name: 'Prefeitura Municipal de Cabreúva',
      reason: `Emissão do documento ${doc.number}`,
      location: 'Cabreúva/SP',
    });

    const p = this.filePath(doc.number);
    fs.writeFileSync(p, signed);

    await this.prisma.document.update({
      where: { id },
      data: { signed: true, filePath: p, signedById: user.id },
    });
    return { signed: true, number: doc.number };
  }

  // Pacote ZIP com os atos (documentos) escolhidos do processo (req. 113).
  async zipDocuments(ids: string[]): Promise<{ buffer: Buffer; count: number }> {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    let count = 0;
    for (const id of ids ?? []) {
      try {
        const { buffer, filename } = await this.getFile(id);
        zip.file(filename, buffer);
        count++;
      } catch {
        /* ignora documento inacessível */
      }
    }
    const buffer = await zip.generateAsync({ type: 'nodebuffer' });
    return { buffer, count };
  }

  // Central de assinaturas: Minhas / Solicitadas / Todas (req. 203-204).
  async signatureCenter(user: AuthUser, scope: string) {
    const mineWhere = {
      OR: [{ signed: false }, { signedById: user.id }],
    };
    const requestedWhere = { emittedById: user.id };
    const [mine, requested, all] = await Promise.all([
      this.prisma.document.count({ where: mineWhere }),
      this.prisma.document.count({ where: requestedWhere }),
      this.prisma.document.count(),
    ]);
    const where =
      scope === 'requested' ? requestedWhere : scope === 'all' ? {} : mineWhere;
    const items = await this.prisma.document.findMany({
      where,
      include: {
        process: { select: { number: true } },
        emittedBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return { scope: scope || 'mine', counts: { mine, requested, all }, items };
  }

  // Assinatura em lote (req. 203).
  async signBatch(user: AuthUser, ids: string[]) {
    const results: any[] = [];
    for (const id of ids ?? []) {
      try {
        results.push({ id, ...(await this.sign(user, id)) });
      } catch (e) {
        results.push({ id, error: (e as Error).message });
      }
    }
    return { signed: results.filter((r) => (r as any).signed).length, results };
  }

  // Retorna o PDF. Documentos vigentes e assinados usam o arquivo em cache;
  // documentos não-vigentes são regerados para exibir a tarja (req. 199).
  async getFile(id: string): Promise<{ buffer: Buffer; filename: string }> {
    const doc = await this.getOr404(id);
    const p = this.filePath(doc.number);
    let buffer: Buffer;
    if (doc.signed && doc.status === 'VALID' && fs.existsSync(p)) {
      buffer = fs.readFileSync(p);
    } else {
      buffer = await this.pdf.generateAlvara(doc as any);
    }
    return { buffer, filename: `${doc.number.replace(/\//g, '-')}.pdf` };
  }

  // ── Central de documentos e ciclo de vida (req. 153-158, 193-201) ──

  private logAction(documentId: string, action: string, byId: string, reason?: string) {
    return this.prisma.documentLog.create({
      data: { documentId, action, byId, reason },
    });
  }

  // Lista central com contador (req. 153-156, 195).
  async list(filters: { status?: string; isPublic?: string; signed?: string }) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.isPublic === 'true') where.isPublic = true;
    if (filters.isPublic === 'false') where.isPublic = false;
    // Aguardando (não assinado) x Publicados (assinado) — req. 193.
    if (filters.signed === 'true') where.signed = true;
    if (filters.signed === 'false') where.signed = false;
    const items = await this.prisma.document.findMany({
      where,
      include: {
        process: { select: { number: true } },
        emittedBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const total = await this.prisma.document.count();
    return { total, items };
  }

  async detail(id: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      include: {
        process: { select: { number: true } },
        emittedBy: { select: { name: true } },
        logs: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!doc) throw new NotFoundException('Documento não encontrado');
    return doc;
  }

  // Ações do ciclo de vida (req. 196-201).
  async action(userId: string, id: string, dto: { action: string; reason?: string }) {
    const doc = await this.getOr404(id);
    const { action, reason } = dto;

    switch (action) {
      case 'CANCEL':
        if (doc.status !== 'VALID')
          throw new BadRequestException('Somente documentos vigentes podem ser cancelados.');
        if (!reason) throw new BadRequestException('Justificativa obrigatória para cancelamento.');
        await this.prisma.document.update({ where: { id }, data: { status: 'CANCELLED' } });
        break;
      case 'SUSPEND':
        if (doc.status !== 'VALID')
          throw new BadRequestException('Somente documentos vigentes podem ser suspensos.');
        if (!reason) throw new BadRequestException('Justificativa obrigatória para suspensão.');
        await this.prisma.document.update({ where: { id }, data: { status: 'SUSPENDED' } });
        break;
      case 'REOPEN':
        if (doc.status !== 'SUSPENDED')
          throw new BadRequestException('Só é possível reabrir documentos suspensos.');
        await this.prisma.document.update({ where: { id }, data: { status: 'VALID' } });
        break;
      case 'REVERT':
        if (doc.status !== 'CANCELLED')
          throw new BadRequestException('Só é possível reverter documentos cancelados.');
        await this.prisma.document.update({ where: { id }, data: { status: 'VALID' } });
        break;
      case 'CHANCELAR':
        await this.prisma.document.update({ where: { id }, data: { chancelado: true } });
        break;
      case 'RETIFICAR':
        break; // registrado apenas no histórico
      default:
        throw new BadRequestException('Ação inválida');
    }

    const ACTION_LABEL: Record<string, string> = {
      CANCEL: 'CANCELAMENTO', SUSPEND: 'SUSPENSAO', REOPEN: 'REABERTURA',
      REVERT: 'REVERSAO', CHANCELAR: 'CHANCELA', RETIFICAR: 'RETIFICACAO',
    };
    await this.logAction(id, ACTION_LABEL[action], userId, reason);
    return this.detail(id);
  }

  // Estado de renovação (req. 157-158).
  async renewal(userId: string, id: string, dto: { state: string; observation?: string }) {
    await this.getOr404(id);
    const state = dto.state === 'Reverter' ? null : dto.state;
    await this.prisma.document.update({ where: { id }, data: { renewalState: state } });
    await this.logAction(id, `RENOVACAO:${dto.state}`, userId, dto.observation);
    return this.detail(id);
  }

  // Validade e visibilidade (req. 155, 194).
  async updateMeta(userId: string, id: string, dto: { validUntil?: string; isPublic?: boolean }) {
    await this.getOr404(id);
    const data: any = {};
    if (dto.validUntil !== undefined) data.validUntil = dto.validUntil ? new Date(dto.validUntil) : null;
    if (dto.isPublic !== undefined) data.isPublic = dto.isPublic;
    await this.prisma.document.update({ where: { id }, data });
    if (dto.validUntil !== undefined) await this.logAction(id, 'VALIDADE', userId, dto.validUntil);
    if (dto.isPublic !== undefined) await this.logAction(id, 'VISIBILIDADE', userId, dto.isPublic ? 'público' : 'privado');
    return this.detail(id);
  }
}
