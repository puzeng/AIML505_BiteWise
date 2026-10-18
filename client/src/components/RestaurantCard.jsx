import { Link } from 'react-router-dom';
import { FoodVisual } from './FoodVisual.jsx';

export function RestaurantCard({ restaurant }) {
  return (
    <Link
      to={`/explore?restaurantId=${restaurant.id}`}
      className="flex flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-ink/10 transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral"
    >
      <FoodVisual cuisine={restaurant.cuisine} name={restaurant.name} className="h-36" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-coral">Sample kitchen</p>
        <h3 className="font-serif text-2xl leading-tight">{restaurant.name}</h3>
        <p className="text-sm leading-6 text-bark">{restaurant.description}</p>
      </div>
    </Link>
  );
}
