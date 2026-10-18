import { hasGeminiKey } from './env.js';

export const GEMINI_MODEL = 'gemini-3.8-flash';

const UNSAFE_EXPLANATION = /\b(allergen-free|nut-allergy safe|kcal|calories?|\d+\s*g protein)\b/i;

function compactMeal(meal) {
  return {
    id: meal.id,
    name: meal.name,
    restaurant: meal.restaurant.name,
    cuisine: meal.restaurant.cuisine,
    price: meal.price,
    description: meal.description,
    ingredients: meal.ingredients,
    dietaryTags: meal.dietaryTags,
    spiceLevel: meal.spiceLevel,
  };
}

function buildPrompt({ prompt, meals, maxBudget, dietaryPreferences }) {
  const budgetText = maxBudget == null ? 'none' : `$${maxBudget.toFixed(2)}`;
  const dietText = dietaryPreferences.length ? dietaryPreferences.join(', ') : 'none';
  return `You rank meals for BiteWise AI, a university prototype that uses fictional sample menus.

User request:
${prompt}

The server already removed meals that miss these hard filters. Do not relax them and do not add meals:
- maximum price: ${budgetText}
- required sample dietary labels: ${dietText}

Eligible meals, the only meals you may choose:
${JSON.stringify(meals.map(compactMeal))}

Choose up to 3 of these meals that best match the request.
Each explanation must be one or two short sentences and may use only the fields above.
Do not invent restaurants, prices, ingredients, nutrition facts, or menu items.
Do not say a meal is allergen-free or medically safe. Dietary tags are sample menu labels.
If a label is absent, do not assume the meal meets that diet.
spiceLevel runs from 0 (not spicy) to 5 (very spicy).`;
}

export async function rankWithGemini(input) {
  if (!hasGeminiKey()) {
    const error = new Error('GEMINI_API_KEY is not set');
    error.code = 'NO_API_KEY';
    throw error;
  }
  const { GoogleGenAI, Type } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY.trim() });
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: buildPrompt(input),
    config: {
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseJsonSchema: {
        type: Type.OBJECT,
        properties: {
          rankings: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                menuItemId: { type: Type.INTEGER },
                explanation: { type: Type.STRING },
              },
              required: ['menuItemId', 'explanation'],
            },
          },
        },
        required: ['rankings'],
      },
    },
  });
  if (!response.text) throw new Error('Gemini returned an empty response.');
  return response.text;
}

export function validateRanking(raw, meals) {
  let data = raw;
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error('Model output was not valid JSON.');
    }
  }
  if (!data || typeof data !== 'object' || Array.isArray(data) || !Array.isArray(data.rankings)) {
    throw new Error('Model output did not match the ranking schema.');
  }
  if (data.rankings.length < 1 || data.rankings.length > 3) {
    throw new Error('Model output must include 1 to 3 rankings.');
  }

  const allowed = new Map(meals.map((meal) => [meal.id, meal]));
  const seen = new Set();
  const recommendations = [];

  for (const row of data.rankings) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      throw new Error('A ranking entry was not an object.');
    }
    const id = row.menuItemId;
    if (!Number.isInteger(id) || !allowed.has(id) || seen.has(id)) {
      throw new Error('A ranking id is missing from the eligible menu.');
    }
    if (typeof row.explanation !== 'string') throw new Error('A ranking explanation was not text.');
    const explanation = row.explanation.trim();
    if (!explanation || explanation.length > 400) {
      throw new Error('A ranking explanation was empty or too long.');
    }
    if (UNSAFE_EXPLANATION.test(explanation)) {
      throw new Error('A ranking explanation made an unsupported nutrition or allergen claim.');
    }
    seen.add(id);
    recommendations.push({ explanation, menuItem: allowed.get(id) });
  }

  return recommendations;
}
