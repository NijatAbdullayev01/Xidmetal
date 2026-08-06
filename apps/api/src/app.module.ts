import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import Redis from 'ioredis';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ServicesModule } from './modules/services/services.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { AvailabilityModule } from './modules/availability/availability.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { MessagesModule } from './modules/messages/messages.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AdminModule } from './modules/admin/admin.module';
import { HealthModule } from './modules/health/health.module';
import { DatabaseModule } from './common/database/database.module';
import { MailModule } from './common/mail/mail.module';
import { StorageModule } from './common/storage/storage.module';
import { JwtAuthGuard } from './common/guards';
import { UploadsModule } from './modules/uploads/uploads.module';
import { RedisThrottlerStorage } from './common/throttler/redis-throttler.storage';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL')?.trim();
        const throttlers = [{ ttl: 60_000, limit: 100 }];

        if (!redisUrl) {
          return { throttlers };
        }

        try {
          const redis = new Redis(redisUrl, {
            maxRetriesPerRequest: 1,
            enableReadyCheck: true,
            lazyConnect: false,
          });
          redis.on('error', (err) => {
            Logger.warn(
              `Redis: ${err.message}`,
              'ThrottlerModule',
            );
          });
          return {
            throttlers,
            storage: new RedisThrottlerStorage(redis),
          };
        } catch (error) {
          Logger.warn(
            `Redis throttler qoşulmadı, in-memory: ${error instanceof Error ? error.message : String(error)}`,
            'ThrottlerModule',
          );
          return { throttlers };
        }
      },
    }),
    DatabaseModule,
    MailModule,
    StorageModule,
    HealthModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    ServicesModule,
    AvailabilityModule,
    BookingsModule,
    ReviewsModule,
    MessagesModule,
    NotificationsModule,
    AdminModule,
    UploadsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
