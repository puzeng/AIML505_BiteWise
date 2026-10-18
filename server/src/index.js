import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { DEFAULT_DB_PATH, openDatabase, seedIfEmpty } from './db.js';
import { hasGeminiKey, loadEnvFiles } from './env.js';

loadEnvFiles();

const db = openDatabase(process.env.BITEWISE_DB || DEFAULT_DB_PATH);
seedIfEmpty(db);

const port = Number(process.env.PORT) || 3001;
const configuredDist = process.env.BITEWISE_CLIENT_DIST
  || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
const clientDist = fs.existsSync(path.join(configuredDist, 'index.html')) ? configuredDist : null;
const app = createApp({ db, clientDist });

app.listen(port, '0.0.0.0', () => {
  const mode = hasGeminiKey() ? 'Gemini configured' : 'demo mode (fallback ranker)';
  const surface = clientDist ? 'web app and API' : 'API only';
  console.log(`BiteWise ${surface} listening on http://0.0.0.0:${port} — ${mode}`);
});
