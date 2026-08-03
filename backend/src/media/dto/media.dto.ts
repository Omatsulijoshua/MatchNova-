import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class UploadUrlRequestDto {
  @IsNotEmpty()
  @IsString()
  filename!: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^image\/(jpeg|png|webp)$/, {
    message: 'fileType must be image/jpeg, image/png, or image/webp',
  })
  fileType!: string;
}
