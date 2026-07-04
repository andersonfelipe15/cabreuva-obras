import { Injectable, NotFoundException } from '@nestjs/common';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as QRCode from 'qrcode';
import JSZip from 'jszip';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentsService } from '../documents/documents.service';

// Tipos de ato para seleção da íntegra (req. 113).
type ActType = 'ABERTURA' | 'MOVIMENTO' | 'ANALISE' | 'DESPACHO' | 'TAXA' | 'DOCUMENTO';

export const ACT_TYPE_LABELS: Record<ActType, string> = {
  ABERTURA: 'Abertura do processo',
  MOVIMENTO: 'Encaminhamentos e decisões',
  ANALISE: 'Análises técnicas',
  DESPACHO: 'Despachos',
  TAXA: 'Taxas',
  DOCUMENTO: 'Documentos emitidos',
};

interface Act {
  type: ActType;
  date: Date;
  heading: string;
  lines: string[];
}

const MOVEMENT_LABEL: Record<string, string> = {
  FORWARD: 'Encaminhamento',
  DISPATCH: 'Despacho',
  RETURN: 'Devolução ao requerente',
  CORRECTION: 'Reapresentação corrigida',
  DECISION: 'Decisão',
  ARCHIVE: 'Arquivamento',
};

@Injectable()
export class IntegraService {
  constructor(
    private prisma: PrismaService,
    private documents: DocumentsService,
  ) {}

  // Lista os tipos de ato disponíveis num processo, para a tela de seleção (req. 113).
  async availableActTypes(processId: string): Promise<{ type: ActType; label: string; count: number }[]> {
    const acts = await this.collectActs(processId);
    const counts = new Map<ActType, number>();
    for (const a of acts) counts.set(a.type, (counts.get(a.type) ?? 0) + 1);
    return (Object.keys(ACT_TYPE_LABELS) as ActType[])
      .filter((t) => counts.has(t))
      .map((t) => ({ type: t, label: ACT_TYPE_LABELS[t], count: counts.get(t)! }));
  }

  // Gera a íntegra processual (relatório capa a capa e cronológico) — req. 109-113.
  // `filter` (opcional) restringe os atos aos tipos escolhidos.
  async generate(processId: string, filter?: ActType[]): Promise<Buffer> {
    const proc = await this.getProc(processId);
    let acts = this.collectActsFrom(proc);
    if (filter?.length) acts = acts.filter((a) => filter.includes(a.type));
    acts.sort((a, b) => a.date.getTime() - b.date.getTime());
    return this.buildPdf(proc, acts);
  }

  // Empacota a íntegra + os documentos emitidos num único ZIP (req. 113).
  async generateZip(processId: string, filter?: ActType[]): Promise<{ buffer: Buffer; filename: string }> {
    const proc = await this.getProc(processId);
    const safeNumber = String(proc.number).replace(/[^A-Za-z0-9._-]+/g, '-');
    const zip = new JSZip();
    const integraPdf = await this.generate(processId, filter);
    zip.file(`integra-${safeNumber}.pdf`, integraPdf);

    // Inclui os PDFs dos documentos emitidos como anexos, salvo se o filtro os excluir.
    const includeDocs = !filter?.length || filter.includes('DOCUMENTO');
    if (includeDocs && proc.documents?.length) {
      const docsFolder = zip.folder('documentos');
      for (const doc of proc.documents) {
        try {
          const { buffer, filename } = await this.documents.getFile(doc.id);
          docsFolder?.file(filename, buffer);
        } catch {
          // documento sem arquivo materializável — ignora no pacote
        }
      }
    }

    const buffer = await zip.generateAsync({ type: 'nodebuffer' });
    return { buffer, filename: `integra-${safeNumber}.zip` };
  }

  private async getProc(processId: string) {
    const proc = await this.prisma.process.findUnique({
      where: { id: processId },
      include: {
        processType: true,
        requester: true,
        movements: { include: { user: true, toSector: true } },
        analyses: { include: { analyst: true } },
        dispatches: { include: { author: true, dispatchType: true } },
        fees: true,
        documents: true,
      },
    });
    if (!proc) throw new NotFoundException('Processo não encontrado');
    return proc;
  }

  private async collectActs(processId: string): Promise<Act[]> {
    return this.collectActsFrom(await this.getProc(processId));
  }

