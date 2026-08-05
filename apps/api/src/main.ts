import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { API } from '@xidmetal/shared';

/** Base64 şəkillər üçün (xidmət/profil; bir neçə şəkil + JSON overhead) */
const JSON_BODY_LIMIT = '5mb';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useBodyParser('json', { limit: JSON_BODY_LIMIT });
  app.useBodyParser('urlencoded', { limit: JSON_BODY_LIMIT, extended: true });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('API_PORT', 4000);
  const corsOriginRaw = configService.get<string>(
    'CORS_ORIGIN',
    'http://localhost:3020,http://localhost:3021',
  );
  // Marketplace + admin URL-ləri CORS_ORIGIN unudulsa belə whitelist-ə düşsün
  const corsOrigins = [
    ...corsOriginRaw.split(','),
    configService.get<string>('NEXT_PUBLIC_APP_URL'),
    configService.get<string>('NEXT_PUBLIC_ADMIN_URL'),
  ]
    .map((origin) => origin?.trim())
    .filter((origin): origin is string => Boolean(origin))
    .filter((origin, index, all) => all.indexOf(origin) === index);

  app.use(helmet());
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

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Xidmətal API')
    .setDescription('Xidmət platforması REST API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.listen(port);
  console.log(`🚀 API: http://localhost:${port}${API.prefix}`);
  console.log(`📚 Swagger: http://localhost:${port}/docs`);
}

bootstrap();
