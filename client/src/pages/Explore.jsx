import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getMenu, getRestaurants } from '../api.js';
import { MealCard } from '../components/MealCard.jsx';
import { RestaurantCard } from '../components/RestaurantCard.jsx';
import { Button, ErrorBlock, SkeletonGrid, StatusBlock } from '../components/Ui.jsx';
import { DIETARY_OPTIONS } from '../constants.js';

function readDietary(params) {
  return (params.get('dietary') || '').split(',').map((tag) => tag.trim()).filter(Boolean);
}

export function ExplorePage() {
  const [params, setParams] = useSearchParams();
  const cuisine = params.get('cuisine') || '';
  const maxBudget = params.get('maxBudget') || '';
  const restaurantId = params.get('restaurantId') || '';
  const dietary = readDietary(params);
  const [restaurants, setRestaurants] = useState([]);
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const draftRef = useRef(null);

  function update(next) {
    const merged = {
      cuisine,
      maxBudget,
      restaurantId,
      dietary: dietary.join(','),
      ...draftRef.current,
      ...next,
    };
    draftRef.current = merged;
    const nextParams = new URLSearchParams();
    if (merged.cuisine) nextParams.set('cuisine', merged.cuisine);
    if (merged.maxBudget) nextParams.set('maxBudget', merged.maxBudget);
    if (merged.restaurantId) nextParams.set('restaurantId', merged.restaurantId);
    if (merged.dietary) nextParams.set('dietary', merged.dietary);
    setParams(nextParams);
  }

  useEffect(() => {
    draftRef.current = null;
  }, [cuisine, maxBudget, restaurantId, params]);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setError('');
    Promise.all([
      getRestaurants(),
      getMenu({
        cuisine,
        maxBudget,
        dietary,
        restaurantId,
      }),
    ])
      .then(([restaurantData, menuData]) => {
        if (cancelled) return;
        setRestaurants(restaurantData.restaurants);
        setItems(menuData.items);
        setStatus('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [cuisine, maxBudget, restaurantId, params.get('dietary')]);

  const cuisines = [...new Set(restaurants.map((restaurant) => restaurant.cuisine))];
  const visibleRestaurants = restaurants.filter((restaurant) => {
    if (restaurantId && String(restaurant.id) !== restaurantId) return false;
    if (cuisine && restaurant.cuisine.toLowerCase() !== cuisine.toLowerCase()) return false;
    return true;
  });

  function toggleDiet(id) {
    const next = dietary.includes(id) ? dietary.filter((tag) => tag !== id) : [...dietary, id];
    update({ dietary: next.join(',') });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-5xl">Explore the sample menus</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-bark">
          Browse fictional kitchens and the meals on their menus. Cuisine, budget, and dietary labels narrow the meals. Prices are sample prices.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <form className="h-fit space-y-5 rounded-3xl bg-white p-4 ring-1 ring-ink/10 lg:sticky lg:top-24" onSubmit={(event) => event.preventDefault()}>
          <div>
            <label htmlFor="cuisine" className="text-sm font-semibold">Cuisine</label>
            <select
              id="cuisine"
              value={cuisine}
              onChange={(event) => update({ cuisine: event.target.value, restaurantId: '' })}
              className="mt-2 min-h-11 w-full rounded-2xl border border-ink/10 bg-cream px-3"
            >
              <option value="">All cuisines</option>
              {cuisines.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="explore-budget" className="text-sm font-semibold">Max budget</label>
            <input
              id="explore-budget"
              type="number"
              inputMode="decimal"
              min="0"
              max="200"
              step="0.25"
              value={maxBudget}
              onChange={(event) => update({ maxBudget: event.target.value })}
              placeholder="No cap"
              className="mt-2 min-h-11 w-full rounded-2xl border border-ink/10 bg-cream px-3"
            />
          </div>
          <fieldset>
            <legend className="text-sm font-semibold">Dietary labels</legend>
            <div className="mt-2 space-y-1">
              {DIETARY_OPTIONS.map((option) => (
                <label key={option.id} className="flex min-h-11 items-center gap-2 rounded-xl px-1 text-sm">
                  <input
                    type="checkbox"
                    checked={dietary.includes(option.id)}
                    onChange={() => toggleDiet(option.id)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>
          <Button variant="secondary" onClick={() => setParams(new URLSearchParams())}>Clear filters</Button>
        </form>

        <div className="space-y-8">
          {status === 'error' ? <ErrorBlock onRetry={() => setParams(new URLSearchParams(params))}>{error}</ErrorBlock> : null}
          {status === 'loading' ? <SkeletonGrid /> : null}
          {status === 'ready' ? (
            <>
              <section>
                <h2 className="mb-3 font-serif text-3xl">Restaurants</h2>
                {visibleRestaurants.length === 0 ? (
                  <StatusBlock title="No kitchens match">
                    That cuisine or kitchen is not on the sample list.
                  </StatusBlock>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {visibleRestaurants.map((restaurant) => (
                      <RestaurantCard key={restaurant.id} restaurant={restaurant} />
                    ))}
                  </div>
                )}
              </section>
              <section>
                <h2 className="mb-3 font-serif text-3xl">Menu items <span className="text-bark">({items.length})</span></h2>
                {items.length === 0 ? (
                  <StatusBlock title="No meals match">
                    Nothing on the sample menus fits those filters. Raise the budget or clear a dietary label.
                  </StatusBlock>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {items.map((item) => <MealCard key={item.id} item={item} />)}
                  </div>
                )}
              </section>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
