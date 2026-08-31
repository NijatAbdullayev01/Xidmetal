import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import Redis from 'ioredis';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';
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
import { ContactModule } from './modules/contact/contact.module';
import { ReportsModule } from './modules/reports/reports.module';
import { GeoModule } from './modules/geo/geo.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import { DispatchModule } from './modules/dispatch/dispatch.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { DevicesModule } from './modules/devices/devices.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { DatabaseModule } from './common/database/database.module';
import { RedisModule } from './common/redis/redis.module';
import { MailModule } from './common/mail/mail.module';
import { StorageModule } from './common/storage/storage.module';
import { NotificationChannelsModule } from './common/notifications/notification-channels.module';
import { MetricsModule } from './common/metrics/metrics.module';
import { CaptchaModule } from './common/captcha/captcha.module';
import { JwtAuthGuard } from './common/guards';
import { UploadsModule } from './modules/uploads/uploads.module';
import { ServiceTeamsModule } from './modules/service-teams/service-teams.module';
import { RedisThrottlerStorage } from './common/throttler/redis-throttler.storage';

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'production'
          ? ['.env']
          : ['../../.env.development', '../../.env', '.env'],
    }),
    RedisModule,
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL')?.trim();
        // 5k concurrent dashboard: WS + seyrək poll; NAT arxasında TRUST_PROXY məcburi
        const limitRaw = config.get<string>('THROTTLE_LIMIT')?.trim();
        const limit = Math.max(50, Number(limitRaw) || 300);
        const throttlers = [{ ttl: 60_000, limit }];

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
    CaptchaModule,
    StorageModule,
    NotificationChannelsModule,
    MetricsModule,
    HealthModule,
    ContactModule,
    ReportsModule,
    GeoModule,
    RealtimeModule,
    TrackingModule,
    DispatchModule,
    PaymentsModule,
    DevicesModule,
    AnalyticsModule,
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
    ServiceTeamsModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: SentryGlobalFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
