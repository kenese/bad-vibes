import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  datasource: {
    url: env('STORAGE_DATABASE_URL') ?? process.env.STORAGE_DATABASE_URL!,
  },
});
