import { Injectable, BadRequestException } from '@nestjs/common';
import { SignPdf } from '@signpdf/signpdf';
import { P12Signer } from '@signpdf/signer-p12';
import { plainAddPlaceholder } from '@signpdf/placeholder-plain';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SignatureService {
  private certPath =
    process.env.SIGN_CERT_PATH ||
    path.join(process.cwd(), 'certs', 'test-a1.p12');
  private passphrase = process.env.SIGN_CERT_PASSWORD || '12345678';

  // Assina um PDF (Buffer) com certificado A1 (.p12/.pfx), padrão PAdES.
  async signPdf(
    pdfBuffer: Buffer,
    meta: { name: string; reason: string; location: string },
  ): Promise<Buffer> {
    if (!fs.existsSync(this.certPath)) {
      throw new BadRequestException(
        `Certificado A1 não encontrado em ${this.certPath}. ` +
          'Gere um de teste com "npm run gen:cert" ou configure SIGN_CERT_PATH.',
      );
    }
    const p12 = fs.readFileSync(this.certPath);

    // 1) Insere o placeholder de assinatura (ByteRange) no PDF.
    const withPlaceholder = plainAddPlaceholder({
      pdfBuffer,
      reason: meta.reason,
      contactInfo: '',
      name: meta.name,
      location: meta.location,
    });

    // 2) Assina com o certificado A1.
    const signer = new P12Signer(p12, { passphrase: this.passphrase });
    const signed = await new SignPdf().sign(withPlaceholder, signer);
    return signed;
  }
}
