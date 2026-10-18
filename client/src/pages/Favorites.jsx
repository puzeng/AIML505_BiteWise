import { Link } from 'react-router-dom';
import { MealCard } from '../components/MealCard.jsx';
import { Button, ErrorBlock, StatusBlock } from '../components/Ui.jsx';
import { useFavorites } from '../context/FavoritesContext.jsx';

export function FavoritesPage() {
  const { favorites, status, error, refresh } = useFavorites();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-5xl">Favorites</h1>
        <p className="mt-3 max-w-2xl leading-7 text-bark">
          Meals saved for this demo profile. There is one local user and no account. A meal can be saved only once.
        </p>
      </div>
      {status === 'loading' ? <StatusBlock title="Loading saved meals">Checking the local sample database.</StatusBlock> : null}
      {status === 'error' ? <ErrorBlock onRetry={refresh}>{error}</ErrorBlock> : null}
      {status === 'ready' && favorites.length === 0 ? (
        <StatusBlock
          title="No saved meals yet"
          action={<Link to="/explore" className="font-semibold text-coral-dark underline-offset-4 hover:underline">Explore the sample menus</Link>}
        >
          Save a meal from Explore or from a meal page. It stays saved for this browser until you remove it.
        </StatusBlock>
      ) : null}
      {status === 'ready' && favorites.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {favorites.map((favorite) => (
            <div key={favorite.id} className="space-y-2">
              <MealCard item={favorite.menuItem} />
              <p className="px-2 text-xs text-bark">Saved {favorite.createdAt} UTC</p>
            </div>
          ))}
        </div>
      ) : null}
      {status === 'ready' ? (
        <Button variant="ghost" onClick={refresh}>Refresh saved meals</Button>
      ) : null}
    </div>
  );
}
