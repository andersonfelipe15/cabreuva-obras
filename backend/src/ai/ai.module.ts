import { Module } from '@nestjs/common';
import { AnthropicService } from './anthropic.service';
import { AiController } from './ai.controller';

@Module({
  providers: [AnthropicService],
  controllers: [AiController],
  exports: [AnthropicService],
})
export class AiModule {}
