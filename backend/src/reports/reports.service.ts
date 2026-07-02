import { Injectable, NotFoundException } from '@nestjs/common';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { PrismaService } from '../prisma/prisma.service';

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Rascunho',
  PROTOCOLED: 'Protocolado',
  IN_ANALYSIS: 'Em análise',
  RETURNED: 'Devolvido',
  DEFERRED: 'Deferido',
  INDEFERRED: 'Indeferido',
  ARCHIVED: 'Arquivado',
};

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  // Estatísticas gerenciais para o dashboard (req. 21 / operação).
  async dashboard() {
    const total = await this.prisma.process.count();

    const byStatusRaw = await this.prisma.process.groupBy({
      by: ['status'],
      _count: { _all: true },
    });
    const byStatus = byStatusRaw.map((r) => ({
      status: r.status,
      label: STATUS_LABEL[r.status] ?? r.status,
      count: r._count._all,
    }));

    const byTypeRaw = await this.prisma.process.groupBy({
      by: ['processTypeId'],
      _count: { _all: true },
    });
    const types = await this.prisma.processType.findMany({
      select: { id: true, name: true, category: true },
    });
    const typeMap = new Map(types.map((t) => [t.id, t]));

    const byType = byTypeRaw.map((r) => ({
      name: typeMap.get(r.processTypeId)?.name ?? '—',
      count: r._count._all,
    }));

    const byCategory: Record<string, number> = {};
    for (const r of byTypeRaw) {
      const cat = typeMap.get(r.processTypeId)?.category ?? 'OUTROS';
      byCategory[cat] = (byCategory[cat] ?? 0) + r._count._all;
    }

    const documents = await this.prisma.document.count();
    const signed = await this.prisma.document.count({ where: { signed: true } });

    // Tempo médio até o deferimento (dias).
    const deferred = await this.prisma.process.findMany({
      where: { status: 'DEFERRED' },
      select: { protocoledAt: true, updatedAt: true },
    });
    let avgDeferralDays: number | null = null;
    if (deferred.length) {
      const totalMs = deferred.reduce((acc, p) => {
        const start = p.protocoledAt?.getTime() ?? p.updatedAt.getTime();
        return acc + (p.updatedAt.getTime() - start);
      }, 0);
      avgDeferralDays =
        Math.round((totalMs / deferred.length / 86400000) * 10) / 10;
    }

    return {
      total,
      byStatus,
      byCategory,
      byType,
      documents: { total: documents, signed },
      avgDeferralDays,
    };
  }

  // Relatório CSV de protocolos, com todos os dados da última versão (req. 187).
  async protocolsCsv(filters: {
    processTypeId?: string;
    from?: string;
    to?: string;
  }): Promise<string> {
    const where: any = {};
    if (filters.processTypeId) where.processTypeId = filters.processTypeId;
    if (filters.from || filters.to) {
      where.protocoledAt = {};
      if (filters.from) where.protocoledAt.gte = new Date(filters.from);
      if (filters.to) where.protocoledAt.lte = new Date(filters.to + 'T23:59:59');
    }

    const procs = await this.prisma.process.findMany({
      where,
      include: {
        processType: { select: { name: true, formDefinition: true } },
        requester: { select: { name: true, document: true } },
      },
      orderBy: { protocoledAt: 'asc' },
    });

    // Chaves de campos sigilosos por assunto — mascaradas fora do processo (req. 74).
    const sensitiveKeys = (pt: any): Set<string> => {
      const keys = new Set<string>();
      for (const s of (pt?.formDefinition as any)?.sections ?? [])
        for (const f of s.fields ?? []) if (f.sensitive) keys.add(f.key);
      return keys;
    };

    // Colunas dinâmicas: união das chaves de formData (última versão).
    const dataKeys = new Set<string>();
    for (const p of procs) {
      Object.keys((p.formData as object) ?? {}).forEach((k) => dataKeys.add(k));
    }
    const dynamicCols = [...dataKeys];

    const baseCols = [
      'numero',
      'tipo',
      'requerente',
      'documento',
      'status',
      'protocolo',
    ];
    const header = [...baseCols, ...dynamicCols];

    const esc = (v: unknown) =>
      `"${String(v ?? '').replace(/"/g, '""')}"`;

    const lines = [header.map(esc).join(',')];
    for (const p of procs) {
      const fd = (p.formData as Record<string, unknown>) ?? {};
      const secret = sensitiveKeys(p.processType);
      const row = [
        p.number,
        p.processType.name,
        p.requester.name,
        p.requester.document,
        STATUS_LABEL[p.status] ?? p.status,
        p.protocoledAt?.toISOString() ?? '',
        ...dynamicCols.map((k) => {
          if (secret.has(k)) return '••• (sigiloso)'; // não exporta dado sensível (req. 74)
          const v = fd[k];
          return typeof v === 'object' ? JSON.stringify(v) : v;
        }),
      ];
      lines.push(row.map(esc).join(','));
    }
    // BOM p/ acentuação correta no Excel.
    return '﻿' + lines.join('\r\n');
  }

  // Relatório PDF de desempenho (req. 188).
  async performancePdf(filters: {
    from?: string;
    to?: string;
    analystId?: string;
  }): Promise<Buffer> {
    const range: any = {};
    if (filters.from) range.gte = new Date(filters.from);
    if (filters.to) range.lte = new Date(filters.to + 'T23:59:59');
    const hasRange = filters.from || filters.to;

    const analyses = await this.prisma.analysis.findMany({
      where: {
        ...(hasRange ? { createdAt: range } : {}),
        ...(filters.analystId ? { analystId: filters.analystId } : {}),
      },
      include: {
        analyst: { select: { name: true } },
        process: { select: { number: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const deferred = await this.prisma.process.findMany({
      where: { status: 'DEFERRED', ...(hasRange ? { updatedAt: range } : {}) },
      select: { number: true, updatedAt: true },
      orderBy: { updatedAt: 'asc' },
    });

    const period =
      filters.from || filters.to
        ? `Período: ${filters.from ?? '...'} a ${filters.to ?? '...'}`
        : 'Período: todo o histórico';

    return this.buildPdf('RELATÓRIO DE DESEMPENHO', [
      { heading: period, rows: [] },
      {
        heading: `Análises realizadas (${analyses.length})`,
        rows: analyses.map(
          (a) =>
            `Processo ${a.process.number} · ${a.analyst.name} · ${a.createdAt.toLocaleString('pt-BR')}`,
        ),
      },
      {
        heading: `Deferimentos no período (${deferred.length})`,
        rows: deferred.map(
          (d) => `Processo ${d.number} · ${d.updatedAt.toLocaleString('pt-BR')}`,
        ),
      },
    ]);
  }

  // Relatório de dados de um processo, com seções selecionáveis (req. 183-186).
  async processReport(
    id: string,
    opts: { history?: boolean; analyses?: boolean; documents?: boolean; dispatches?: boolean; version?: number },
  ): Promise<Buffer> {
    const p = await this.prisma.process.findUnique({
      where: { id },
      include: {
        processType: true,
        requester: true,
        movements: { include: { user: true, toSector: true } },
        analyses: { include: { analyst: true } },
        documents: true,
        dispatches: { include: { author: true } },
      },
    });
    if (!p) throw new NotFoundException('Processo não encontrado');

    // Versões dos dados do formulário (req. 185): snapshots das correções + atual.
    const corrections = p.movements
      .filter((m) => m.type === 'CORRECTION')
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const versions = [
      ...corrections.map((c) => (c.content as any)?.previousFormData ?? {}),
      p.formData,
    ];
    let vIdx = versions.length - 1;
    if (opts.version != null && opts.version >= 0 && opts.version < versions.length) {
      vIdx = opts.version;
    }
    const versionLabel =
      vIdx === versions.length - 1
        ? `versão atual (${versions.length} de ${versions.length})`
        : `versão ${vIdx + 1} de ${versions.length}`;

    const sections: { heading: string; rows: string[] }[] = [
      {
        heading: `Processo ${p.number} — ${p.processType.name}`,
        rows: [
          `Requerente: ${p.requester.name} (${p.requester.document})`,
          `Situação: ${p.status}`,
          `Protocolado em: ${(p.protocoledAt ?? p.createdAt).toLocaleString('pt-BR')}`,
        ],
      },
      { heading: `Dados do formulário — ${versionLabel}`, rows: this.kv(versions[vIdx] as any) },
    ];
    if (opts.analyses) {
      sections.push({
        heading: `Análises técnicas (${p.analyses.length})`,
        rows: p.analyses.flatMap((a) => [
          `Analista: ${a.analyst.name} · ${a.createdAt.toLocaleString('pt-BR')}`,
          ...((a.items as any[]) ?? []).map((i) => `  [${i.ok ? 'x' : ' '}] ${i.label}`),
          ...(a.conclusion ? [`  Parecer: ${a.conclusion}`] : []),
        ]),
      });
    }
    if (opts.dispatches) {
      sections.push({
        heading: `Despachos (${p.dispatches.length})`,
        rows: p.dispatches.map((d) => `${d.title} · ${d.author.name} · ${d.situation ?? ''}`),
      });
    }
    if (opts.documents) {
      sections.push({
        heading: `Documentos (${p.documents.length})`,
        rows: p.documents.map((d) => `${d.number} (${d.type}) — ${d.status}`),
      });
    }
    if (opts.history) {
      sections.push({
        heading: `Histórico (${p.movements.length})`,
        rows: p.movements.map((m) => `${m.type} · ${m.user.name} · ${m.createdAt.toLocaleString('pt-BR')}`),
      });
    }
    return this.buildPdf('RELATÓRIO DO PROCESSO', sections);
  }

  private kv(obj: Record<string, unknown>): string[] {
    if (!obj) return [];
    return Object.entries(obj).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v ?? '')}`);
  }

  // Gera um PDF simples com seções e linhas, paginando automaticamente.
  private async buildPdf(
    title: string,
    sections: { heading: string; rows: string[] }[],
  ): Promise<Buffer> {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const green = rgb(0.12, 0.48, 0.24);
    const black = rgb(0.1, 0.1, 0.1);
    const margin = 50;

    let page = pdf.addPage([595, 842]);
    let y = 792;
    const newPage = () => {
      page = pdf.addPage([595, 842]);
      y = 792;
    };
    const line = (
      t: string,
      size = 10,
      opts: { bold?: boolean; color?: any } = {},
    ) => {
      if (y < 60) newPage();
      page.drawText(t.slice(0, 110), {
        x: margin,
        y,
        size,
        font: opts.bold ? bold : font,
        color: opts.color ?? black,
      });
      y -= size + 4;
    };

    line('PREFEITURA MUNICIPAL DE CABREÚVA', 12, { bold: true, color: green });
    line(title, 16, { bold: true });
    line(`Gerado em ${new Date().toLocaleString('pt-BR')}`, 9);
    y -= 8;

    for (const s of sections) {
      if (y < 80) newPage();
      line(s.heading, 12, { bold: true, color: green });
      if (s.rows.length === 0) line('—', 9);
      for (const r of s.rows) line(r, 9);
      y -= 8;
    }

    const bytes = await pdf.save();
    return Buffer.from(bytes);
  }
}
