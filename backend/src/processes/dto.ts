import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class ProtocolDto {
  @ApiProperty()
  @IsUUID()
  processTypeId: string;

  @ApiProperty({ description: 'Valores preenchidos no formulário' })
  @IsObject()
  formData: Record<string, unknown>;

  @ApiProperty({ required: false, description: 'Quadro de áreas' })
  @IsOptional()
  @IsArray()
  areas?: unknown[];

  @ApiProperty({
    required: false,
    description: 'Processo deferido a vincular (renovações)',
  })
  @IsOptional()
  @IsUUID()
  linkedToId?: string;
}

export class ForwardDto {
  @IsUUID()
  toSectorId: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class DispatchDto {
  @IsString()
  text: string;
}

export class ReturnDto {
  @IsString()
  reason: string;

  @ApiProperty({ description: 'Campos que o requerente poderá corrigir' })
  @IsOptional()
  @IsArray()
  correctableFields?: string[];
}

export class CorrectDto {
  @IsObject()
  formData: Record<string, unknown>;
}

export class AnalyzeDto {
  @ApiProperty({ description: 'Itens do checklist respondidos' })
  @IsArray()
  items: { key: string; label: string; ok: boolean; note?: string }[];

  @IsOptional()
  @IsString()
  conclusion?: string;
}

export class DecisionDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
