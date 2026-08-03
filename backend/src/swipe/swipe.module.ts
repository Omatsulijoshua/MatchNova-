import { Module } from '@nestjs/common';
import { SwipeService } from './swipe.service';
import { SwipeController } from './swipe.controller';
import { ConfigModule } from '@nestjs/config';
import { QdrantModule } from '../qdrant/qdrant.module';
import { ProfileModule } from '../profile/profile.module';

@Module({
  imports: [ConfigModule, QdrantModule, ProfileModule],
  controllers: [SwipeController],
  providers: [SwipeService],
  exports: [SwipeService],
})
export class SwipeModule {}
