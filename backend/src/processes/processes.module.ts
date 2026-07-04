import { Module } from '@nestjs/common';
import { ProcessesService } from './processes.service';
import { ProcessesController } from './processes.controller';
import { VerifyController } from './verify.controller';
import { DispatchesService } from './dispatches.service';
import { DispatchesController } from './dispatches.controller';
import { IntegraService } from './integra.service';
import { SubstitutionsService } from './substitutions.service';
import { SubstitutionsController } from './substitutions.controller';
import { IntegrationsModule } from '../integrations/integrations.module';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [IntegrationsModule, DocumentsModule],
  providers: [ProcessesService, DispatchesService, IntegraService, SubstitutionsService],
  controllers: [
    ProcessesController,
    VerifyController,
    DispatchesController,
    SubstitutionsController,
  ],
})
export class ProcessesModule {}
