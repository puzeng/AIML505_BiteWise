import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { useFavorites } from '../context/FavoritesContext.jsx';

const LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/explore', label: 'Explore' },
  { to: '/recommendations', label: 'AI Recommendations' },
  { to: '/favorites', label: 'Favorites' },
];

function linkClass({ isActive }) {
  return `inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold ${isActive ? 'bg-ink text-white' : 'text-ink hover:bg-sand'}`;
}

export function Layout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { count } = useCart();
  const { favorites, error } = useFavorites();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.search]);

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="skip-link">Skip to content</a>
      <header className="sticky top-0 z-30 border-b border-ink/10 bg-cream/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
          <NavLink to="/" className="flex min-w-0 items-center gap-2 font-serif text-lg sm:text-xl" aria-label="BiteWise AI home">
            <svg viewBox="0 0 32 32" className="h-9 w-9 shrink-0" aria-hidden="true">
              <rect width="32" height="32" rx="10" fill="#c2410c" />
              <path d="M8 14h16c0 6.2-3.6 10-8 10s-8-3.8-8-10z" fill="#fff8f3" />
              <path d="M12 14c.4-3 1.8-5 4-5s3.6 2 4 5" fill="none" stroke="#fff8f3" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <span className="truncate">BiteWise <span className="text-coral">AI</span></span>
          </NavLink>
          <nav className="ml-auto hidden items-center gap-1 lg:flex" aria-label="Primary">
            {LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} className={linkClass}>
                {link.label}
                {link.to === '/favorites' ? ` (${favorites.length})` : ''}
              </NavLink>
            ))}
          </nav>
          <NavLink to="/checkout" aria-label={`Sample cart, ${count} items`} className="ml-auto inline-flex min-h-11 shrink-0 items-center rounded-full bg-white px-3 text-sm font-semibold ring-1 ring-ink/10 lg:ml-2">
            Cart ({count})
          </NavLink>
          <button
            type="button"
            className="inline-flex min-h-11 shrink-0 items-center rounded-full px-3 text-sm font-semibold ring-1 ring-ink/10 lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((value) => !value)}
          >
            Menu
          </button>
        </div>
        {open ? (
          <nav id="mobile-nav" className="flex flex-col gap-1 border-t border-ink/10 px-4 py-3 lg:hidden" aria-label="Primary mobile">
            {LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} className={linkClass}>
                {link.label}
                {link.to === '/favorites' ? ` (${favorites.length})` : ''}
              </NavLink>
            ))}
          </nav>
        ) : null}
      </header>
      <p className="bg-[#fff4e8] px-4 py-2 text-center text-sm text-ink">
        Fictional sample restaurants and prices. BiteWise does not place orders, charge cards, or track a driver.
      </p>
      {error ? (
        <p className="bg-red-50 px-4 py-2 text-center text-sm text-red-900" role="status">{error}</p>
      ) : null}
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-ink/10 px-4 py-6 text-center text-sm text-bark">
        BiteWise AI is a university capstone prototype. Menu labels are sample data, not allergen or nutrition advice.
      </footer>
    </div>
  );
}
