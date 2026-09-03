import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: any = null;
    /**
     * Extra fields an exception chose to carry, e.g. the cart's
     * `{ code: 'CART_KITCHEN_CONFLICT', existingKitchen }`. Without passing
     * these through, the client can only see the status code and has no way to
     * tell one 409 from another.
     */
    let details: Record<string, unknown> = {};

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const { message: rawMessage, statusCode, error, ...rest } = exceptionResponse as any;
        message = rawMessage || message;
        if (Array.isArray(rawMessage)) {
          errors = rawMessage;
          message = 'Validation failed';
        }
        details = rest;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // Log server errors
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} → ${status}: ${message}`,
        exception instanceof Error ? exception.stack : '',
      );
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      errors,
      ...details,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
