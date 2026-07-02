import { Injectable } from '@nestjs/common';
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import * as QRCode from 'qrcode';

interface DocForPdf {
  number: string;
  type: string;
  validationCode: string;
  qrData: string;
  validUntil?: Date | null;
  createdAt: Date;
  content: any;
  status?: string;
}

@Injectable()
export class PdfService {
  // Gera o PDF do alvará. Retorna Buffer não comprimido (necessário para o
  // placeholder de assinatura do node-signpdf).
  async generateAlvara(doc: DocForPdf): Promise<Buffer> {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595, 842]); // A4 em pontos

    // Personalização: fonte e cabeçalho configuráveis por assunto (req. 190).
    const tpl = doc.content?.template ?? {};
    const FONTS: Record<string, [StandardFonts, StandardFonts]> = {
      Helvetica: [StandardFonts.Helvetica, StandardFonts.HelveticaBold],
      TimesRoman: [StandardFonts.TimesRoman, StandardFonts.TimesRomanBold],
      Courier: [StandardFonts.Courier, StandardFonts.CourierBold],
    };
    const [fName, fBold] = FONTS[tpl.font as string] || FONTS.Helvetica;
    const font = await pdf.embedFont(fName);
    const bold = await pdf.embedFont(fBold);
    const { width, height } = page.getSize();
    const green = rgb(0.12, 0.48, 0.24);
    const black = rgb(0.1, 0.1, 0.1);
    const margin = 50;
    let y = height - margin;

    const text = (
      s: string,
      size = 11,
      opts: { bold?: boolean; color?: any; x?: number } = {},
    ) => {
      page.drawText(s, {
        x: opts.x ?? margin,
        y,
        size,
        font: opts.bold ? bold : font,
        color: opts.color ?? black,
      });
    };

    // Cabeçalho — emblema (bloco) + órgão/secretaria personalizáveis (req. 190).
    page.drawRectangle({ x: margin, y: y - 10, width: 26, height: 26, color: green, opacity: 0.85 });
    text(tpl.orgao || 'PREFEITURA MUNICIPAL DE CABREÚVA', 14, { bold: true, color: green, x: margin + 34 });
    y -= 16;
    text(tpl.secretaria || 'Secretaria de Meio Ambiente, Obras e Serviços Urbanos', 10, {
      color: green, x: margin + 34,
    });
    y -= 30;

    // Título (vem do documentTemplate; fallback por tipo)
    const title =
      doc.content?.title ||
      (doc.type === 'ALVARA' ? 'ALVARÁ DE CONSTRUÇÃO' : doc.type);
    text(title, 18, { bold: true });
    y -= 10;
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 1.5,
      color: green,
    });
    y -= 30;

    // Dados principais
    text(`Documento nº: ${doc.number}`, 11, { bold: true });
    y -= 18;
    text(`Processo nº: ${doc.content?.processNumber ?? '-'}`);
    y -= 18;
    text(`Requerente: ${doc.content?.requester ?? '-'}`);
    y -= 18;
    text(
      `Emitido em: ${new Date(doc.createdAt).toLocaleString('pt-BR')}`,
    );
    y -= 28;

    // Dados do formulário (campos-chave)
    text('DADOS DA OBRA', 12, { bold: true, color: green });
    y -= 20;
    const fd = doc.content?.formData ?? {};
    const keys = [
      ['tipoObra', 'Tipo de obra'],
      ['usoConstrucao', 'Uso'],
      ['logradouro', 'Logradouro'],
      ['numero', 'Número'],
      ['areaTerreno', 'Área do terreno (m²)'],
      ['areaConstruida', 'Área construída (m²)'],
      ['pavimentos', 'Pavimentos'],
      ['rtNome', 'Responsável Técnico'],
      ['rtRegistro', 'Registro (CREA/CAU)'],
    ];
    for (const [k, label] of keys) {
      const v = fd[k];
      if (v === undefined || v === null || v === '') continue;
      text(`${label}: ${v}`, 10);
      y -= 15;
    }

    // Quadro de áreas do empreendimento, quando houver (req. 60).
    const quadros = fd.quadroAreas as any[];
    if (Array.isArray(quadros) && quadros.length) {
      y -= 8;
      text('QUADRO DE ÁREAS', 12, { bold: true, color: green });
      y -= 18;
      for (const q of quadros) {
        text(`${q?.descricao ?? '-'}: ${q?.area ?? '-'} m²`, 10);
        y -= 15;
      }
    }
    y -= 20;

    // Texto legal
    text(
      'Fica autorizada a execução da obra conforme projeto aprovado e',
      10,
    );
    y -= 14;
    text('legislação municipal vigente.', 10);
    y -= 40;

    // QR Code + autenticadores (req. 191-192)
    const qrPng = await QRCode.toBuffer(doc.qrData, { margin: 1, width: 120 });
    const qrImg = await pdf.embedPng(qrPng);
    page.drawImage(qrImg, { x: margin, y: y - 100, width: 100, height: 100 });

    page.drawText('Autenticação do documento', {
      x: margin + 120,
      y: y - 20,
      size: 10,
      font: bold,
      color: green,
    });
    page.drawText(`Código validador: ${doc.validationCode}`, {
      x: margin + 120,
      y: y - 38,
      size: 9,
      font,
    });
    page.drawText('Verifique a autenticidade em:', {
      x: margin + 120,
      y: y - 54,
      size: 9,
      font,
    });
    page.drawText(doc.qrData, {
      x: margin + 120,
      y: y - 68,
      size: 8,
      font,
      color: rgb(0.2, 0.2, 0.6),
    });
    page.drawText('Documento assinado digitalmente (ICP-Brasil / A1).', {
      x: margin + 120,
      y: y - 88,
      size: 8,
      font,
    });

    // Tarja de situação quando o documento não está vigente (req. 199).
    if (doc.status && doc.status !== 'VALID') {
      const tarja =
        doc.status === 'CANCELLED' ? 'CANCELADO'
        : doc.status === 'SUSPENDED' ? 'SUSPENSO'
        : doc.status === 'REVOKED' ? 'CASSADO' : doc.status;
      page.drawText(tarja, {
        x: 90,
        y: 360,
        size: 70,
        font: bold,
        color: rgb(0.85, 0.1, 0.1),
        rotate: degrees(35),
        opacity: 0.35,
      });
    }

    // useObjectStreams:false é obrigatório para o placeholder de assinatura.
    const bytes = await pdf.save({ useObjectStreams: false });
    return Buffer.from(bytes);
  }
}
