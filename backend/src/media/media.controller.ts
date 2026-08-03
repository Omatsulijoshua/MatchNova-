import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MediaService } from './media.service';
import { UploadUrlRequestDto } from './dto/media.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload-url')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'))
  async getUploadUrl(
    @Request() req: { user: { id: string } },
    @Body() dto: UploadUrlRequestDto,
  ) {
    return this.mediaService.getPresignedUploadUrl(
      req.user.id,
      dto.filename,
      dto.fileType,
    );
  }
}
