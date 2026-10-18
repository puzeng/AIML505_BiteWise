import { Link } from 'react-router-dom';
import { formatPrice, spiceLabel } from '../constants.js';
import { useFavorites } from '../context/FavoritesContext.jsx';
import { FoodVisual } from './FoodVisual.jsx';
import { TagList } from './Ui.jsx';

export function SaveButton({ menuItemId, className = '' }) {
  const { isSaved, toggle, pendingIds } = useFavorites();
  const saved = isSaved(menuItemId);
  const pending = pendingIds.has(menuItemId);
  return (
    <button
      type="button"
      aria-pressed={saved}
      disabled={pending}
      onClick={() => toggle(menuItemId)}
      className={`inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold ring-1 ring-ink/10 transition hover:bg-sand disabled:opacity-50 ${saved ? 'bg-coral text-white ring-coral' : 'bg-white text-ink'} ${className}`}
    >
      {pending ? 'Saving…' : saved ? 'Saved' : 'Save'}
    </button>
  );
}

export function MealCard({ item }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-3xl bg-white shadow-[0_18px_40px_-32px_rgba(36,28,24,0.7)] ring-1 ring-ink/10">
      <Link to={`/meals/${item.id}`} className="block rounded-3xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral">
        <FoodVisual cuisine={item.restaurant.cuisine} name={item.name} className="h-40" />
        <div className="flex flex-1 flex-col gap-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-serif text-2xl leading-tight">{item.name}</h3>
            <p className="shrink-0 text-right">
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-bark">Sample price</span>
              <span className="text-lg font-semibold text-coral">{formatPrice(item.price)}</span>
            </p>
          </div>
          <p className="text-sm text-bark">{item.restaurant.name} · {spiceLabel(item.spiceLevel)}</p>
          <p className="line-clamp-2 text-sm leading-6 text-ink/80">{item.description}</p>
          <TagList tags={item.dietaryTags} />
        </div>
      </Link>
      <div className="flex items-center justify-between gap-3 px-4 pb-4">
        <Link to={`/meals/${item.id}`} className="text-sm font-semibold text-coral-dark underline-offset-4 hover:underline">
          Meal details
        </Link>
        <SaveButton menuItemId={item.id} />
      </div>
    </article>
  );
}
