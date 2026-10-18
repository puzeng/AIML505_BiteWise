import { DEFAULT_DB_PATH, openDatabase, resetAndSeed } from './db.js';

const db = openDatabase(process.env.BITEWISE_DB || DEFAULT_DB_PATH);
resetAndSeed(db);
const restaurants = db.prepare('SELECT COUNT(*) AS n FROM restaurants').get().n;
const items = db.prepare('SELECT COUNT(*) AS n FROM menu_items').get().n;
console.log(`Seeded ${restaurants} restaurants and ${items} menu items.`);
db.close();
