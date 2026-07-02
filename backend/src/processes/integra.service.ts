import { Injectable, NotFoundException } from '@nestjs/common';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';

interface Act {
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
  constructor(private prisma: PrismaService) {}

  // Gera a íntegra processual (relatório capa a capa e cronológico) — req. 109-113.
  async generate(processId: string): Promise<Buffer> {
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

    // Reúne os atos administrativos (req. 110).
    const acts: Act[] = [];

    acts.push({
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
        date: m.createdAt,
        heading: MOVEMENT_LABEL[m.type] ?? m.type,
        lines,
      });
    }

    for (const a of proc.analyses) {
      const items = (a.items as any[]) ?? [];
      acts.push({
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
      acts.push({ date: d.createdAt, heading: `Despacho: ${d.title}`, lines });
    }

    for (const f of proc.fees) {
      acts.push({
        date: f.createdAt,
        heading: 'Taxa',
        lines: [`${f.description}`, `Valor: R$ ${f.amount}`, `Situação: ${f.status}`],
      });
    }

    for (const doc of proc.documents) {
      acts.push({
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

    acts.sort((a, b) => a.date.getTime() - b.date.getTime());

    return this.buildPdf(proc, acts);
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
    const verifyUrl = `${baseUrl}/processo/${proc.number}`;

    // ── Capa (req. 112) ──
    const capa = pdf.addPage([595, 842]);
    capa.drawText('PREFEITURA MUNICIPAL DE CABREÚVA', {
      x: margin, y: 780, size: 16, font: bold, color: green,
    });
    capa.drawText('Secretaria de Meio Ambiente, Obras e Serviços Urbanos', {
      x: margin, y: 760, size: 10, font, color: green,
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
