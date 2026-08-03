import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ArrayMinSize,
  IsNumber,
  Min,
  Max,
  IsISO8601,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProfileDto {
  @IsNotEmpty()
  @IsString()
  firstName!: string;

  @IsNotEmpty()
  @IsString()
  lastName!: string;

  @IsNotEmpty()
  @IsISO8601()
  birthDate!: string;

  @IsNotEmpty()
  @IsString()
  gender!: string;

  @IsNotEmpty()
  @IsString()
  sexualOrientation!: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(3, { message: 'Profiles must have at least 3 photos' })
  photos!: string[];

  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1, { message: 'Profiles must have at least 1 interest tag' })
  interests!: string[];

  @IsNotEmpty()
  @IsNumber()
  @Min(-90)
  @Max(90)
  locationLat!: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(-180)
  @Max(180)
  locationLng!: number;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsISO8601()
  birthDate?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  sexualOrientation?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(3, { message: 'Profiles must have at least 3 photos' })
  photos?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1, { message: 'Profiles must have at least 1 interest tag' })
  interests?: string[];

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  locationLat?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  locationLng?: number;
}

export class ProfileSearchQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(500)
  radius: number = 25; // default 25 miles

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(18)
  @Max(99)
  ageMin: number = 18;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(18)
  @Max(99)
  ageMax: number = 99;

  @IsOptional()
  @IsString()
  gender?: string;
}
