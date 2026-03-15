import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as compression from 'compression';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const apiPrefix = configService.get<string>('API_PREFIX', 'api/v1');
  const allowedOrigins = configService
    .get<string>('ALLOWED_ORIGINS', '')
    .split(',')
    .filter(Boolean);

  // ── Security ──────────────────────────────────────────────────────────────
  app.use(helmet());
  const compMethod = (compression as any).default || compression;
  app.use(compMethod());

  // ── CORS ──────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: allowedOrigins.length ? allowedOrigins : true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-Id'],
    credentials: true,
  });

  // ── Global Prefix ─────────────────────────────────────────────────────────
  app.setGlobalPrefix(apiPrefix);

  // ── Global Pipes ──────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ── Global Filters ────────────────────────────────────────────────────────
  app.useGlobalFilters(new HttpExceptionFilter());

  // ── Global Interceptors ───────────────────────────────────────────────────
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  // ── Swagger / OpenAPI ─────────────────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('FreshBhoj API')
    .setDescription('The FreshBhoj API documentation for Onboarding, Auth, and more.')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth', // This name must match the one used in @ApiBearerAuth()
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  // Serve the swagger UI at /api/v1/docs
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(port);

  console.log(`
  ╔══════════════════════════════════════════════════╗
  ║           🍱 FreshBhoj Backend Server            ║
  ║──────────────────────────────────────────────────║
  ║  URL     : http://localhost:${port}/${apiPrefix}      ║
  ║  Env     : ${configService.get('NODE_ENV', 'development').padEnd(38)}║
  ╚══════════════════════════════════════════════════╝
  `);
}

bootstrap();
