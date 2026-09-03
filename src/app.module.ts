import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { UploadModule } from './upload/upload.module';

// ── Identity ────────────────────────────────────────────────────────────────
// Two separate identities, two separate JWT audiences — a customer token can
// never open a partner endpoint, and vice versa. See KitchenScope's doc
// comment for how the two guards avoid colliding on `/partner/**`.
import { AuthModule } from './modules/identity/customer-auth/auth.module';
import { JwtAuthGuard } from './modules/identity/customer-auth/guards/jwt-auth.guard';
import { KitchenAuthModule } from './modules/identity/kitchen-auth/kitchen-auth.module';

// ── Customer (everything scoped to the signed-in user's id) ─────────────────
import { UsersModule } from './modules/customer/profile/users.module';
import { AddressesModule } from './modules/customer/addresses/addresses.module';
import { CartModule } from './modules/customer/cart/cart.module';
import { OrdersModule } from './modules/customer/orders/orders.module';
import { WishlistModule } from './modules/customer/wishlist/wishlist.module';
import { PaymentMethodsModule } from './modules/customer/payment-methods/payment-methods.module';

// ── Discovery (browsable catalogue) ─────────────────────────────────────────
import { CatalogModule } from './modules/discovery/catalog/catalog.module';
import { KitchensModule } from './modules/discovery/kitchens/kitchens.module';
import { MealsModule } from './modules/discovery/meals/meals.module';
import { ReelsModule } from './modules/discovery/reels/reels.module';
import { ReviewsModule } from './modules/discovery/reviews/reviews.module';
import { StoriesModule } from './modules/discovery/stories/stories.module';
import { HomeModule } from './modules/discovery/home/home.module';

// ── Kitchen (partner onboarding + management, its own JWT audience) ─────────
import { KitchenOnboardingModule } from './modules/kitchen/onboarding/onboarding.module';
import { KitchenProfileModule } from './modules/kitchen/portal/profile/kitchen-profile.module';
import { KitchenMenuModule } from './modules/kitchen/portal/menu/kitchen-menu.module';
import { KitchenOrdersModule } from './modules/kitchen/portal/orders/kitchen-orders.module';
import { KitchenStoriesModule } from './modules/kitchen/portal/stories/kitchen-stories.module';
import { KitchenDashboardModule } from './modules/kitchen/portal/dashboard/kitchen-dashboard.module';

// ── Platform ────────────────────────────────────────────────────────────────
import { CouponsModule } from './modules/platform/coupons/coupons.module';
import { SupportModule } from './modules/platform/support/support.module';
import { WebWaitlistModule } from './modules/platform/web-waitlist/web-waitlist.module';
import appConfig from './config/app.config';
import jwtConfig from './config/jwt.config';
import redisConfig from './config/redis.config';
import awsConfig from './config/aws.config';
import twilioConfig from './config/twilio.config';

@Module({
  imports: [
    // ── Config ──────────────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [appConfig, jwtConfig, redisConfig, awsConfig, twilioConfig],
    }),

    // ── Infrastructure ───────────────────────────────────────────────────────
    PrismaModule,
    RedisModule,

    // ── Feature Modules ───────────────────────────────────────────────────────
    AuthModule,
    UsersModule,
    UploadModule,
    WebWaitlistModule,

    // ── Commerce / Discovery ─────────────────────────────────────────────────
    CatalogModule,
    KitchensModule,
    MealsModule,
    AddressesModule,
    CouponsModule,
    CartModule,
    OrdersModule,
    ReviewsModule,
    ReelsModule,
    StoriesModule,
    WishlistModule,
    PaymentMethodsModule,
    SupportModule,
    // HomeModule aggregates the modules above, so it is registered last.
    HomeModule,

    // ── Kitchen partner portal ────────────────────────────────────────────────
    KitchenAuthModule,
    KitchenOnboardingModule,
    KitchenProfileModule,
    KitchenMenuModule,
    KitchenOrdersModule,
    KitchenStoriesModule,
    KitchenDashboardModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // ── Global JWT Guard: protects all routes by default ─────────────────────
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
