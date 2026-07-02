import { Module } from '@nestjs/common';
import { DispatchTypesService } from './dispatch-types.service';
import { DispatchTypesController } from './dispatch-types.controller';

@Module({
  providers: [DispatchTypesService],
  controllers: [DispatchTypesController],
  exports: [DispatchTypesService],
})
export class DispatchTypesModule {}
