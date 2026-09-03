import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * The envelope every successful response is wrapped in by `TransformInterceptor`.
 * Declared as a real class so Swagger can compose it with each endpoint's
 * payload via `$ref`, instead of every operation redeclaring the wrapper.
 */
export class ApiEnvelopeDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Success' })
  message: string;

  @ApiProperty({ example: '2026-09-03T09:24:11.482Z' })
  timestamp: string;
}

/** Pagination footer returned alongside every paginated list. */
export class PageMetaDto {
  @ApiProperty({ example: 1, description: '1-indexed page number' })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 137, description: 'Total rows matching the filter' })
  total: number;

  @ApiProperty({ example: 7 })
  totalPages: number;

  @ApiProperty({ example: true, description: 'Whether another page exists' })
  hasNextPage: boolean;
}

/** The shape `HttpExceptionFilter` returns for every failure. */
export class ApiErrorDto {
  @ApiProperty({ example: false })
  success: boolean;

  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({ example: 'Minimum order value is ₹99' })
  message: string;

  @ApiPropertyOptional({
    type: [String],
    nullable: true,
    example: ['pincode must be 6 digits'],
    description: 'Populated when class-validator rejects the body',
  })
  errors: string[] | null;

  @ApiPropertyOptional({
    example: 'CART_KITCHEN_CONFLICT',
    description:
      'Machine-readable code, present on errors the client must branch on. Such errors may carry extra fields too — CART_KITCHEN_CONFLICT also returns `existingKitchen`.',
  })
  code?: string;

  @ApiProperty({ example: '/api/v1/orders' })
  path: string;

  @ApiProperty({ example: '2026-09-03T09:24:11.482Z' })
  timestamp: string;
}
