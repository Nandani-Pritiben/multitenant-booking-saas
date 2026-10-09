import { bootstrap } from './bootstrap.js';

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
