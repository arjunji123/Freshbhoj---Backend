import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as compression from 'compression';
import { AppModule } from '../src/app.module';
import { setupSwagger } from '../src/swagger';

let appInstance: any;

export default async function bootstrap(req: any, res: any) {
  if (!appInstance) {
    const app = await NestFactory.create(AppModule);

    const configService = app.get(ConfigService);
    const apiPrefix = configService.get<string>('API_PREFIX', 'api/v1');

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

    app.enableCors({
      origin: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      credentials: true,
    });

    app.setGlobalPrefix(apiPrefix);

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    // Same Swagger setup as the standalone server: /swagger and /{apiPrefix}/docs.
    setupSwagger(app, apiPrefix);

    await app.init();
    appInstance = app.getHttpAdapter().getInstance();
  }
  
  return appInstance(req, res);
}
