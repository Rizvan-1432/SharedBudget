import { IsNumber, IsUUID, Min } from 'class-validator';

export class WeightEntryDto {
  @IsUUID()
  userId!: string;

  @IsNumber()
  @Min(0.0001)
  weight!: number;
}
