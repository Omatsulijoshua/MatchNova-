import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  // Custom body parser to capture rawBody for webhook signatures
  const expressApp = app.getHttpAdapter().getInstance() as {
    use: (middleware: any) => void;
  };

  expressApp.use(
    express.json({
      verify: (req, res, buf: Buffer) => {
        if (req.url && req.url.includes('/webhook')) {
          const reqWithRaw = req as unknown as Record<string, unknown> & {
            rawBody?: Buffer;
          };
          reqWithRaw.rawBody = buf;
        }
      },
    }),
  );
  expressApp.use(express.urlencoded({ extended: true }));

  // Set global API prefix
  app.setGlobalPrefix('api/v1');

  // Enable global validations
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3000;

  await app.listen(port);
  console.log(`MatchNova backend API gateway running on port ${port}`);
}
bootstrap().catch((err) => console.error(err));
