import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ServicesModule } from './modules/services/services.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { AvailabilityModule } from './modules/availability/availability.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { MessagesModule } from './modules/messages/messages.module';
import { HealthModule } from './modules/health/health.module';
import { DatabaseModule } from './common/database/database.module';
import { MailModule } from './common/mail/mail.module';
import { JwtAuthGuard } from './common/guards';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    DatabaseModule,
    MailModule,
    HealthModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    ServicesModule,
    AvailabilityModule,
    BookingsModule,
    ReviewsModule,
    MessagesModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
