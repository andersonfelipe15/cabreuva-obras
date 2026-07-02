// Gera um certificado A1 de TESTE (.p12) para demonstrar a assinatura digital.
// Em produção, substitua por um certificado real ICP-Brasil (não use este).
// Uso: npm run gen:cert
import * as forge from 'node-forge';
import * as fs from 'fs';
import * as path from 'path';

const PASSWORD = process.env.SIGN_CERT_PASSWORD || '12345678';
const outDir = path.join(process.cwd(), 'certs');
const outPath = path.join(outDir, 'test-a1.p12');

const keys = forge.pki.rsa.generateKeyPair(2048);
const cert = forge.pki.createCertificate();
cert.publicKey = keys.publicKey;
cert.serialNumber = '01';
cert.validity.notBefore = new Date();
cert.validity.notAfter = new Date();
cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 5);

const attrs = [
  { name: 'commonName', value: 'PREFEITURA DE CABREUVA (CERTIFICADO DE TESTE)' },
  { name: 'countryName', value: 'BR' },
  { shortName: 'ST', value: 'SP' },
  { name: 'localityName', value: 'Cabreuva' },
  { name: 'organizationName', value: 'Prefeitura Municipal de Cabreuva' },
];
cert.setSubject(attrs);
cert.setIssuer(attrs);
cert.setExtensions([
  { name: 'basicConstraints', cA: false },
  { name: 'keyUsage', digitalSignature: true, nonRepudiation: true },
]);
cert.sign(keys.privateKey, forge.md.sha256.create());

const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], PASSWORD, {
  algorithm: '3des',
});
const der = forge.asn1.toDer(p12Asn1).getBytes();

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outPath, Buffer.from(der, 'binary'));

console.log(`Certificado A1 de teste gerado em: ${outPath}`);
console.log(`Senha: ${PASSWORD}`);
console.log('ATENÇÃO: certificado autoassinado, apenas para demonstração.');
