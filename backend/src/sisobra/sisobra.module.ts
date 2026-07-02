import { Module } from '@nestjs/common';
import { SisobraService } from './sisobra.service';
import { SisobraController } from './sisobra.controller';

@Module({
  providers: [SisobraService],
  controllers: [SisobraController],
})
export class SisobraModule {}
