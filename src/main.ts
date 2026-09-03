import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as compression from 'compression';
import { AppModule } from './app.module';
import { setupSwagger } from './swagger';
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
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://cdnjs.cloudflare.com'],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com', 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'https://cdnjs.cloudflare.com'],
        },
      },
    })
  );
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
  // Served at /swagger and /{apiPrefix}/docs.
  setupSwagger(app, apiPrefix);

  await app.listen(port);

  console.log(`
  ╔══════════════════════════════════════════════════╗
  ║           🍱 FreshBhoj Backend Server            ║
  ║──────────────────────────────────────────────────║
  ║  API     : http://localhost:${port}/${apiPrefix}
  ║  Swagger : http://localhost:${port}/swagger
  ║  Env     : ${configService.get('NODE_ENV', 'development').padEnd(38)}║
  ╚══════════════════════════════════════════════════╝
  `);
}

bootstrap();
