const SPICE_LABELS = ['no spice', 'mild', 'medium', 'spicy', 'hot', 'very hot'];

function cuisineHit(meal, signals) {
  const cuisine = meal.restaurant.cuisine.toLowerCase();
  if (signals.cuisines.includes(cuisine)) return true;
  if (signals.asian && signals.asianCuisines.has(cuisine)) return true;
  return false;
}

export function scoreMeal(meal, signals) {
  let score = 0;
  const haystack = [
    meal.name,
    meal.description,
    meal.ingredients.join(' '),
    meal.restaurant.cuisine,
    meal.restaurant.name,
    meal.dietaryTags.join(' '),
  ].join(' ').toLowerCase();

  if (signals.cuisines.length || signals.asian) {
    if (cuisineHit(meal, signals)) score += 8;
  }
  if (signals.spicy) score += meal.spiceLevel * 2;
  if (signals.mild) score += (5 - meal.spiceLevel) * 1.5;
  if (signals.highProtein && meal.dietaryTags.includes('high-protein')) score += 6;
  if (signals.light && meal.dietaryTags.includes('light')) score += 6;
  for (const word of signals.keywords) {
    if (haystack.includes(word)) score += 2;
  }
  if (signals.maxBudget) {
    score += Math.max(0, (signals.maxBudget - meal.price) / signals.maxBudget);
  }
  return score;
}

export function explainFallback(meal, signals) {
  const reasons = [];
  if (cuisineHit(meal, signals)) {
    reasons.push(`it is a ${meal.restaurant.cuisine} plate from ${meal.restaurant.name}`);
  } else {
    reasons.push(`it is from ${meal.restaurant.name} (${meal.restaurant.cuisine})`);
  }
  if (signals.spicy && meal.spiceLevel >= 3) {
    reasons.push(`the sample menu marks spice ${meal.spiceLevel}/5 (${SPICE_LABELS[meal.spiceLevel]})`);
  }
  if (signals.mild && meal.spiceLevel <= 1) {
    reasons.push(`the sample menu marks spice ${meal.spiceLevel}/5 (${SPICE_LABELS[meal.spiceLevel]})`);
  }
  if (signals.highProtein && meal.dietaryTags.includes('high-protein')) {
    reasons.push('it carries the sample label high-protein');
  }
  if (signals.light && meal.dietaryTags.includes('light')) {
    reasons.push('it carries the sample label light');
  }
  const matchedDiet = (signals.hardDietary || []).filter((tag) => meal.dietaryTags.includes(tag));
  if (matchedDiet.length) reasons.push(`it is labeled ${matchedDiet.join(', ')}`);
  reasons.push(`the listed sample price is $${meal.price.toFixed(2)}`);
  let text = `${meal.name}: ${reasons.join('; ')}. Sample menu labels are not a verified allergen or nutrition analysis.`;
  if (text.length > 400) text = `${text.slice(0, 397)}...`;
  return text;
}

export function fallbackRank(meals, signals) {
  return meals
    .map((meal) => ({ meal, score: scoreMeal(meal, signals) }))
    .sort((a, b) => b.score - a.score || a.meal.id - b.meal.id)
    .slice(0, 3)
    .map(({ meal }) => ({
      explanation: explainFallback(meal, signals),
      menuItem: meal,
    }));
}