  // Reúne os atos administrativos, cada um marcado com seu tipo (req. 110, 113).
  private collectActsFrom(proc: any): Act[] {
    const acts: Act[] = [];

    acts.push({
      type: 'ABERTURA',
      date: proc.protocoledAt ?? proc.createdAt,
      heading: 'Abertura do processo',
      lines: [
        `Assunto: ${proc.processType.name}`,
        `Requerente: ${proc.requester.name} (${proc.requester.document})`,
        ...this.kvLines(proc.formData as Record<string, unknown>),
      ],
    });

    for (const m of proc.movements) {
      if (m.type === 'PROTOCOL') continue; // já coberto pela abertura
      const c = (m.content as any) ?? {};
      const lines: string[] = [`Responsável: ${m.user.name}`];
      if (m.toSector) lines.push(`Para o setor: ${m.toSector.name}`);
      if (c.reason) lines.push(`Motivo: ${c.reason}`);
      if (c.decision) lines.push(`Decisão: ${c.decision}`);
      if (c.text) lines.push(c.text);
      if (c.note) lines.push(c.note);
      acts.push({
        type: 'MOVIMENTO',
        date: m.createdAt,
        heading: MOVEMENT_LABEL[m.type] ?? m.type,
        lines,
      });
    }

    for (const a of proc.analyses) {
      const items = (a.items as any[]) ?? [];
      acts.push({
        type: 'ANALISE',
        date: a.createdAt,
        heading: 'Análise técnica',
        lines: [
          `Analista: ${a.analyst.name}`,
          ...items.map(
            (i) => `[${i.ok ? 'x' : ' '}] ${i.label}${i.note ? ' — ' + i.note : ''}`,
          ),
          ...(a.conclusion ? [`Parecer: ${a.conclusion}`] : []),
        ],
      });
    }

    for (const d of proc.dispatches) {
      const lines: string[] = [
        `Tipo: ${d.dispatchType.name}`,
        `Responsável: ${d.author.name}`,
        ...(d.situation ? [`Situação: ${d.situation}`] : []),
        ...this.kvLines(d.values as Record<string, unknown>),
      ];
      if (d.adjustmentType) {
        lines.push(`Ajuste: ${d.adjustmentType}`);
        if (d.justification) lines.push(`Justificativa: ${d.justification}`);
      }
      acts.push({ type: 'DESPACHO', date: d.createdAt, heading: `Despacho: ${d.title}`, lines });
    }

    for (const f of proc.fees) {
      acts.push({
        type: 'TAXA',
        date: f.createdAt,
        heading: 'Taxa',
        lines: [`${f.description}`, `Valor: R$ ${f.amount}`, `Situação: ${f.status}`],
      });
    }

    for (const doc of proc.documents) {
      acts.push({
        type: 'DOCUMENTO',
        date: doc.createdAt,
        heading: 'Documento emitido',
        lines: [
          `${doc.number} (${doc.type})`,
          `Situação: ${doc.status}`,
          doc.signed ? 'Assinado digitalmente' : 'Não assinado',
          `Validador: ${doc.validationCode}`,
        ],
      });
    }

    return acts;
  }

  // Brasão institucional simplificado (escudo) para a capa (req. 112).
  private drawBrasao(page: any, x: number, yTop: number, color: any, bold: any) {
    const path = 'M0,0 L44,0 L44,28 Q44,46 22,52 Q0,46 0,28 Z';
    page.drawSvgPath(path, { x, y: yTop, color, borderColor: color, scale: 1 });
    // Borda interna clara e sigla do município.
    page.drawText('CAB', {
      x: x + 9, y: yTop - 30, size: 13, font: bold, color: rgb(1, 1, 1),
    });
  }

  private kvLines(obj: Record<string, unknown>): string[] {
    if (!obj) return [];
    return Object.entries(obj).map(
      ([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v ?? '')}`,
    );
  }

  private async buildPdf(proc: any, acts: Act[]): Promise<Buffer> {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const green = rgb(0.12, 0.48, 0.24);
    const black = rgb(0.1, 0.1, 0.1);
    const margin = 50;

    const baseUrl = process.env.PUBLIC_URL || 'http://localhost:3000';
    // Rota de SPA válida para consulta do processo (o /processo/:number antigo não resolvia).
    const verifyUrl = `${baseUrl}/process/${proc.id}`;

    // ── Capa (req. 112) ──
    const capa = pdf.addPage([595, 842]);
    this.drawBrasao(capa, margin, 762, green, bold);
    capa.drawText('PREFEITURA MUNICIPAL DE CABREÚVA', {
      x: margin + 56, y: 786, size: 16, font: bold, color: green,
    });
    capa.drawText('Secretaria de Meio Ambiente, Obras e Serviços Urbanos', {
      x: margin + 56, y: 768, size: 10, font, color: green,
    });
    capa.drawText('ÍNTEGRA DO PROCESSO', {
      x: margin, y: 700, size: 22, font: bold, color: black,
    });
    const capaInfo = [
      `Número de autuação: ${proc.number}`,
      `Assunto: ${proc.processType.name}`,
      `Requerente: ${proc.requester.name}`,
      `Data do protocolo: ${(proc.protocoledAt ?? proc.createdAt).toLocaleString('pt-BR')}`,
      `Total de atos: ${acts.length}`,
    ];
    capaInfo.forEach((t, i) =>
      capa.drawText(t, { x: margin, y: 660 - i * 20, size: 12, font, color: black }),
    );
    const qrPng = await QRCode.toBuffer(verifyUrl, { margin: 1, width: 120 });
    const qrImg = await pdf.embedPng(qrPng);
    capa.drawImage(qrImg, { x: margin, y: 420, width: 110, height: 110 });
    capa.drawText('Verificação de autenticidade:', {
      x: margin + 125, y: 500, size: 10, font: bold, color: green,
    });
    capa.drawText(verifyUrl, {
      x: margin + 125, y: 486, size: 9, font, color: rgb(0.2, 0.2, 0.6),
    });

    // ── Atos: uma folha por ato, numerada (req. 111) ──
    acts.forEach((act, idx) => {
      const page = pdf.addPage([595, 842]);
      let y = 792;
      page.drawText(`Folha ${idx + 1}`, {
        x: 500, y: 810, size: 9, font, color: rgb(0.5, 0.5, 0.5),
      });
      page.drawText(act.heading, { x: margin, y, size: 15, font: bold, color: green });
      y -= 8;
      page.drawLine({
        start: { x: margin, y }, end: { x: 545, y }, thickness: 1, color: green,
      });
      y -= 22;
      page.drawText(act.date.toLocaleString('pt-BR'), {
        x: margin, y, size: 9, font, color: rgb(0.4, 0.4, 0.4),
      });
      y -= 22;
      for (const line of act.lines) {
        if (y < 60) break; // corta se exceder a folha (POC)
        page.drawText(line.slice(0, 100), { x: margin, y, size: 10, font, color: black });
        y -= 16;
      }
    });

    const bytes = await pdf.save();
    return Buffer.from(bytes);
  }
}
