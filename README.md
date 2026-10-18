# BiteWise AI

Your personal AI food discovery assistant. BiteWise is a university capstone prototype for the decision-fatigue problem: describe a meal in plain language (“spicy, high protein, under $20, not too heavy”) and get up to three suggestions drawn only from fictional sample menus.

Restaurants, dishes, and prices are sample data. BiteWise does not place orders, take payment, or talk to a delivery service.

## Stack

- React, Vite, and Tailwind CSS (JavaScript)
- Node.js and Express (JavaScript)
- SQLite via `better-sqlite3`
- Google Gemini through `@google/genai`, model `gemini-3.8-flash`, called only from the server

## Setup

Requires Node.js 22 or newer.

```bash
npm install
npm run seed
npm run dev
```

`npm run seed` creates `server/data/bitewise.sqlite` and loads 8 fictional restaurants and 40 menu items. The database file is gitignored. If you skip seeding, the API still creates and seeds that file on startup when it is missing. Seeding again clears favorites and reloads the sample menu.

`npm run setup` is `npm install` followed by `npm run seed`.

## Run

- Web app: http://localhost:5173
- API: http://localhost:3001
- Health check: http://localhost:3001/api/health

Vite proxies `/api` to the API, so the browser calls same-origin `/api/...`.

## Gemini and demo mode

The model key stays on the server. Copy `.env.example` to `.env` in the repo root (or `server/.env`) and set:

```bash
GEMINI_API_KEY=your_key_here
```

Do not commit `.env`. Restart `npm run dev` after adding the key. The client bundle does not receive the key.

If `GEMINI_API_KEY` is empty, the API runs in demo mode. Recommendations are labeled as fallback rankings from the sample menu. A missing key is not an error.

When a key is set, the server still removes meals over the budget or missing a required dietary label before calling Gemini. Gemini only ranks that eligible list and must return menu item ids plus short explanations. Ids outside that list, invalid JSON, or a failed request fall back to the deterministic ranker, and the response says so.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Starts Express on port 3001 and Vite on port 5173 |
| `npm run seed` | Resets and reloads the sample SQLite database |
| `npm test` | Runs the API tests with `node:test` |
| `npm run build` | Builds the client into `client/dist` |
| `npm start` | Starts only the API |

## API

- `GET /api/health`
- `GET /api/restaurants`
- `GET /api/menu` with optional `cuisine`, `maxBudget`, `dietary` (comma-separated labels), and `restaurantId`
- `GET /api/menu/:id`
- `POST /api/recommendations` with `{ "prompt", "maxBudget", "dietaryPreferences" }`
- `GET /api/favorites`
- `POST /api/favorites` with `{ "menuItemId" }`
- `DELETE /api/favorites/:id`

Dietary labels used in the sample data: `vegetarian`, `vegan`, `gluten-free`, `dairy-free`, `nut-free`, `pescatarian`, `high-protein`, `light`.

There is one local demo user and no accounts. A meal can be favorited only once.

## Sample data

Nothing in the menu is a real restaurant. Dietary tags are labels on those sample rows, not a verified allergen or nutrition analysis. If a label is missing, BiteWise does not know whether the meal meets that diet.
