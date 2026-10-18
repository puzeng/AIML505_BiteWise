import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getMenuItem } from '../api.js';
import { FoodVisual } from '../components/FoodVisual.jsx';
import { SaveButton } from '../components/MealCard.jsx';
import { Button, ErrorBlock, StatusBlock, TagList } from '../components/Ui.jsx';
import { formatPrice, spiceLabel } from '../constants.js';
import { useCart } from '../context/CartContext.jsx';

export function MealDetailPage() {
  const { id } = useParams();
  const { addItem } = useCart();
  const [item, setItem] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [added, setAdded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setAdded(false);
    getMenuItem(id)
      .then((data) => {
        if (cancelled) return;
        setItem(data.item);
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
  }, [id]);

  if (status === 'loading') return <StatusBlock title="Loading this meal">Pulling the sample menu row.</StatusBlock>;
  if (status === 'error') {
    return (
      <ErrorBlock title="Meal unavailable">
        {error} <Link to="/explore" className="font-semibold text-coral-dark">Back to Explore</Link>
      </ErrorBlock>
    );
  }

  return (
    <article className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <FoodVisual cuisine={item.restaurant.cuisine} name={item.name} className="min-h-64 rounded-3xl" />
      <div className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-coral">{item.restaurant.cuisine} · sample kitchen</p>
        <h1 className="font-serif text-5xl leading-tight">{item.name}</h1>
        <p className="text-bark">{item.restaurant.name}</p>
        <p>
          <span className="text-xs font-semibold uppercase tracking-wide text-bark">Sample price</span>
          <span className="mt-1 block text-3xl font-semibold text-coral">{formatPrice(item.price)}</span>
        </p>
        <p className="leading-7">{item.description}</p>
        <p className="text-sm font-semibold">{spiceLabel(item.spiceLevel)} · spice {item.spiceLevel} of 5</p>
        <div>
          <h2 className="text-sm font-semibold">Ingredients on the sample menu</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
            {item.ingredients.map((ingredient) => <li key={ingredient}>{ingredient}</li>)}
          </ul>
        </div>
        <div>
          <h2 className="mb-2 text-sm font-semibold">Dietary labels</h2>
          <TagList tags={item.dietaryTags} />
        </div>
        <p className="text-sm leading-6 text-bark">{item.restaurant.description}</p>
        <p className="text-sm leading-6 text-bark">
          These ingredients and dietary labels are sample menu text. They are not a lab test, and a missing label does not mean the meal is free of that ingredient.
        </p>
        <div className="flex flex-wrap gap-3">
          <SaveButton menuItemId={item.id} />
          <Button
            onClick={() => {
              addItem(item);
              setAdded(true);
            }}
          >
            {added ? 'Added to sample cart' : 'Add to sample cart'}
          </Button>
          <Link to="/explore" className="inline-flex min-h-11 items-center text-sm font-semibold text-coral-dark">Back to Explore</Link>
        </div>
      </div>
    </article>
  );
}
