import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import express from 'express';
import { AppModule } from '../app.module.js';
import { AppErrorFilter } from '../filters/app-error.filter.js';

/**
 * Used by api/index.ts (Vercel serverless handler).
 * src/main.ts uses its own bootstrap() so Vercel's NestJS detector
 * can find NestFactory.create directly in the entry file.
 */
export async function createApp() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const config = app.get(ConfigService);

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);
  expressApp.disable('x-powered-by');
  app.setGlobalPrefix('api');

  // Basic security headers without helmet
  app.use((_req: unknown, res: { setHeader: (k: string, v: string) => void }, next: () => void) => {
    (res as any).setHeader('X-Content-Type-Options', 'nosniff');
    (res as any).setHeader('X-Frame-Options', 'DENY');
    (res as any).setHeader('Referrer-Policy', 'no-referrer');
    (res as any).setHeader('Cross-Origin-Resource-Policy', 'same-site');
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

  return app;
}
