import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { join } from 'path';
import { AppModule } from './app.module';
import { API } from '@xidmetal/shared';
import { assertJwtSecretForRuntime } from './common/auth/jwt-secret';
import { createAppLogger } from './common/logging/app.logger';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';
import { createPrivateUploadsGuard } from './common/middleware/private-uploads.middleware';

/** Upload URL-ləri JSON-da qısa olduğu üçün böyük body lazım deyil */
const JSON_BODY_LIMIT = '1mb';

async function bootstrap() {
  const logger = createAppLogger();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger,
  });
  app.use(requestIdMiddleware);
  app.use(cookieParser());
  app.useBodyParser('json', { limit: JSON_BODY_LIMIT });
  app.useBodyParser('urlencoded', { limit: JSON_BODY_LIMIT, extended: true });

  const configService = app.get(ConfigService);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const jwtSecret = configService.get<string>('JWT_SECRET', '');
  assertJwtSecretForRuntime(jwtSecret, nodeEnv);

  const trustProxy = configService.get<string>('TRUST_PROXY', '');
  if (trustProxy === 'true' || trustProxy === '1') {
    // Rate-limit / real IP üçün reverse proxy arxasında
    app.set('trust proxy', 1);
  }

  const port = configService.get<number>('API_PORT', 4000);
  const corsOriginRaw = configService.get<string>(
    'CORS_ORIGIN',
    'http://localhost:3020,http://localhost:3021',
  );
  const corsOrigins = [
    ...corsOriginRaw.split(','),
    configService.get<string>('NEXT_PUBLIC_APP_URL'),
    configService.get<string>('NEXT_PUBLIC_ADMIN_URL'),
  ]
    .map((origin) => origin?.trim())
    .filter((origin): origin is string => Boolean(origin))
    .filter((origin, index, all) => all.indexOf(origin) === index);

  const localUploadDir = configService.get<string>('STORAGE_LOCAL_DIR', './uploads');
  // Booking şəkilləri HMAC imza tələb edir; services/avatars açıqdır
  app.use('/uploads', createPrivateUploadsGuard(jwtSecret));
  app.useStaticAssets(join(process.cwd(), localUploadDir), {
    prefix: '/uploads/',
  });

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.enableCors({
    origin: corsOrigins.length <= 1 ? corsOrigins[0] : corsOrigins,
    credentials: true,
  });
  app.setGlobalPrefix(API.prefix);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Default-deny: yalnız explicit true və ya lokal development
  const swaggerFlag = configService.get<string>('SWAGGER_ENABLED');
  const swaggerEnabled =
    swaggerFlag === 'true' ||
    (nodeEnv === 'development' && swaggerFlag !== 'false');

  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Xidmətal API')
      .setDescription('Xidmət platforması REST API')
      .setVersion('1.0')
      .addBearerAuth()
      .addCookieAuth('xidmetal_access')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
  }

  await app.listen(port);
  logger.log(`API dinləyir: http://localhost:${port}${API.prefix}`, 'Bootstrap');
  if (swaggerEnabled) {
    logger.log(`Swagger: http://localhost:${port}/docs`, 'Bootstrap');
  }
}

bootstrap();
