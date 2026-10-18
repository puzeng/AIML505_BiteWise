import { createApp } from './app.js';
import { DEFAULT_DB_PATH, openDatabase, seedIfEmpty } from './db.js';
import { hasGeminiKey, loadEnvFiles } from './env.js';

loadEnvFiles();

const db = openDatabase(process.env.BITEWISE_DB || DEFAULT_DB_PATH);
seedIfEmpty(db);

const port = Number(process.env.PORT) || 3001;
const app = createApp({ db });

app.listen(port, () => {
  const mode = hasGeminiKey() ? 'Gemini configured' : 'demo mode (fallback ranker)';
  console.log(`BiteWise API listening on http://localhost:${port} — ${mode}`);
});
