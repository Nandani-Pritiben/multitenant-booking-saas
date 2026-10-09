import { Injectable, NestMiddleware } from '@nestjs/common';
import * as helmet from 'helmet';

@Injectable()
export class HelmetMiddleware implements NestMiddleware {
  use(req: unknown, res: unknown, next: () => void) {
    helmet.default()(req as any, res as any, next);
  }
}
