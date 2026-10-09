/**
 * Vercel serverless entry point.
 * Vercel requires a default export in the `api/` folder.
 *
 * This file is ONLY used during Vercel deployment.
 * Local development uses src/main.ts (HTTP server on PORT 4000).
 */
import express from 'express';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApp } from '../src/bootstrap/create-app.js';

// Cache the Express instance across warm Lambda invocations
let cachedServer: express.Express | null = null;

async function getServer(): Promise<express.Express> {
  if (cachedServer) return cachedServer;

  const server = express();
  const app = await createApp(server);
  await app.init();
  cachedServer = server;
  return cachedServer;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const server = await getServer();
  server(req as express.Request, res as express.Response);
}
