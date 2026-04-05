import { IsDateString, IsOptional } from 'class-validator';

export class ListExpensesQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
