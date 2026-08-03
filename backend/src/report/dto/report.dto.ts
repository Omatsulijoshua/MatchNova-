import {
  IsNotEmpty,
  IsUUID,
  IsString,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { ReportStatus, UserStatus } from '@prisma/client';

export class CreateReportDto {
  @IsNotEmpty()
  @IsUUID()
  reportedId!: string;

  @IsNotEmpty()
  @IsString()
  reason!: string;

  @IsOptional()
  @IsString()
  details?: string;
}

export class ResolveReportDto {
  @IsNotEmpty()
  @IsEnum(ReportStatus)
  status!: ReportStatus;
}

export class ModerateUserDto {
  @IsNotEmpty()
  @IsEnum(UserStatus)
  status!: UserStatus;
}
