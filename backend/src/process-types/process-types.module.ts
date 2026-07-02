import { Module } from '@nestjs/common';
import { ProcessTypesService } from './process-types.service';
import { ProcessTypesController } from './process-types.controller';

@Module({
  providers: [ProcessTypesService],
  controllers: [ProcessTypesController],
  exports: [ProcessTypesService],
})
export class ProcessTypesModule {}
