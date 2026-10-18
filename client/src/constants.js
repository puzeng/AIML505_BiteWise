export const DIETARY_OPTIONS = [
  { id: 'dairy-free', label: 'Dairy-free' },
  { id: 'gluten-free', label: 'Gluten-free' },
  { id: 'nut-free', label: 'Nut-free' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'pescatarian', label: 'Pescatarian' },
  { id: 'high-protein', label: 'High-protein' },
  { id: 'light', label: 'Light' },
];

export const CUISINE_BLURBS = {
  Chinese: 'Chili oil, ginger, and weeknight noodles.',
  Japanese: 'Rice bowls, miso, and a spicy tuna roll.',
  Korean: 'Bulgogi, bibimbap, and a crisp pancake.',
  Mexican: 'Tacos, tinga, and a lime-cured shrimp plate.',
  Italian: 'Marinara, risotto, and a lemon chicken plate.',
  American: 'A grill menu: burgers, chili, and a salad.',
  Indian: 'Masala, dal, and a yogurt-roasted cauliflower.',
  Mediterranean: 'Shawarma, falafel, and a feta salad.',
};

export function formatPrice(price) {
  return `$${Number(price).toFixed(2)}`;
}

export function spiceLabel(level) {
  return ['No spice', 'Mild', 'Medium', 'Spicy', 'Hot', 'Very hot'][level] || 'Unlisted';
}
