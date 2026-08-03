import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ProfileModule } from './profile/profile.module';
import { MediaModule } from './media/media.module';
import { QdrantModule } from './qdrant/qdrant.module';
import { SwipeModule } from './swipe/swipe.module';
import { ChatModule } from './chat/chat.module';
import { BullModule } from '@nestjs/bullmq';
import { ReportModule } from './report/report.module';
import { PaymentModule } from './payment/payment.module';
import configuration, { configValidationSchema } from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: configValidationSchema,
    }),
    PrismaModule,
    AuthModule,
    ProfileModule,
    MediaModule,
    QdrantModule,
    SwipeModule,
    ChatModule,
    PaymentModule,
    ReportModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST') || 'localhost',
          port: configService.get<number>('REDIS_PORT') || 6379,
        },
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
