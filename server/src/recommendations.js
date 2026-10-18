import { listMenu } from './db.js';
import { hasGeminiKey, safeErrorMessage } from './env.js';
import { rankWithGemini, validateRanking } from './gemini.js';
import { interpretPrompt, normalizeRecommendationRequest, stricterBudget } from './preferences.js';
import { fallbackRank } from './ranker.js';

export const DISCLAIMER = 'Dietary tags and prices are fictional sample-menu labels. They are not a verified allergen, ingredient-audit, or nutrition analysis. If a label is missing, BiteWise does not know whether the meal meets that diet.';

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('The ranking request timed out.')), ms);
    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export async function buildRecommendations({ db, body, rankMeals }) {
  const request = normalizeRecommendationRequest(body);
  const interpreted = interpretPrompt(request.prompt);
  const dietaryPreferences = [...new Set([...request.dietaryPreferences, ...interpreted.hardDietary])];
  const maxBudget = stricterBudget(request.maxBudget, interpreted.mentionedBudget);
  const meals = listMenu(db, { maxBudget, dietaryTags: dietaryPreferences });
  const demoMode = !hasGeminiKey();
  const appliedFilters = {
    maxBudget,
    budgetFromPrompt: interpreted.mentionedBudget,
    dietaryPreferences,
    dietaryFromPrompt: interpreted.hardDietary,
  };
  const base = {
    demoMode,
    disclaimer: DISCLAIMER,
    eligibleCount: meals.length,
    appliedFilters,
  };

  if (meals.length === 0) {
    return {
      ...base,
      matched: false,
      source: 'none',
      message: 'No sample meals match that budget and those dietary labels. Try a higher budget or fewer required labels.',
      recommendations: [],
    };
  }

  const signals = { ...interpreted, hardDietary: dietaryPreferences, maxBudget };
  const attemptedModel = Boolean(rankMeals) || hasGeminiKey();

  if (attemptedModel) {
    try {
      const runner = rankMeals || rankWithGemini;
      const raw = await withTimeout(
        Promise.resolve().then(() => runner({
          prompt: request.prompt,
          meals,
          maxBudget,
          dietaryPreferences,
        })),
        20000,
      );
      const recommendations = validateRanking(raw, meals);
      return {
        ...base,
        matched: true,
        source: 'gemini',
        message: 'Ranked by Gemini from meals that already passed the budget and dietary checks.',
        recommendations,
      };
    } catch (error) {
      console.error(`Recommendation ranking failed: ${safeErrorMessage(error)}`);
    }
  }

  return {
    ...base,
    matched: true,
    source: 'fallback',
    message: attemptedModel
      ? 'Fallback recommendations are shown because Gemini was unavailable or returned a ranking that did not match the menu.'
      : 'Demo mode: no GEMINI_API_KEY is set, so these are fallback recommendations from the sample menu.',
    recommendations: fallbackRank(meals, signals),
  };
}
