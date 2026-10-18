import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { menuItems, restaurants } from './seed-data.js';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_DB_PATH = path.join(serverRoot, 'data', 'bitewise.sqlite');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS restaurants (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  cuisine TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS menu_items (
  id INTEGER PRIMARY KEY,
  restaurant_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price REAL NOT NULL CHECK (price >= 0),
  ingredients TEXT NOT NULL,
  dietary_tags TEXT NOT NULL,
  spice_level INTEGER NOT NULL CHECK (spice_level BETWEEN 0 AND 5),
  image_url TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);

CREATE TABLE IF NOT EXISTS favorites (
  id INTEGER PRIMARY KEY,
  menu_item_id INTEGER NOT NULL,
  client_token TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id),
  UNIQUE (client_token, menu_item_id)
);

CREATE INDEX IF NOT EXISTS idx_menu_restaurant ON menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_price ON menu_items(price);
`;

const ITEM_SELECT = `
  SELECT
    m.id,
    m.restaurant_id,
    m.name,
    m.description,
    m.price,
    m.ingredients,
    m.dietary_tags,
    m.spice_level,
    m.image_url,
    r.name AS restaurant_name,
    r.cuisine AS cuisine,
    r.description AS restaurant_description,
    r.image_url AS restaurant_image_url
  FROM menu_items m
  JOIN restaurants r ON r.id = m.restaurant_id
`;

export function openDatabase(dbPath = DEFAULT_DB_PATH) {
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  scopeFavoritesToClient(db);
  return db;
}

function scopeFavoritesToClient(db) {
  const columns = db.prepare('PRAGMA table_info(favorites)').all();
  if (columns.some((column) => column.name === 'client_token')) return;
  db.exec(`
    CREATE TABLE favorites_scoped (
      id INTEGER PRIMARY KEY,
      menu_item_id INTEGER NOT NULL,
      client_token TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (menu_item_id) REFERENCES menu_items(id),
      UNIQUE (client_token, menu_item_id)
    );
    DROP TABLE favorites;
    ALTER TABLE favorites_scoped RENAME TO favorites;
  `);
}

export function resetAndSeed(db) {
  const insertRestaurant = db.prepare(`
    INSERT INTO restaurants (id, name, cuisine, description, image_url)
    VALUES (@id, @name, @cuisine, @description, '')
  `);
  const insertItem = db.prepare(`
    INSERT INTO menu_items (
      id, restaurant_id, name, description, price, ingredients, dietary_tags, spice_level, image_url
    ) VALUES (
      @id, @restaurantId, @name, @description, @price, @ingredients, @dietaryTags, @spiceLevel, ''
    )
  `);

  const run = db.transaction(() => {
    db.exec('DELETE FROM favorites; DELETE FROM menu_items; DELETE FROM restaurants;');
    for (const restaurant of restaurants) insertRestaurant.run(restaurant);
    for (const item of menuItems) {
      insertItem.run({
        ...item,
        ingredients: JSON.stringify(item.ingredients),
        dietaryTags: JSON.stringify(item.dietaryTags),
      });
    }
  });
  run();
}

export function seedIfEmpty(db) {
  const row = db.prepare('SELECT COUNT(*) AS n FROM restaurants').get();
  if (row.n === 0) resetAndSeed(db);
}

export function parseMenuRow(row) {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    name: row.name,
    description: row.description,
    price: row.price,
    ingredients: JSON.parse(row.ingredients),
    dietaryTags: JSON.parse(row.dietary_tags),
    spiceLevel: row.spice_level,
    imageUrl: row.image_url || '',
    restaurant: {
      id: row.restaurant_id,
      name: row.restaurant_name,
      cuisine: row.cuisine,
      description: row.restaurant_description,
      imageUrl: row.restaurant_image_url || '',
    },
  };
}

export function listRestaurants(db) {
  return db.prepare(`
    SELECT id, name, cuisine, description, image_url AS imageUrl
    FROM restaurants
    ORDER BY id
  `).all();
}

export function listMenu(db, { cuisine, maxBudget, dietaryTags, restaurantId } = {}) {
  const clauses = [];
  const params = [];
  if (cuisine) {
    clauses.push('lower(r.cuisine) = lower(?)');
    params.push(cuisine);
  }
  if (restaurantId != null) {
    clauses.push('m.restaurant_id = ?');
    params.push(restaurantId);
  }
  if (maxBudget != null) {
    clauses.push('m.price <= ?');
    params.push(maxBudget);
  }
  for (const tag of dietaryTags || []) {
    clauses.push('m.dietary_tags LIKE ?');
    params.push(`%"${tag}"%`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = db.prepare(`${ITEM_SELECT} ${where} ORDER BY m.id`).all(...params);
  return rows.map(parseMenuRow);
}

export function getMenuItem(db, id) {
  const row = db.prepare(`${ITEM_SELECT} WHERE m.id = ?`).get(id);
  return row ? parseMenuRow(row) : null;
}

export function listFavorites(db, clientToken) {
  const rows = db.prepare(`
    SELECT
      f.id AS favorite_id,
      f.created_at,
      m.id,
      m.restaurant_id,
      m.name,
      m.description,
      m.price,
      m.ingredients,
      m.dietary_tags,
      m.spice_level,
      m.image_url,
      r.name AS restaurant_name,
      r.cuisine AS cuisine,
      r.description AS restaurant_description,
      r.image_url AS restaurant_image_url
    FROM favorites f
    JOIN menu_items m ON m.id = f.menu_item_id
    JOIN restaurants r ON r.id = m.restaurant_id
    WHERE f.client_token = ?
    ORDER BY f.created_at DESC, f.id DESC
  `).all(clientToken);
  return rows.map((row) => ({
    id: row.favorite_id,
    menuItemId: row.id,
    createdAt: row.created_at,
    menuItem: parseMenuRow(row),
  }));
}

export function addFavorite(db, menuItemId, clientToken) {
  const info = db.prepare(
    'INSERT INTO favorites (menu_item_id, client_token) VALUES (?, ?)',
  ).run(menuItemId, clientToken);
  return db.prepare(`
    SELECT id, menu_item_id AS menuItemId, created_at AS createdAt
    FROM favorites WHERE id = ?
  `).get(info.lastInsertRowid);
}

export function deleteFavorite(db, id, clientToken) {
  const info = db.prepare('DELETE FROM favorites WHERE id = ? AND client_token = ?').run(id, clientToken);
  return info.changes > 0;
}
