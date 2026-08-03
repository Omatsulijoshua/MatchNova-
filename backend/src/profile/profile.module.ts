import { Module } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';
import { ConfigModule } from '@nestjs/config';
import { QdrantModule } from '../qdrant/qdrant.module';

@Module({
  imports: [ConfigModule, QdrantModule],
  controllers: [ProfileController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}
