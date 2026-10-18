import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createApp } from '../server/src/app.js';
import { listFavorites, openDatabase, resetAndSeed } from '../server/src/db.js';

function makeDb() {
  const db = openDatabase(':memory:');
  resetAndSeed(db);
  return db;
}

async function start(db, rankMeals) {
  const app = createApp({ db, rankMeals });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  return {
    base: `http://127.0.0.1:${server.address().port}`,
    async close() {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
      db.close();
    },
  };
}

async function send(base, urlPath, options = {}) {
  const response = await fetch(`${base}${urlPath}`, options);
  const body = await response.json();
  const headers = Object.fromEntries(response.headers.entries());
  return { status: response.status, body, headers };
}

const CLIENT_A = 'client-token-aaaaaa';
const CLIENT_B = 'client-token-bbbbbb';

function postJson(base, urlPath, payload, headers = {}) {
  return send(base, urlPath, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(payload),
  });
}

function favoriteHeaders(token = CLIENT_A) {
  return { 'x-bitewise-client': token };
}

test('health, restaurants, and menu routes return the sample catalog', async () => {
  const session = await start(makeDb());
  try {
    const health = await send(session.base, '/api/health');
    assert.equal(health.status, 200);
    assert.equal(health.body.ok, true);
    assert.equal(health.body.service, 'bitewise-ai');
    assert.equal(health.body.rankingModel, 'gemini-3.8-flash');
    assert.equal(health.body.demoMode, !(process.env.GEMINI_API_KEY || '').trim());
    assert.equal(health.body.stack, undefined);
    assert.equal(health.headers['x-content-type-options'], 'nosniff');
    assert.equal(health.headers['x-frame-options'], 'DENY');

    const restaurants = await send(session.base, '/api/restaurants');
    assert.equal(restaurants.status, 200);
    assert.equal(restaurants.body.restaurants.length, 8);

    const menu = await send(session.base, '/api/menu');
    assert.equal(menu.status, 200);
    assert.equal(menu.body.items.length, 40);
    assert.ok(menu.body.items.every((item) => item.restaurant && Array.isArray(item.ingredients)));
  } finally {
    await session.close();
  }
});

test('budget, cuisine, and dietary filters constrain menu results', async () => {
  const session = await start(makeDb());
  try {
    const budget = await send(session.base, '/api/menu?maxBudget=9');
    assert.equal(budget.status, 200);
    assert.ok(budget.body.items.length > 0);
    assert.ok(budget.body.items.every((item) => item.price <= 9));

    const vegan = await send(session.base, '/api/menu?dietary=vegan');
    assert.ok(vegan.body.items.length > 0);
    assert.ok(vegan.body.items.every((item) => item.dietaryTags.includes('vegan')));

    const both = await send(session.base, '/api/menu?dietary=dairy-free,high-protein&maxBudget=15');
    assert.ok(both.body.items.length > 0);
    assert.ok(both.body.items.every((item) => item.price <= 15 && item.dietaryTags.includes('dairy-free') && item.dietaryTags.includes('high-protein')));

    const cuisine = await send(session.base, '/api/menu?cuisine=korean');
    assert.ok(cuisine.body.items.length > 0);
    assert.ok(cuisine.body.items.every((item) => item.restaurant.cuisine === 'Korean'));

    const empty = await send(session.base, '/api/menu?maxBudget=1&dietary=vegan');
    assert.equal(empty.status, 200);
    assert.deepEqual(empty.body.items, []);

    const unknownCuisine = await send(session.base, '/api/menu?cuisine=Martian');
    assert.deepEqual(unknownCuisine.body.items, []);

    const badDiet = await send(session.base, '/api/menu?dietary=keto');
    assert.equal(badDiet.status, 400);
    assert.match(badDiet.body.error, /Unknown dietary preference/);
  } finally {
    await session.close();
  }
});

test('unknown and invalid meal ids return safe errors', async () => {
  const session = await start(makeDb());
  try {
    const missing = await send(session.base, '/api/menu/99999');
    assert.equal(missing.status, 404);
    assert.equal(missing.body.error, 'Meal not found.');
    assert.equal(missing.body.stack, undefined);
    assert.doesNotMatch(JSON.stringify(missing.body), /node_modules|at\s/);

    const invalid = await send(session.base, '/api/menu/abc');
    assert.equal(invalid.status, 400);

    const found = await send(session.base, '/api/menu/8');
    assert.equal(found.status, 200);
    assert.equal(found.body.item.name, 'Tofu Miso Soup');
    assert.ok(found.body.item.ingredients.includes('white miso'));
  } finally {
    await session.close();
  }
});

