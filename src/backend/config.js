import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const config = {
  env: process.env.NODE_ENV || 'development',
  host: process.env.HOST || '127.0.0.1',
  port: Number(process.env.PORT || 3000),
  rootDir,
  databasePath: path.resolve(rootDir, process.env.DATABASE_PATH || './data/app.sqlite'),
  frontendDir: path.resolve(rootDir, './src/frontend')
};
