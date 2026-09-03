import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ApiErrorDto, ApiEnvelopeDto, PageMetaDto } from './common/dto/api-response.dto';

/** Swagger UI assets, pinned. The CSP in `main.ts` allow-lists this origin. */
const SWAGGER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.17.14';

const DESCRIPTION = `
The FreshBhoj customer API — discovery, ordering, tracking and the shoppable Food Feed.

## Response shape
Every **successful** response is wrapped by \`TransformInterceptor\`:

\`\`\`json
{ "success": true, "statusCode": 200, "message": "Meals fetched", "data": { }, "timestamp": "2026-09-03T09:24:11.482Z" }
\`\`\`

Every **failure** comes back through \`HttpExceptionFilter\` with \`success: false\`, a
human-readable \`message\`, and an \`errors\` array when validation rejected the body.

Paginated endpoints put \`{ items, meta }\` inside \`data\`.

## Authentication
1. \`POST /auth/otp/send\` — sends a 6-digit OTP (rate limited to 5/hour per number).
2. \`POST /auth/otp/verify\` — returns the user plus an access/refresh token pair.
3. Click **Authorize** above and paste the \`accessToken\` to try protected endpoints here.
4. Access tokens last 15 minutes; rotate with \`POST /auth/token/refresh\`.

With \`OTP_DEV_MODE=true\` the OTP is always **123456**, and it is echoed back as \`devOtp\`.

## Public vs personalised
Endpoints tagged _public_ work signed-out, but personalise when a bearer token is
present — favourites, kitchen follows and reel likes are filled in for that user.
`.trim();

/**
 * Builds and mounts the OpenAPI document.
 *
 * Served at `/swagger` (the memorable one) and kept at `/{apiPrefix}/docs`
 * so existing bookmarks and the Vercel deployment keep working.
 * `setGlobalPrefix` does not apply to these paths — they are raw Express
 * routes — so `/swagger` really does sit at the root.
 */
export function setupSwagger(app: INestApplication, apiPrefix = 'api/v1'): void {
  const config = new DocumentBuilder()
    .setTitle('FreshBhoj API')
    .setDescription(DESCRIPTION)
    .setVersion('1.0')
    .setContact('FreshBhoj Engineering', 'https://freshbhoj.com', 'engineering@freshbhoj.com')
    // No `addServer` here: SwaggerModule already bakes the global prefix into
    // every path, so declaring a `/api/v1` server would make "Try it out" call
    // /api/v1/api/v1/…. Leaving it unset means requests go to the current origin.
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Paste the accessToken returned by POST /auth/otp/verify',
        in: 'header',
      },
      'JWT-auth', // must match the name used in @ApiBearerAuth()
    )
    // Tag order here is the order the sections appear in the UI, so it follows
    // the actual customer journey rather than module registration order.
    .addTag('Auth', 'OTP login, token refresh, logout')
    .addTag('Users', 'Profile, onboarding steps, push token')
    .addTag('Catalog', 'Categories, goal filters, serviceable areas')
    .addTag('Home', 'Aggregated discovery feed')
    .addTag('Meals', 'Search, filter, nutrition detail, favourites')
    .addTag('Kitchens', 'Curated kitchen profiles, gallery, menu, follow')
    .addTag('Reels', 'Shoppable Food Feed')
    .addTag('Cart', 'Cart lines, pricing, coupons')
    .addTag('Coupons', 'Live offers')
    .addTag('Addresses', 'Saved delivery addresses')
    .addTag('Orders', 'Placement, payment, tracking, reorder')
    .addTag('Reviews', 'Ratings and feedback')
    .addTag('Support', 'Help channels, FAQs, notification settings')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    // These are only referenced through $ref inside composed schemas, so Nest
    // would otherwise prune them from components.
    extraModels: [ApiEnvelopeDto, ApiErrorDto, PageMetaDto],
  });

  const options = {
    customSiteTitle: 'FreshBhoj API',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      tryItOutEnabled: true,
      docExpansion: 'none',
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      defaultModelsExpandDepth: 2,
      defaultModelExpandDepth: 3,
    },
    customCssUrl: `${SWAGGER_CDN}/swagger-ui.min.css`,
    customJs: [
      `${SWAGGER_CDN}/swagger-ui-bundle.js`,
      `${SWAGGER_CDN}/swagger-ui-standalone-preset.js`,
    ],
  };

  SwaggerModule.setup('swagger', app, document, options);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document, options);
}
