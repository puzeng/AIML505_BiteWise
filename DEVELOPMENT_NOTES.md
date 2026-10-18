# BiteWise AI development notes

These notes are for the capstone write-up. They record only work done in this workspace. They do not include an elapsed-time log. Screenshots were not created here; capture those yourself (see the last section).

## What was built

BiteWise AI is a local prototype for meal decision fatigue. A person describes a craving in plain language. The server keeps only fictional sample menu rows that already satisfy the budget and required dietary labels, then ranks up to three of those rows. Nothing is ordered, paid, or sent to a delivery service.

The app lives at the repo root as `client/` (React, Vite, Tailwind, JavaScript) and `server/` (Express, JavaScript, SQLite). `npm run dev` starts both.

## Phases

1. Scaffolded the Vite React client and an Express server, with a root npm script that runs them together.
2. Added the SQLite schema, constraints, and a seed of 8 fictional restaurants and 40 menu items. The API creates and seeds the database on startup when it is empty. `npm run seed` resets it.
3. Implemented the menu, restaurant, health, favorites, and recommendation routes, including validation and safe error JSON.
4. Implemented the recommendation pipeline: normalize the request, read hard dietary phrases and a mentioned budget from the sentence, enforce price and dietary labels in SQL before any model call, then rank.
5. Built the Home, Explore, AI Recommendations, Favorites, and meal detail pages, plus a sample cart and checkout summary that never charges anyone.
6. Added `node:test` coverage and ran it. Then exercised the running API with curl and the UI with headless Chrome.

## Decisions

- SQLite uses `better-sqlite3`. Node's built-in `node:sqlite` loaded, but Node v22.14.0 printed `ExperimentalWarning` for it, so the stable native driver was used instead. Queries are parameterized. Favorites have `UNIQUE (menu_item_id)`. Foreign keys are on.
- Gemini is called only on the server, through `@google/genai`, model id `gemini-3.8-flash`. Google's Gemini deprecation page, checked while building, lists `gemini-3.8-flash` with no shutdown date. It also says `gemini-3.7-flash` and `gemini-3.5-flash` are deprecated and that those requests are routed to newer Flash models. Structured output uses `responseMimeType: application/json` and `responseJsonSchema`.
- The model is asked only to return ids from the eligible list plus a short explanation. The server rejects the ranking unless every id is in that list, the JSON shape matches, and the explanation does not claim the meal is allergen-free or state calories or grams of protein. On any failure it uses the deterministic ranker and says so.
- No `GEMINI_API_KEY` was present, and none was invented. Health and recommendations run in demo mode and say the fallback ranker produced the list.
- Dietary tags in the seed are sample labels. The API disclaimer says they are not a verified allergen or nutrition analysis. Meals are not marked nut-free when the ingredients list sesame, peanuts are not in the seed, or tahini is listed.
- One local demo user, no auth. The optional cart is `localStorage` only.

## Tests and checks

`npm test` (`node --test --test-concurrency=1 tests/*.test.js`) was run after the final UI fixes. Result: 11 tests, 11 pass, 0 fail. They cover health, restaurants, and the 40-item menu; budget, cuisine, and dietary filters; empty filter results; unknown and invalid meal ids without stack traces; demo-mode fallback when the key is absent; a thrown model call; invalid JSON; an id outside the eligible set; an empty ranking; a non-integer id; a valid injected ranking; prompt phrases that tighten budget and diet before ranking; favorite create, duplicate 409, unknown meal 404, delete, second delete 404, and reopen-the-file persistence; invalid JSON bodies; and a scan that the client source has no API key assignment.

Against the running servers, curl showed:

- `GET http://localhost:3001/api/health` → `demoMode: true`, `rankingModel: gemini-3.8-flash`
- 8 restaurants and menu filters such as `maxBudget=12&dietary=dairy-free`
- `GET /api/menu/99999` → 404 `Meal not found.`
- `POST /api/recommendations` for spicy, high-protein, dairy-free food at a $20 cap → `source: "fallback"`, demo-mode message, and three real rows (Mapo Tofu, Spicy Tuna Roll, Chili Oil Dan Dan Noodles), all dairy-free and at or under $20
- favorite create, list, duplicate 409, delete, empty list, and delete-missing 404
- Vite proxy: `GET http://localhost:5173/api/health` returned the same health JSON, and `GET /` returned 200

