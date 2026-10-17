import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mode = process.argv[2] ?? 'development';
const env = loadEnv(mode, projectRoot, 'VITE_');
const configuredMoviesApiUrl = process.env.VITE_MOVIES_API_URL?.trim()
  || env.VITE_MOVIES_API_URL?.trim();

if (!configuredMoviesApiUrl) {
  throw new Error(
    `VITE_MOVIES_API_URL is required. Set it in the process environment or a .env.${mode} file.`,
  );
}

let parsedApiUrl;
try {
  parsedApiUrl = new URL(configuredMoviesApiUrl);
} catch (error) {
  throw new Error('VITE_MOVIES_API_URL must be an absolute HTTP(S) API base URL.', { cause: error });
}

if (!['http:', 'https:'].includes(parsedApiUrl.protocol) || parsedApiUrl.search || parsedApiUrl.hash) {
  throw new Error('VITE_MOVIES_API_URL must be an absolute HTTP(S) API base URL without query or hash.');
}

const moviesApiUrl = configuredMoviesApiUrl.replace(/\/+$/, '');
const configPath = fileURLToPath(new URL('../src/config.js', import.meta.url));

fs.mkdirSync(path.dirname(configPath), { recursive: true });
fs.writeFileSync(configPath, `export const MOVIES_API_URL = ${JSON.stringify(moviesApiUrl)};\n`);
