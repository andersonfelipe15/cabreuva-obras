// Teste isolado do pipeline: gera PDF do alvará e assina com A1.
// Não depende do banco. Uso: npm run gen:cert && ts-node scripts/test-sign.ts
import * as fs from 'fs';
import * as path from 'path';
import { PdfService } from '../src/documents/pdf.service';
import { SignatureService } from '../src/documents/signature.service';

async function main() {
  const outDir = path.join(process.cwd(), 'storage');
  fs.mkdirSync(outDir, { recursive: true });

  const pdf = new PdfService();
  const sig = new SignatureService();

  const doc = {
    number: 'ALV-2026/00001',
    type: 'ALVARA',
    validationCode: 'ABCDEF1234567890',
    qrData: 'http://localhost:3000/verificar/ABCDEF1234567890',
    createdAt: new Date(),
    content: {
      processNumber: '2026/000001',
      requester: 'João Requerente',
      formData: {
        tipoObra: 'Construção',
        usoConstrucao: 'Residencial',
        logradouro: 'Rua das Flores',
        numero: '100',
        areaTerreno: 300,
        areaConstruida: 150,
        pavimentos: 2,
        rtNome: 'Eng. Maria Silva',
        rtRegistro: 'CREA-SP 123456',
      },
    },
  };

  console.log('1) Gerando PDF...');
  const unsigned = await pdf.generateAlvara(doc as any);
  fs.writeFileSync(path.join(outDir, 'test-unsigned.pdf'), unsigned);
  console.log(`   PDF gerado: ${unsigned.length} bytes`);

  console.log('2) Assinando com A1...');
  const signed = await sig.signPdf(unsigned, {
    name: 'Prefeitura Municipal de Cabreúva',
    reason: 'Emissão do documento ALV-2026/00001',
    location: 'Cabreúva/SP',
  });
  fs.writeFileSync(path.join(outDir, 'test-signed.pdf'), signed);
  console.log(`   PDF assinado: ${signed.length} bytes`);

  // Verificações: o PDF assinado deve conter a estrutura de assinatura PKCS#7.
  const raw = signed.toString('latin1');
  const hasByteRange = raw.includes('/ByteRange');
  const hasSig = raw.includes('adbe.pkcs7.detached') || raw.includes('/Type /Sig');
  console.log('3) Verificação da assinatura:');
  console.log(`   contém /ByteRange: ${hasByteRange}`);
  console.log(`   contém assinatura PKCS#7: ${hasSig}`);

  if (hasByteRange && hasSig) {
    console.log('\n✅ PIPELINE OK — PDF gerado e assinado digitalmente.');
    console.log(`   Arquivos em: ${outDir}`);
  } else {
    console.error('\n❌ Falha: assinatura não encontrada no PDF.');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
