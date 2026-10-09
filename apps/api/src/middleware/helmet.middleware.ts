import { Injectable, NestMiddleware } from '@nestjs/common';
import helmet from 'helmet';

@Injectable()
export class HelmetMiddleware implements NestMiddleware {
  use(req: unknown, res: unknown, next: () => void) {
    helmet()(req as any, res as any, next);
  }
}
