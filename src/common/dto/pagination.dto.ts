import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Shared page/limit query params.
 * The global ValidationPipe runs with `forbidNonWhitelisted`, so every query
 * param a client may send has to be declared on a DTO that extends this.
 */
export class PaginationQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
}

export interface Paginated<T> {
  items: T[];
  meta: PageMeta;
}

export function buildPageMeta(page: number, limit: number, total: number): PageMeta {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
  };
}

export function paginate<T>(items: T[], page: number, limit: number, total: number): Paginated<T> {
  return { items, meta: buildPageMeta(page, limit, total) };
}

/** Converts a 1-indexed page into a Prisma `skip`. */
export function toSkip(page = 1, limit = 20): number {
  return (Math.max(page, 1) - 1) * limit;
}
