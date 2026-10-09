import { ConfigService } from '@nestjs/config';
import { createApp } from './bootstrap/create-app.js';

async function bootstrap() {
  const app = await createApp();
  const config = app.get(ConfigService);
  const port = Number(config.get('PORT') ?? 4000);
  await app.listen(port);
}

void bootstrap();
