/**
 * Vercel serverless entry point.
 * Vercel requires a default export in the `api/` folder.
 *
 * This file is ONLY used during Vercel deployment.
 * Local development uses src/main.ts (HTTP server on PORT 4000).
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApp } from '../src/bootstrap/create-app.js';

// Cache the Express instance across warm Lambda invocations
let cachedApp: import('express').Express | null = null;

async function getExpress(): Promise<import('express').Express> {
  if (cachedApp) return cachedApp;

  const app = await createApp();
  await app.init();
  cachedApp = app.getHttpAdapter().getInstance() as import('express').Express;
  return cachedApp;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const expressApp = await getExpress();
  expressApp(req, res);
}
