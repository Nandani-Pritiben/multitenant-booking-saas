/**
 * Vercel serverless entry point.
 * Wraps the NestJS app as an Express handler that Vercel can invoke.
 *
 * This file is used ONLY when deployed to Vercel.
 * Local dev still uses main.ts (HTTP server on PORT 4000).
 */
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import express from 'express';
import { AppModule } from './app.module.js';

// Re-use the same Express app instance across warm invocations
let cachedApp: express.Express | null = null;

async function bootstrap(): Promise<express.Express> {
  if (cachedApp) return cachedApp;

  const server = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    // Suppress Nest startup banner in serverless logs
    logger: ['error', 'warn', 'log'],
  });

  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');

  app.use(
    helmet({
      // Allow Vercel's inline scripts for error pages
      contentSecurityPolicy: false,
    }),
  );

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      const allowed = (config.get<string>('CORS_ORIGINS') ?? '')
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean);

      // Same-origin requests (no Origin header) or explicitly allowed origins
      if (!origin || allowed.length === 0 || allowed.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  await app.init();
  cachedApp = server;
  return server;
}

// Vercel calls this as the default export
export default async function handler(
  req: express.Request,
  res: express.Response,
): Promise<void> {
  const app = await bootstrap();
  app(req, res);
}
