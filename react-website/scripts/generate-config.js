import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

const mode = process.argv[2] ?? 'development';
const env = loadEnv(mode, process.cwd(), 'VITE_');
const moviesApiUrl = (
  process.env.VITE_MOVIES_API_URL
  ?? env.VITE_MOVIES_API_URL
  ?? 'https://i9sjtfnqw8.execute-api.eu-west-2.amazonaws.com'
).replace(/\/+$/, '');
const configPath = fileURLToPath(new URL('../src/config.js', import.meta.url));

fs.mkdirSync(path.dirname(configPath), { recursive: true });
fs.writeFileSync(configPath, `export const MOVIES_API_URL = ${JSON.stringify(moviesApiUrl)};\n`);
