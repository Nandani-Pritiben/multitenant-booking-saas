import { ConflictException, ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';

export class SlotUnavailableException extends ConflictException {
  constructor() {
    super('This time slot is no longer available.');
  }
}

@Catch(SlotUnavailableException)
export class SlotUnavailableFilter implements ExceptionFilter {
  catch(_exception: SlotUnavailableException, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    response.status(409).json({
      success: false,
      error: {
        code: 'SLOT_UNAVAILABLE',
        message: 'This time slot is no longer available.',
        requestId: request.headers['x-request-id'] ?? null,
      },
    });
  }
}