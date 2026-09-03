import { applyDecorators, HttpStatus, Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { ApiEnvelopeDto, ApiErrorDto, PageMetaDto } from '../dto/api-response.dto';

interface EnvelopeOptions {
  /** Overrides the default 200. */
  status?: number;
  description?: string;
}

/**
 * Documents a response as `{ success, statusCode, message, data, timestamp }`
 * with `data` set to the given model.
 *
 * Without this, Swagger shows the envelope but leaves `data` as a bare object —
 * which is the single biggest thing that makes generated API docs useless to a
 * client developer.
 */
export const ApiEnvelope = <TModel extends Type<unknown>>(
  model: TModel,
  { status = HttpStatus.OK, description }: EnvelopeOptions = {},
) =>
  applyDecorators(
    ApiExtraModels(ApiEnvelopeDto, model),
    ApiResponse({
      status,
      description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiEnvelopeDto) },
          { properties: { data: { $ref: getSchemaPath(model) } } },
        ],
      },
    }),
  );

/** Same as `ApiEnvelope`, but `data` is an array of the model. */
export const ApiEnvelopeArray = <TModel extends Type<unknown>>(
  model: TModel,
  { status = HttpStatus.OK, description }: EnvelopeOptions = {},
) =>
  applyDecorators(
    ApiExtraModels(ApiEnvelopeDto, model),
    ApiResponse({
      status,
      description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiEnvelopeDto) },
          {
            properties: {
              data: { type: 'array', items: { $ref: getSchemaPath(model) } },
            },
          },
        ],
      },
    }),
  );

/** `data` is `{ items: Model[], meta: PageMeta }`. */
export const ApiEnvelopePaginated = <TModel extends Type<unknown>>(
  model: TModel,
  { status = HttpStatus.OK, description }: EnvelopeOptions = {},
) =>
  applyDecorators(
    ApiExtraModels(ApiEnvelopeDto, PageMetaDto, model),
    ApiResponse({
      status,
      description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiEnvelopeDto) },
          {
            properties: {
              data: {
                type: 'object',
                properties: {
                  items: { type: 'array', items: { $ref: getSchemaPath(model) } },
                  meta: { $ref: getSchemaPath(PageMetaDto) },
                },
              },
            },
          },
        ],
      },
    }),
  );

/**
 * For endpoints that only report success — `data` is always `null`.
 * Declared as a raw schema because `null` is not a reflectable type, and a DTO
 * with a `null`-typed property reads to Swagger as a circular reference.
 */
export const ApiEnvelopeNull = ({
  status = HttpStatus.OK,
  description,
}: EnvelopeOptions = {}) =>
  applyDecorators(
    ApiExtraModels(ApiEnvelopeDto),
    ApiResponse({
      status,
      description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiEnvelopeDto) },
          { properties: { data: { type: 'object', nullable: true, example: null } } },
        ],
      },
    }),
  );

/** Documents one of the standard failure responses. */
export const ApiEnvelopeError = (status: number, description: string) =>
  applyDecorators(
    ApiExtraModels(ApiErrorDto),
    ApiResponse({ status, description, type: ApiErrorDto }),
  );

/** The three failures nearly every authenticated endpoint can return. */
export const ApiAuthErrors = () =>
  applyDecorators(
    ApiEnvelopeError(HttpStatus.UNAUTHORIZED, 'Missing, expired or invalid access token'),
  );
