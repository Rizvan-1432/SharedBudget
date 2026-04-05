import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ExpenseSplitMode } from '@prisma/client';
import { WeightEntryDto } from './weight-entry.dto';

export class UpdateExpenseDto {
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsUUID()
  payerId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsEnum(ExpenseSplitMode)
  splitMode!: ExpenseSplitMode;

  @ValidateIf((o: UpdateExpenseDto) => o.splitMode === ExpenseSplitMode.EQUAL)
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  participantIds?: string[];

  @ValidateIf((o: UpdateExpenseDto) => o.splitMode === ExpenseSplitMode.WEIGHT)
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => WeightEntryDto)
  weightedParticipants?: WeightEntryDto[];
}
