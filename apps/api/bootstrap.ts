import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';
import { LogLevel } from '@nestjs/common';
import { HelmetMiddleware } from './middleware/helmet.middleware.js';
import helmet from 'helmet';
import { AppConfigService } from './config/app.config.js';
import { SupabaseService } from './supabase/supabase.service.js';

export async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'info', 'debug', 'verbose'] as LogLevel[],
  });

  // Global prefix /api
  app.setGlobalPrefix('api');

  // Helmet for security
  app.use(helmet());

  // CORS from CORS_ORIGINS (comma separated, default http://localhost:5173)
  const corsOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173').split(',').map((o) => o.trim());
  app.enableCors({ origin: corsOrigins, credentials: false });

  // Validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Start listening
  const port = parseInt(process.env.PORT ?? '4000', 10);
  await app.listen(port);

  // Log to console directly (the logger config will handle logging)
  console.log(`Backend listening on port ${port}`);
}

export default bootstrap;
