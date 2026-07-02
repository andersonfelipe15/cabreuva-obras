import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { PdfService } from './pdf.service';
import { SignatureService } from './signature.service';

@Module({
  providers: [DocumentsService, PdfService, SignatureService],
  controllers: [DocumentsController],
})
export class DocumentsModule {}