`npm run build` succeeded. A search of `client/dist` found no `GEMINI_API_KEY` assignment and no `AIza` key. The UI copy does say "Gemini" when describing the ranker. That is not the key.

Gemini itself was not called. There was no key to call it with.

## Issues and fixes

- Two explore controls can update the query string before React Router has re-rendered. Each update used to read the previous render, so a later control could drop an earlier one. The page now merges each change onto a draft of the latest filters. After that, headless Chrome set cuisine Korean, max budget 12, and dairy-free together. The URL held all three, the meal count went from 40 to 0 (no Korean sample item is both dairy-free and at or under $12), and Lantern Noodle House was hidden while Seoul Street Kitchen stayed.
- At a 375px width, the recommendations heading `AI recommendations` at `text-5xl` made the document `scrollWidth` 422 while the viewport was 375. The heading is `text-4xl` below the `sm` breakpoint, and headings use `overflow-wrap: break-word`. A second pass at 375px showed `scrollWidth` equal to the viewport on Home, the recommendation results, Explore, meal detail, Favorites, the no-match recommendation state, and checkout.
- A browser-agent writeup mentioned Thai cuisine and a Pad Thai meal. Those are not in this sample menu. That writeup was not used as evidence. The checks above were done with headless Chrome on `http://localhost:5173` and matched real strings from this app (Lantern Noodle House, Mapo Tofu, Menu items (40), Menu items (0), Demo mode). No page errors were logged. Desktop was 1280px wide and mobile was 375px wide. Flows that were actually clicked: Home submit into recommendations, Explore filters and clear, meal detail save, Favorites unsave to the empty state, a no-match recommendation URL, the mobile Menu button (Home, Explore, AI Recommendations, Favorites), and Add to sample cart through checkout for Mapo Tofu.

## Demo mode vs Gemini

Demo mode is what is running. `GEMINI_API_KEY` is unset. The badge path is "Demo mode · fallback ranking". To use Gemini, put a real key in an untracked `.env` as `GEMINI_API_KEY=...` and restart the server. Do not put the key in client code. If Gemini is configured but returns an unusable ranking, the same fallback ranker runs and the message says the fallback was used because Gemini failed.

## Screenshots

Two desktop captures were taken on this machine on October 18, 2026. The clock in the corner is the system clock, not a label added to the image.

- `report/screenshots/ide-code.png` — `server/src/gemini.js` and `server/src/recommendations.js` open on the desktop. Cursor's own editor window is not on this display, so the files are open in Mousepad. The source is the project source.
- `report/screenshots/localhost-app.png` — Chrome at `http://localhost:5173` on AI Recommendations, with the demo-mode badge and Mapo Tofu visible.

The written report that uses these shots is `DEVELOPMENT_REPORT.docx` (APA 7th edition). `DEVELOPMENT_REPORT.md` points at that file.

## Comparing this with LineWise AI

LineWise AI's source was not in this workspace, so this file does not describe that app and does not claim what it did. For a 1–2 page comparison, use your own LineWise notes and put BiteWise beside them on these points:

- The problem: waiting in a line versus choosing a meal when the menu is long.
- Grounding: BiteWise can only return rows that are already in SQLite. The model does not get to invent a restaurant, a price, or an ingredient list, and ids outside the filtered set are discarded.
- Failure: with no API key, or with a bad model payload, BiteWise still returns a labeled fallback instead of an empty failure or a made-up meal.
- Data and scope: fictional sample prices, one demo user, favorites stored locally, no accounts, no payment, no live tracking.
- Interaction: plain-language request plus hard budget and dietary labels, then a short list with an explanation tied to menu fields.

## How to run

```bash
npm install
npm run seed
npm run dev
npm test
```

Web app: http://localhost:5173  
API: http://localhost:3001
