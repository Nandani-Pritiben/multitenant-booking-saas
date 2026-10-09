import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import express from 'express';
import { AppModule } from '../app.module.js';
import { AppErrorFilter } from '../filters/app-error.filter.js';

/**
 * Single source of truth for NestJS app setup.
 * Used by src/main.ts (local HTTP server) and api/index.ts (Vercel serverless).
 *
 * Pass an express instance for serverless; omit it for a standard HTTP server.
 */
export async function createApp(server?: express.Express) {
  const app = server
    ? await NestFactory.create(AppModule, new ExpressAdapter(server), { bufferLogs: true })
    : await NestFactory.create(AppModule, { bufferLogs: true });

  const config = app.get(ConfigService);

  // Trust the first proxy so req.ip and secure cookies work behind Vercel's edge
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  app.setGlobalPrefix('api');
  app.use(helmet({ contentSecurityPolicy: false }));

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
