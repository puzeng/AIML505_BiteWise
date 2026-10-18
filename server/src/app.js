import express from 'express';
import { addFavorite, deleteFavorite, getMenuItem, listFavorites, listMenu, listRestaurants } from './db.js';
import { hasGeminiKey } from './env.js';
import { GEMINI_MODEL } from './gemini.js';
import { httpError, normalizeDietaryList, readBudget, readPositiveInt } from './preferences.js';
import { buildRecommendations } from './recommendations.js';

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function createApp({ db, rankMeals } = {}) {
  if (!db) throw new Error('createApp requires a database');
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));

  app.get('/', (_req, res) => {
    res.json({
      service: 'bitewise-ai',
      message: 'API is running. Open the web app at http://localhost:5173.',
      health: '/api/health',
    });
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'bitewise-ai',
      demoMode: !hasGeminiKey(),
      rankingModel: GEMINI_MODEL,
    });
  });

  app.get('/api/restaurants', (_req, res) => {
    res.json({ restaurants: listRestaurants(db) });
  });

  app.get('/api/menu', (req, res) => {
    const cuisine = typeof req.query.cuisine === 'string' ? req.query.cuisine.trim() : '';
    const items = listMenu(db, {
      cuisine: cuisine || undefined,
      maxBudget: readBudget(req.query.maxBudget),
      dietaryTags: normalizeDietaryList(req.query.dietary),
      restaurantId: req.query.restaurantId == null || req.query.restaurantId === ''
        ? undefined
        : readPositiveInt(req.query.restaurantId, 'restaurantId'),
    });
    res.json({ items });
  });

  app.get('/api/menu/:id', (req, res) => {
    const id = readPositiveInt(req.params.id, 'Meal id');
    const item = getMenuItem(db, id);
    if (!item) throw httpError(404, 'Meal not found.');
    res.json({ item });
  });

  app.post('/api/recommendations', asyncHandler(async (req, res) => {
    const result = await buildRecommendations({ db, body: req.body, rankMeals });
    res.json(result);
  }));

  app.get('/api/favorites', (_req, res) => {
    res.json({ favorites: listFavorites(db) });
  });

  app.post('/api/favorites', (req, res) => {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      throw httpError(400, 'Request body must be a JSON object.');
    }
    const menuItemId = readPositiveInt(req.body.menuItemId, 'menuItemId');
    const item = getMenuItem(db, menuItemId);
    if (!item) throw httpError(404, 'Meal not found.');
    try {
      const favorite = addFavorite(db, menuItemId);
      res.status(201).json({ favorite: { ...favorite, menuItem: item } });
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.code === 'SQLITE_CONSTRAINT') {
        throw httpError(409, 'That meal is already in your favorites.');
      }
      throw error;
    }
  });

  app.delete('/api/favorites/:id', (req, res) => {
    const id = readPositiveInt(req.params.id, 'Favorite id');
    const removed = deleteFavorite(db, id);
    if (!removed) throw httpError(404, 'Favorite not found.');
    res.json({ ok: true });
  });

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API route not found.' });
  });

  app.use((error, _req, res, _next) => {
    if (error.type === 'entity.parse.failed') {
      res.status(400).json({ error: 'Request body must be valid JSON.' });
      return;
    }
    if (error.type === 'entity.too.large') {
      res.status(413).json({ error: 'Request body is too large.' });
      return;
    }
    if (error.expose) {
      res.status(error.status || 400).json({ error: error.message });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  });

  return app;
}
