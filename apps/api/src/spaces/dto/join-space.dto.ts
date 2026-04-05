import { IsString, MinLength } from 'class-validator';

export class JoinSpaceDto {
  @IsString()
  @MinLength(8)
  inviteToken!: string;
}
