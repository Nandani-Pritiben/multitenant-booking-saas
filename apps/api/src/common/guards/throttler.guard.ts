import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class ThrottlerGuard extends ThrottlerGuard {
  constructor() {
    super();
  }

  protected getRequestIP(request: Request) {
    return request.ip ?? request.connection.remoteAddress;
  }
}