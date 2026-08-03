import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SwipeService } from './swipe.service';
import { CreateSwipeDto } from './dto/swipe.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('swipes')
@UseGuards(AuthGuard('jwt'))
export class SwipeController {
  constructor(private readonly swipeService: SwipeService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async swipe(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateSwipeDto,
  ) {
    return this.swipeService.recordSwipe(req.user.id, dto);
  }

  @Get('recommendations')
  async getRecommendations(@Request() req: { user: { id: string } }) {
    return this.swipeService.getRecommendationDeck(req.user.id);
  }

  @Get('matches')
  async getMatches(@Request() req: { user: { id: string } }) {
    return this.swipeService.getMatches(req.user.id);
  }
}
