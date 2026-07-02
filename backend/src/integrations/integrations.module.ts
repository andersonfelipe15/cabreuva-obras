import { Module } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';
import { MockController } from './mock.controller';

@Module({
  providers: [IntegrationsService],
  controllers: [IntegrationsController, MockController],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
