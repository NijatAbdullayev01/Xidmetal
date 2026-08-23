import './instrument';
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
import { assertProductionRuntimeConfig } from './common/config/production-guards';
import { createAppLogger } from './common/logging/app.logger';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';
import { createPrivateUploadsGuard } from './common/middleware/private-uploads.middleware';
import { RedisIoAdapter } from './modules/realtime/redis-io.adapter';

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
  const mediaSigningSecret =
    configService.get<string>('MEDIA_SIGNING_SECRET')?.trim() ||
    (nodeEnv === 'production' ? '' : jwtSecret);
  assertJwtSecretForRuntime(jwtSecret, nodeEnv);
  assertProductionRuntimeConfig({
    nodeEnv,
    jwtSecret,
    mediaSigningSecret,
    smtpHost: configService.get<string>('SMTP_HOST'),
    turnstileSecret: configService.get<string>('TURNSTILE_SECRET_KEY'),
    redisUrl: configService.get<string>('REDIS_URL'),
    metricsToken: configService.get<string>('METRICS_TOKEN'),
    geocoderProvider: configService.get<string>('GEOCODER_PROVIDER'),
    paymentsEnabled: configService.get<string>('PAYMENTS_ENABLED'),
    paymentProvider: configService.get<string>('PAYMENT_PROVIDER'),
  });

  if (nodeEnv === 'production' && !configService.get<string>('SENTRY_DSN')?.trim()) {
    logger.warn('SENTRY_DSN təyin olunmayıb — xəta izləmə deaktivdir', 'Bootstrap');
  }

  const trustProxy = configService.get<string>('TRUST_PROXY', '');
  if (trustProxy === 'true' || trustProxy === '1') {
    // Rate-limit / real IP üçün reverse proxy arxasında
    app.set('trust proxy', 1);
  }

  const port = configService.get<number>('API_PORT', 4100);
  const corsOriginRaw = configService.get<string>(
    'CORS_ORIGIN',
    'http://localhost:3120,http://localhost:3121',
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
  // Private media (bookings/services/avatars) HMAC imza tələb edir
  app.use('/uploads', createPrivateUploadsGuard(mediaSigningSecret));
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
      .addCookieAuth('xidmetal_access_marketplace')
      .addCookieAuth('xidmetal_access_admin')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
  }

  const redisIoAdapter = new RedisIoAdapter(app, configService);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  const listenHost =
    configService.get<string>('API_LISTEN_HOST')?.trim() ||
    (nodeEnv === 'production' ? '0.0.0.0' : '127.0.0.1');
  await app.listen(port, listenHost);
  logger.log(`API dinləyir: http://${listenHost}:${port}${API.prefix}`, 'Bootstrap');
  logger.log(`Socket.IO: http://localhost:${port}`, 'Bootstrap');
  if (swaggerEnabled) {
    logger.log(`Swagger: http://localhost:${port}/docs`, 'Bootstrap');
  }
}

bootstrap();
