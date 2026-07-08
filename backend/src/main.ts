import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import * as fs from 'fs';
import { AppModule } from './app.module';

// Em produção o certificado A1 pode vir como base64 (SIGN_CERT_BASE64) e é
// gravado em SIGN_CERT_PATH no boot — assim o .pfx não vai no repositório/imagem.
function materializeCertFromEnv() {
  const b64 = process.env.SIGN_CERT_BASE64;
  const path = process.env.SIGN_CERT_PATH;
  if (b64 && path && !fs.existsSync(path)) {
    fs.mkdirSync(join(path, '..'), { recursive: true });
    fs.writeFileSync(path, Buffer.from(b64, 'base64'));
    console.log('Certificado A1 gravado a partir de SIGN_CERT_BASE64.');
  }
}

async function bootstrap() {
  materializeCertFromEnv();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Documentos enviados à IA vão como base64 no corpo JSON; o limite padrão (100kb)
  // estoura com PDFs ("request entity too large"). Amplia para 25mb.
  app.useBodyParser('json', { limit: '25mb' });
  app.useBodyParser('urlencoded', { limit: '25mb', extended: true });
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // Todas as rotas da API ficam sob /api (o frontend já chama /api/*).
  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('Aprovação de Projetos e Licenciamento')
    .setDescription('API — Pregão Cabreúva')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));

  // Serviço único (produção): o backend também serve o frontend compilado.
  if (process.env.SERVE_CLIENT === 'true') {
    const clientDir = join(process.cwd(), 'client');
    const express = app.getHttpAdapter().getInstance();
    // Fallback SPA: registrado ANTES das rotas do Nest. Deixa passar (/api, /docs
    // e arquivos) para o roteador/estático; o resto (rotas do React como /login,
    // /redefinir-senha, /process/:id) recebe o index.html.
    express.get('*', (req: any, res: any, next: any) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/docs') || req.path.includes('.')) {
        return next();
      }
      res.sendFile(join(clientDir, 'index.html'));
    });
    app.useStaticAssets(clientDir);
  }

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`API rodando na porta ${port} (docs em /docs)`);
}
bootstrap();