test('demo mode uses the fallback ranker when Gemini is not configured', async () => {
  const previous = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  const session = await start(makeDb());
  try {
    const result = await postJson(session.base, '/api/recommendations', {
      prompt: 'I want spicy Asian food that is high in protein',
      maxBudget: 20,
      dietaryPreferences: ['dairy-free'],
    });
    assert.equal(result.status, 200);
    assert.equal(result.body.demoMode, true);
    assert.equal(result.body.source, 'fallback');
    assert.equal(result.body.matched, true);
    assert.match(result.body.message, /Demo mode/);
    assert.ok(result.body.recommendations.length >= 1 && result.body.recommendations.length <= 3);
    assert.ok(result.body.recommendations.every((row) => (
      row.menuItem.price <= 20
      && row.menuItem.dietaryTags.includes('dairy-free')
      && row.explanation
      && !row.explanation.toLowerCase().includes('allergen-free')
    )));
  } finally {
    if (previous === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previous;
    await session.close();
  }
});

test('a failing model and invalid structured output fall back without leaving the menu', async () => {
  const previous = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'test-key-not-real';
  const db = makeDb();
  let calls = 0;
  const session = await start(db, async () => {
    calls += 1;
    throw new Error('model down');
  });
  try {
    const failed = await postJson(session.base, '/api/recommendations', {
      prompt: 'spicy high protein',
      maxBudget: 20,
      dietaryPreferences: ['dairy-free'],
    });
    assert.equal(calls, 1);
    assert.equal(failed.body.demoMode, false);
    assert.equal(failed.body.source, 'fallback');
    assert.match(failed.body.message, /Fallback recommendations/);
    assert.ok(failed.body.recommendations.every((row) => row.menuItem.price <= 20));
    assert.doesNotMatch(JSON.stringify(failed.body), /test-key-not-real|stack/);
  } finally {
    if (previous === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previous;
    await session.close();
  }

  const cases = [
    'not json at all',
    JSON.stringify({ rankings: [{ menuItemId: 999999, explanation: 'Ghost dish that is not on the menu.' }] }),
    JSON.stringify({ rankings: [] }),
    JSON.stringify({ rankings: [{ menuItemId: '1', explanation: 'Wrong id type.' }] }),
    JSON.stringify({ note: 'missing rankings' }),
  ];

  for (const raw of cases) {
    const invalidSession = await start(makeDb(), async () => raw);
    try {
      const result = await postJson(invalidSession.base, '/api/recommendations', {
        prompt: 'something warm',
        maxBudget: 30,
      });
      assert.equal(result.status, 200);
      assert.equal(result.body.source, 'fallback');
      assert.ok(result.body.recommendations.every((row) => row.explanation !== 'Ghost dish that is not on the menu.'));
      assert.ok(result.body.recommendations.every((row) => row.menuItem.id !== 999999));
    } finally {
      await invalidSession.close();
    }
  }
});

test('a valid model ranking is kept only when every id is eligible', async () => {
  let seen = [];
  const session = await start(makeDb(), async ({ meals }) => {
    seen = meals;
    return {
      rankings: [
        { menuItemId: meals[0].id, explanation: 'First eligible sample meal for this request.' },
        { menuItemId: meals[1].id, explanation: 'Second eligible sample meal for this request.' },
      ],
    };
  });
  try {
    const result = await postJson(session.base, '/api/recommendations', {
      prompt: 'I want spicy Asian food that is high in protein',
      maxBudget: 20,
      dietaryPreferences: ['dairy-free'],
    });
    assert.equal(result.body.source, 'gemini');
    assert.match(result.body.message, /Ranked by Gemini/);
    assert.equal(result.body.recommendations.length, 2);
    assert.equal(result.body.recommendations[0].explanation, 'First eligible sample meal for this request.');
    assert.deepEqual(
      result.body.recommendations.map((row) => row.menuItem.id),
      [seen[0].id, seen[1].id],
    );
    assert.ok(seen.every((meal) => meal.price <= 20 && meal.dietaryTags.includes('dairy-free')));
    assert.equal(result.body.eligibleCount, seen.length);
  } finally {
    await session.close();
  }
});

test('prompt dietary words and a lower mentioned budget are hard filters', async () => {
  let called = false;
  const session = await start(makeDb(), async () => {
    called = true;
    throw new Error('should not rank an empty list');
  });
  try {
    const none = await postJson(session.base, '/api/recommendations', {
      prompt: 'vegan soup under $1',
      maxBudget: 40,
    });
    assert.equal(called, false);
    assert.equal(none.body.matched, false);
    assert.equal(none.body.source, 'none');
    assert.deepEqual(none.body.recommendations, []);
    assert.match(none.body.message, /No sample meals/);

    const vegan = await postJson(session.base, '/api/recommendations', {
      prompt: 'a vegan lunch under $12',
      maxBudget: 30,
    });
    assert.equal(vegan.body.matched, true);
    assert.ok(vegan.body.recommendations.every((row) => row.menuItem.dietaryTags.includes('vegan') && row.menuItem.price <= 12));
    assert.ok(vegan.body.appliedFilters.dietaryFromPrompt.includes('vegan'));
    assert.equal(vegan.body.appliedFilters.maxBudget, 12);
  } finally {
    await session.close();
  }
});

test('favorites persist, reject duplicates, and reject unknown meals', async () => {
  const file = path.join(os.tmpdir(), `bitewise-${process.pid}-${Date.now()}.sqlite`);
  const db = openDatabase(file);
  resetAndSeed(db);
  const schema = db.prepare("SELECT sql FROM sqlite_master WHERE name = 'favorites'").get().sql;
  assert.match(schema, /UNIQUE \(client_token, menu_item_id\)/);
  const session = await start(db);
  try {
    const missingClient = await postJson(session.base, '/api/favorites', { menuItemId: 8 });
    assert.equal(missingClient.status, 400);

    const created = await postJson(session.base, '/api/favorites', { menuItemId: 8 }, favoriteHeaders());
    assert.equal(created.status, 201);
    assert.equal(created.body.favorite.menuItem.name, 'Tofu Miso Soup');

    const duplicate = await postJson(session.base, '/api/favorites', { menuItemId: 8 }, favoriteHeaders());
    assert.equal(duplicate.status, 409);
    assert.match(duplicate.body.error, /already/);

    const otherClient = await send(session.base, '/api/favorites', { headers: favoriteHeaders(CLIENT_B) });
    assert.deepEqual(otherClient.body.favorites, []);

    const listed = await send(session.base, '/api/favorites', { headers: favoriteHeaders() });
    assert.equal(listed.body.favorites.length, 1);
    assert.equal(listed.body.favorites[0].menuItemId, 8);

    const missingMeal = await postJson(session.base, '/api/favorites', { menuItemId: 99999 }, favoriteHeaders());
    assert.equal(missingMeal.status, 404);

    const badBody = await postJson(session.base, '/api/favorites', {}, favoriteHeaders());
    assert.equal(badBody.status, 400);
  } finally {
    await session.close();
  }

  const reopened = openDatabase(file);
  try {
    const stored = listFavorites(reopened, CLIENT_A);
    assert.equal(stored.length, 1);
    assert.equal(stored[0].menuItem.name, 'Tofu Miso Soup');
    assert.equal(listFavorites(reopened, CLIENT_B).length, 0);
  } finally {
    reopened.close();
    fs.rmSync(file, { force: true });
  }
});

test('favorite delete removes the row and a second delete is a 404', async () => {
  const session = await start(makeDb());
  try {
    const created = await postJson(session.base, '/api/favorites', { menuItemId: 5 }, favoriteHeaders());
    const stolen = await send(session.base, `/api/favorites/${created.body.favorite.id}`, {
      method: 'DELETE',
      headers: favoriteHeaders(CLIENT_B),
    });
    assert.equal(stolen.status, 404);
    const removed = await send(session.base, `/api/favorites/${created.body.favorite.id}`, {
      method: 'DELETE',
      headers: favoriteHeaders(),
    });
    assert.equal(removed.status, 200);
    assert.equal(removed.body.ok, true);
    const listed = await send(session.base, '/api/favorites', { headers: favoriteHeaders() });
    assert.deepEqual(listed.body.favorites, []);
    const again = await send(session.base, `/api/favorites/${created.body.favorite.id}`, {
      method: 'DELETE',
      headers: favoriteHeaders(),
    });
    assert.equal(again.status, 404);
  } finally {
    await session.close();
  }
});

test('recommendation and favorite requests reject invalid JSON and empty prompts', async () => {
  const session = await start(makeDb());
  try {
    const invalidJson = await send(session.base, '/api/recommendations', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{',
    });
    assert.equal(invalidJson.status, 400);
    assert.match(invalidJson.body.error, /valid JSON/);
    assert.equal(invalidJson.body.stack, undefined);

    const empty = await postJson(session.base, '/api/recommendations', { prompt: '   ', maxBudget: 10 });
    assert.equal(empty.status, 400);

    const badBudget = await postJson(session.base, '/api/recommendations', { prompt: 'soup', maxBudget: -3 });
    assert.equal(badBudget.status, 400);
  } finally {
    await session.close();
  }
});

test('client source does not embed a Gemini API key', () => {
  const root = path.join(process.cwd(), 'client');
  const files = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir)) {
      if (entry === 'node_modules' || entry === 'dist') continue;
      const full = path.join(dir, entry);
      if (fs.statSync(full).isDirectory()) walk(full);
      else if (/\.(js|jsx|css|html|json|svg)$/.test(entry)) files.push(full);
    }
  }
  walk(root);
  const combined = files.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
  assert.doesNotMatch(combined, /GEMINI_API_KEY\s*=\s*['"][^'"]+/);
  assert.doesNotMatch(combined, /AIza[0-9A-Za-z_-]{20}/);
});
