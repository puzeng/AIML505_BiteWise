export const KNOWN_DIETARY = [
  'vegetarian',
  'vegan',
  'gluten-free',
  'dairy-free',
  'nut-free',
  'pescatarian',
  'high-protein',
  'light',
];

const KNOWN = new Set(KNOWN_DIETARY);

const PROMPT_RULES = [
  { tag: 'dairy-free', patterns: [/dairy[-\s]?free/i, /\bno dairy\b/i, /\bwithout dairy\b/i, /lactose[-\s]?free/i] },
  { tag: 'gluten-free', patterns: [/gluten[-\s]?free/i, /\bno gluten\b/i, /\bwithout gluten\b/i] },
  { tag: 'nut-free', patterns: [/nut[-\s]?free/i, /\bno nuts\b/i, /\bwithout nuts\b/i, /peanut[-\s]?free/i] },
  { tag: 'vegan', patterns: [/\bvegan\b/i] },
  { tag: 'vegetarian', patterns: [/\bvegetarian\b/i] },
  { tag: 'pescatarian', patterns: [/\bpescatarian\b/i] },
];

const STOP_WORDS = new Set([
  'i', 'want', 'a', 'an', 'the', 'and', 'or', 'with', 'that', 'this', 'is', 'in', 'on',
  'under', 'over', 'food', 'meal', 'meals', 'something', 'not', 'too', 'for', 'of', 'to',
  'my', 'me', 'some', 'please', 'like', 'from', 'but', 'just', 'very', 'really', 'have',
  'need', 'looking', 'feel', 'feeling', 'dinner', 'lunch', 'breakfast',
]);

const ASIAN = new Set(['chinese', 'japanese', 'korean', 'indian']);

export function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  error.expose = true;
  return error;
}

function unique(values) {
  return [...new Set(values)];
}

export function normalizeDietaryList(value, { allowEmpty = true } = {}) {
  if (value == null || value === '') return [];
  const parts = Array.isArray(value) ? value : [value];
  const tags = [];
  for (const part of parts) {
    if (typeof part !== 'string') {
      throw httpError(400, 'Dietary preferences must be strings.');
    }
    for (const piece of part.split(',')) {
      const tag = piece.trim().toLowerCase();
      if (!tag) continue;
      if (!KNOWN.has(tag)) {
        throw httpError(400, `Unknown dietary preference "${tag}". Use: ${KNOWN_DIETARY.join(', ')}.`);
      }
      tags.push(tag);
    }
  }
  const deduped = unique(tags);
  if (!allowEmpty && deduped.length === 0) return [];
  if (deduped.length > 8) throw httpError(400, 'Choose up to 8 dietary preferences.');
  return deduped;
}

export function readPositiveInt(value, label) {
  let number = value;
  if (typeof number === 'string' && /^[1-9]\d*$/.test(number)) number = Number(number);
  if (!Number.isInteger(number) || number <= 0 || number > 1_000_000) {
    throw httpError(400, `${label} must be a positive whole number.`);
  }
  return number;
}

const CLIENT_TOKEN = /^[A-Za-z0-9_-]{16,64}$/;

export function readClientToken(value) {
  if (typeof value !== 'string' || !CLIENT_TOKEN.test(value)) {
    throw httpError(400, 'Favorites require a client id from this browser.');
  }
  return value;
}

export function readBudget(value) {
  if (value == null || value === '') return null;
  const number = typeof value === 'number' ? value : typeof value === 'string' ? Number(value.trim()) : NaN;
  if (!Number.isFinite(number) || number < 0 || number > 200) {
    throw httpError(400, 'maxBudget must be a number from 0 to 200.');
  }
  return Math.round(number * 100) / 100;
}

export function normalizeRecommendationRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw httpError(400, 'Request body must be a JSON object.');
  }
  if (typeof body.prompt !== 'string' || !body.prompt.trim()) {
    throw httpError(400, 'Tell us what you want to eat in the prompt field.');
  }
  const prompt = body.prompt.trim();
  if (prompt.length > 500) throw httpError(400, 'Prompt must be 500 characters or fewer.');
  return {
    prompt,
    maxBudget: readBudget(body.maxBudget),
    dietaryPreferences: normalizeDietaryList(body.dietaryPreferences),
  };
}

export function interpretPrompt(prompt) {
  const hardDietary = [];
  for (const rule of PROMPT_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(prompt))) hardDietary.push(rule.tag);
  }

  let mentionedBudget = null;
  const money = prompt.match(/\b(?:under|below|less than|at most|max(?:imum)?(?: of)?)\s*\$?\s*(\d+(?:\.\d{1,2})?)/i);
  if (money) mentionedBudget = Math.round(Number(money[1]) * 100) / 100;

  const cuisines = new Set();
  const cuisineWords = [
    ['chinese', /\bchinese\b|\bsichuan\b|\bdumpling\b/i],
    ['japanese', /\bjapanese\b|\bsushi\b|\bramen\b|\bpoke\b|\budon\b/i],
    ['korean', /\bkorean\b|\bkimchi\b|\bbibimbap\b|\bbulgogi\b/i],
    ['mexican', /\bmexican\b|\btaco\b|\bburrito\b/i],
    ['italian', /\bitalian\b|\bpasta\b|\bpizza\b|\brissotto\b/i],
    ['american', /\bamerican\b|\bburger\b/i],
    ['indian', /\bindian\b|\bcurry\b|\bmasala\b|\bdal\b/i],
    ['mediterranean', /\bmediterranean\b|\bfalafel\b|\bshawarma\b/i],
  ];
  for (const [cuisine, pattern] of cuisineWords) {
    if (pattern.test(prompt)) cuisines.add(cuisine);
  }

  const keywords = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3 && !STOP_WORDS.has(word));

  return {
    hardDietary: unique(hardDietary),
    mentionedBudget,
    spicy: /\bspicy\b|\bhot\b|\bchili\b|\bfiery\b/i.test(prompt),
    mild: /\bmild\b|\bnot spicy\b|\bno spice\b/i.test(prompt),
    highProtein: /high[-\s]?protein|\bprotein\b/i.test(prompt),
    light: /not too heavy|\blighter\b|\blight\b|\bnot heavy\b/i.test(prompt),
    asian: /\basian\b/i.test(prompt),
    asianCuisines: ASIAN,
    cuisines: [...cuisines],
    keywords: unique(keywords),
  };
}

export function stricterBudget(explicitBudget, mentionedBudget) {
  const caps = [explicitBudget, mentionedBudget].filter((value) => value != null && Number.isFinite(value));
  if (!caps.length) return null;
  return Math.min(...caps);
}
