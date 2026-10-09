import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';
import { AppErrorFilter } from './filters/app-error.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);

  // Trust the first proxy (Vercel edge / reverse proxy)
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  app.setGlobalPrefix('api');

  // Basic security headers without importing helmet
  app.use((_req: unknown, res: { setHeader: (k: string, v: string) => void }, next: () => void) => {
    (res as any).setHeader('X-Content-Type-Options', 'nosniff');
    (res as any).setHeader('X-Frame-Options', 'DENY');
    (res as any).setHeader('X-XSS-Protection', '0');
    (res as any).setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  const corsOrigins = (config.get<string>('CORS_ORIGINS') ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({ origin: corsOrigins, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new AppErrorFilter());

  const port = Number(config.get('PORT') ?? 4000);
  await app.listen(port);
}

void bootstrap();
