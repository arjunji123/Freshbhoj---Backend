/**
 * Generates the OpenAPI document without starting a server or touching the DB,
 * then reports any operation missing a documented response body.
 *
 * Run with: npm run openapi:check
 *
 * `preview: true` builds the module graph without instantiating providers, so
 * Prisma never tries to connect — which makes this safe to run in CI.
 */
import 'reflect-metadata';
import { writeFileSync } from 'fs';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import { ApiEnvelopeDto, ApiErrorDto, PageMetaDto } from '../src/common/dto/api-response.dto';

async function main() {
  const app = await NestFactory.create(AppModule, { preview: true, logger: false });

  const config = new DocumentBuilder()
    .setTitle('FreshBhoj API')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT-auth')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [ApiEnvelopeDto, ApiErrorDto, PageMetaDto],
  });

  const operations: string[] = [];
  const undocumented: string[] = [];

  for (const [path, item] of Object.entries(document.paths)) {
    for (const [method, operation] of Object.entries(item as Record<string, any>)) {
      if (!operation?.responses) continue;
      const label = `${method.toUpperCase()} ${path}`;
      operations.push(label);

      const hasBody = Object.values(operation.responses).some((r: any) => r?.content);
      if (!hasBody) undocumented.push(label);
    }
  }

  const schemas = Object.keys(document.components?.schemas ?? {});

  console.log(`paths      : ${Object.keys(document.paths).length}`);
  console.log(`operations : ${operations.length}`);
  console.log(`schemas    : ${schemas.length}`);
  console.log(`tags       : ${(document.tags ?? []).length}`);
  console.log('\noperations without a documented response body:');
  console.log(undocumented.length ? undocumented.map((o) => `  - ${o}`).join('\n') : '  (none)');

  // `--write <file>` dumps the spec, e.g. to feed a client-code generator.
  const writeIndex = process.argv.indexOf('--write');
  if (writeIndex !== -1) {
    const target = process.argv[writeIndex + 1] ?? 'openapi.json';
    writeFileSync(target, JSON.stringify(document, null, 2));
    console.log(`\nwrote ${target}`);
  }

  await app.close();

  if (process.argv.includes('--strict') && undocumented.length) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
