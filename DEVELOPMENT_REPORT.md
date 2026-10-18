The submittable APA 7th edition paper is [DEVELOPMENT_REPORT.docx](DEVELOPMENT_REPORT.docx). On the title page, replace `[Institution]`, `[Course name]`, and `[Instructor name]` before you turn it in. The course number AIML 515 comes from the project name; change the number if the syllabus uses a different one.

The notes below are the earlier plain-text draft, kept so the facts in the Word file can be checked. Submit the Word file, not this page.

# BiteWise AI development report

BiteWise AI is the second app in this capstone: a local food-discovery prototype. A person types a craving, and the server returns up to three meals that already exist in a fictional sample menu. This report covers the assistant, the prompts, the features, the problems, and the time that can actually be read off the session clock. It does not invent a timesheet, and it does not invent details of LineWise AI, because that project is not in this workspace.

## Assistant and prompts

The assistant was Cursor’s coding agent, running as Grok 4.7. The prompts below are the ones sent in this session.

The prompt that did the most work was the original build request. It named the stack (React, Vite, Tailwind, Express, SQLite, and `@google/genai`), the ports, the tables, the recommendation body, and a strict order: validate the sentence, enforce budget and dietary labels in ordinary server code, send Gemini only the meals that survive, require JSON ids, and fall back when the key is missing or the model output is bad. It also said not to invent a key, a time log, or screenshots. That prompt is why the app runs in a labeled demo mode instead of stopping.

Later prompts were short. “The local app can not be running” was followed by stopping Vite and the API. “help me run” started them again at `http://localhost:5173` and `http://localhost:3001`. This request asked for the two clock-visible screenshots and this report.

## How this approach differed

LineWise AI’s code was not available here, so this is not a claim about how that app was built. What this session did differently from a typical “ask the model for meal ideas” approach is that the menu is the only source of meals. `better-sqlite3` was chosen because Node’s built-in `node:sqlite` printed an experimental warning on Node v22.14.0. Price and dietary labels are filtered in SQL before any model call. Gemini, when a key exists, is asked only to rank those rows and return their ids. Ids outside that set are rejected. With no key, the same deterministic ranker runs and the page says so.

The model id is `gemini-3.8-flash`. Google’s deprecation list, checked while building, showed that model with no shutdown date, and showed `gemini-3.5-flash` and `gemini-3.7-flash` as deprecated.

## Features, and where the assistant carried them

The assistant implemented the whole slice from that first prompt: eight fictional restaurants and forty menu items; Home, Explore, AI Recommendations, Favorites, and meal detail; a sample cart that never charges anyone; and the API routes for health, menus, recommendations, and favorites. Favorites use `UNIQUE (menu_item_id)`, so a second save returns 409. Tests use `node:test`. The last run was 11 tests, 11 passes. A production client build contained no API key. The useful part of the help was not a generic UI sketch. It was the rule that the explanation has to come from menu fields, and that a bad model payload must not become a fake dish.

## Challenges

A few problems showed up only after something was actually run.

Explore filters could drop each other. Two controls updated the address bar from the same old render, so the later change erased the earlier one. The page now keeps a draft of the latest filters and merges each change into it. After that, Korean cuisine plus a $12 cap plus dairy-free correctly returned no meals, because no Korean sample item is both dairy-free and at or under $12.

On a 375px-wide window, the heading “AI recommendations” made the page wider than the screen. The heading is smaller below the `sm` breakpoint, and headings can break long words. A second check at 375px no longer overflowed.

Vite listens on `localhost`, which on this machine is IPv6. `http://127.0.0.1:5173` does not connect. `http://localhost:5173` does.

One browser pass described Thai food and Pad Thai. Those meals are not in the database, so that pass was discarded. The checks that count were curl, the test suite, and headless Chrome against the real pages.

## App 1 versus App 2

There is no LineWise repository here, so this report cannot say which app was faster, and it will not guess. What was easier inside this BiteWise session, because the prompt already decided it, was the failure path: no key still produces a labeled list, and tests can inject a broken model without calling Google. What took the extra passes was the interface: filter state, a heading that overflowed a phone width, and the localhost address. Those were found by running the app, not by the first draft.

If you have your own notes from LineWise, the comparison that fits this app is grounding. BiteWise cannot add a restaurant, a price, or an ingredient that is not already in SQLite. A missing dietary label is treated as unknown, not as proof that the meal is free of that ingredient.

## Time

No separate time log was kept, so none is invented here. The clocks that do exist are from this session on October 18, 2026, UTC. The build request arrived at 1:43 AM. `package.json` was written at 2:00 AM, the recommendation module at 2:02 AM, and the README at 2:11 AM. The dev servers first came up at 2:12 AM. The last edit to the recommendations page was at 2:54 AM, and the development notes were written at 2:57 AM. That is about one hour and fourteen minutes from the request to the notes. The servers were stopped around 3:29 AM, started again around 3:31 AM, and these two screenshots were taken at about 3:37–3:38 AM. The clock in both images is that system clock.

## Screenshots

- `report/screenshots/ide-code.png` — project source (`server/src/gemini.js`, with `recommendations.js` in the other tab), desktop clock visible.
- `report/screenshots/localhost-app.png` — the app at `http://localhost:5173`, demo-mode ranking, desktop clock visible.
