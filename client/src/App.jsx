import { Link, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout.jsx';
import { CheckoutPage } from './pages/Checkout.jsx';
import { ExplorePage } from './pages/Explore.jsx';
import { FavoritesPage } from './pages/Favorites.jsx';
import { HomePage } from './pages/Home.jsx';
import { MealDetailPage } from './pages/MealDetail.jsx';
import { RecommendationsPage } from './pages/Recommendations.jsx';

function NotFoundPage() {
  return (
    <div className="rounded-3xl bg-white px-6 py-12 text-center ring-1 ring-ink/10">
      <h1 className="font-serif text-4xl">That page is not on the menu</h1>
      <p className="mt-3 text-bark">The link does not match a BiteWise page.</p>
      <Link to="/" className="mt-6 inline-flex font-semibold text-coral-dark">Back home</Link>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="explore" element={<ExplorePage />} />
        <Route path="recommendations" element={<RecommendationsPage />} />
        <Route path="favorites" element={<FavoritesPage />} />
        <Route path="meals/:id" element={<MealDetailPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
