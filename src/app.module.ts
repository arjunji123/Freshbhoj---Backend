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
import { SubscriptionsModule } from './modules/customer/subscriptions/subscriptions.module';
import { CustomerWalletModule } from './modules/customer/wallet/wallet.module';
import { CustomerNotificationsModule } from './modules/customer/notifications/notifications.module';

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
import { KitchenAdminModule } from './modules/kitchen/admin/kitchen-admin.module';
import { KitchenProfileModule } from './modules/kitchen/portal/profile/kitchen-profile.module';
import { KitchenMenuModule } from './modules/kitchen/portal/menu/kitchen-menu.module';
import { KitchenOrdersModule } from './modules/kitchen/portal/orders/kitchen-orders.module';
import { KitchenStoriesModule } from './modules/kitchen/portal/stories/kitchen-stories.module';
import { KitchenDashboardModule } from './modules/kitchen/portal/dashboard/kitchen-dashboard.module';
import { KitchenUploadModule } from './modules/kitchen/portal/upload/kitchen-upload.module';
import { KitchenReelsModule } from './modules/kitchen/portal/reels/kitchen-reels.module';
import { FssaiAssistanceModule } from './modules/kitchen/portal/fssai-assistance/fssai-assistance.module';
import { BhojAiModule } from './modules/kitchen/portal/bhojai/bhojai.module';
import { NotificationsModule } from './modules/kitchen/portal/notifications/notifications.module';
import { PayoutsModule } from './modules/kitchen/portal/payouts/payouts.module';
import { OperatingHoursModule } from './modules/kitchen/portal/operating-hours/operating-hours.module';
import { KitchenAdsModule } from './modules/kitchen/portal/ads/kitchen-ads.module';
import { KitchenSubscriptionsModule } from './modules/kitchen/portal/subscriptions/kitchen-subscriptions.module';
import { SubscriptionPlansModule } from './modules/kitchen/portal/subscription-plans/subscription-plans.module';
import { OrderChatModule } from './modules/kitchen/portal/order-chat/order-chat.module';
import { WalletModule } from './modules/kitchen/portal/wallet/wallet.module';
import { AdsSuggestionsModule } from './modules/kitchen/portal/ads-suggestions/ads-suggestions.module';
import { PremiumModule } from './modules/kitchen/portal/premium/premium.module';

// ── Platform ────────────────────────────────────────────────────────────────
import { CouponsModule } from './modules/platform/coupons/coupons.module';
import { SupportModule } from './modules/platform/support/support.module';
import { ReferralModule } from './modules/platform/referral/referral.module';
import { WebWaitlistModule } from './modules/platform/web-waitlist/web-waitlist.module';
import { LegalModule } from './modules/platform/legal/legal.module';
import appConfig from './config/app.config';
import jwtConfig from './config/jwt.config';
import redisConfig from './config/redis.config';
import awsConfig from './config/aws.config';
import firebaseConfig from './config/firebase.config';
import twilioConfig from './config/twilio.config';
import geminiConfig from './config/gemini.config';

@Module({
  imports: [
    // ── Config ──────────────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [appConfig, jwtConfig, redisConfig, awsConfig, firebaseConfig, twilioConfig, geminiConfig],
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
    SubscriptionsModule,
    CustomerWalletModule,
    CustomerNotificationsModule,
    SupportModule,
    LegalModule,
    ReferralModule,
    // HomeModule aggregates the modules above, so it is registered last.
    HomeModule,

    // ── Kitchen partner portal ────────────────────────────────────────────────
    KitchenAuthModule,
    KitchenOnboardingModule,
    KitchenAdminModule,
    KitchenProfileModule,
    KitchenMenuModule,
    KitchenOrdersModule,
    KitchenStoriesModule,
    KitchenDashboardModule,
    KitchenUploadModule,
    KitchenReelsModule,
    FssaiAssistanceModule,
    BhojAiModule,
    NotificationsModule,
    PayoutsModule,
    OperatingHoursModule,
    KitchenAdsModule,
    KitchenSubscriptionsModule,
    SubscriptionPlansModule,
    OrderChatModule,
    WalletModule,
    AdsSuggestionsModule,
    PremiumModule,
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
