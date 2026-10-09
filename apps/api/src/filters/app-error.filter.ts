import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

export interface AppError {
  code: string;
  message: string;
  requestId?: string;
}

@Catch()
export class AppErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = (request.headers['x-request-id'] as string) || undefined;
    const isHealthCheck = request.path === '/health' || request.path === '/api/health';

    let code = 'INTERNAL_ERROR';
    let message = 'Internal server error';
    let status = HttpStatus.INTERNAL_SERVER_ERROR;

    if (exception instanceof HttpException) {
      const exceptionStatus = exception.getStatus();
      const exceptionResponse = exception.getResponse() as {
        message?: string | string[];
        error?: string;
      };
      code = exceptionResponse.error || code;
      const msg = exceptionResponse.message;
      message = Array.isArray(msg) ? msg.join(', ') : msg || 'Request failed';
      status = exceptionStatus;
    } else {
      const err = exception as Error;
      message = err.message || 'Internal server error';
    }

    // Health check should return 503 on failure
    if (isHealthCheck) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
    }

    const error: AppError = {
      code,
      message,
      requestId,
    };

    response.status(status).json({ error });
  }
}
