import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getRestaurants } from '../api.js';
import { RestaurantCard } from '../components/RestaurantCard.jsx';
import { Button, ErrorBlock } from '../components/Ui.jsx';
import { CUISINE_BLURBS } from '../constants.js';

const EXAMPLES = [
  'Spicy Asian food that is high in protein and dairy-free',
  'Light vegetarian dinner under $15',
  'Comforting noodles, not too heavy',
];

const STEPS = [
  {
    title: 'Say it plainly',
    body: 'Spice, budget, a cuisine, or a “not too heavy” note. The same kind of sentence you would text a friend.',
  },
  {
    title: 'Filters run first',
    body: 'The server drops anything over your budget or missing a dietary label you required. The model never sees those meals.',
  },
  {
    title: 'Then a short list',
    body: 'Gemini ranks what remains. If the key is missing or the model answer is unusable, a fallback ranker takes the same list.',
  },
];

export function HomePage() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('Spicy, high protein, under $20, and not too heavy');
  const [restaurants, setRestaurants] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    getRestaurants()
      .then((data) => {
        if (!cancelled) setRestaurants(data.restaurants);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function submit(event) {
    event.preventDefault();
    const text = prompt.trim();
    if (!text) return;
    const params = new URLSearchParams({ prompt: text, maxBudget: '20', autorun: '1' });
    navigate(`/recommendations?${params.toString()}`);
  }

  const cuisines = [...new Map(restaurants.map((restaurant) => [restaurant.cuisine, restaurant])).values()];

  return (
    <div className="space-y-14">
      <section className="grid items-center gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-coral">Decision fatigue, handled</p>
          <h1 className="mt-3 max-w-xl font-serif text-5xl leading-tight text-ink sm:text-6xl">
            Tell us what you feel like eating.
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-8 text-bark">
            BiteWise reads a plain-language craving and only suggests meals that already exist on the sample menus. No invented dishes, no live delivery.
          </p>
          <form onSubmit={submit} className="mt-6 space-y-3">
            <label htmlFor="home-prompt" className="block text-sm font-semibold">What sounds good?</label>
            <textarea
              id="home-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              maxLength={500}
              rows={3}
              required
              className="w-full rounded-3xl border border-ink/10 bg-white px-4 py-4 text-base leading-7 shadow-sm"
            />
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setPrompt(example)}
                  className="rounded-full bg-white px-3 py-2 text-left text-sm ring-1 ring-ink/10 hover:bg-sand"
                >
                  {example}
                </button>
              ))}
            </div>
            <Button type="submit" className="px-6">Find meals</Button>
          </form>
        </div>
        <ol className="space-y-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="rounded-3xl bg-white p-5 ring-1 ring-ink/10">
              <p className="text-sm font-semibold text-coral">0{index + 1}</p>
              <h2 className="mt-1 font-serif text-2xl">{step.title}</h2>
              <p className="mt-2 text-sm leading-6 text-bark">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 className="font-serif text-4xl">Popular cuisines</h2>
        </div>
        {error ? <ErrorBlock>{error}</ErrorBlock> : null}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {cuisines.map((restaurant) => (
            <Link
              key={restaurant.cuisine}
              to={`/explore?cuisine=${encodeURIComponent(restaurant.cuisine)}`}
              className="rounded-3xl bg-white p-4 ring-1 ring-ink/10 hover:bg-cream"
            >
              <p className="font-serif text-2xl">{restaurant.cuisine}</p>
              <p className="mt-2 text-sm leading-6 text-bark">{CUISINE_BLURBS[restaurant.cuisine] || restaurant.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-serif text-4xl">Featured sample kitchens</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {restaurants.slice(0, 4).map((restaurant) => (
            <RestaurantCard key={restaurant.id} restaurant={restaurant} />
          ))}
        </div>
      </section>
    </div>
  );
}
