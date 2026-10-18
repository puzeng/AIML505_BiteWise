const CLIENT_KEY = 'bitewise-client';

export function getClientToken() {
  let token = localStorage.getItem(CLIENT_KEY);
  if (!token || !/^[A-Za-z0-9_-]{16,64}$/.test(token)) {
    token = crypto.randomUUID().replaceAll('-', '');
    localStorage.setItem(CLIENT_KEY, token);
  }
  return token;
}

function withClient(options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('x-bitewise-client', getClientToken());
  return { ...options, headers };
}

async function request(path, options) {
  let response;
  try {
    response = await fetch(`/api${path}`, options);
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new Error('The menu service did not respond. Start the API and try again.');
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.error || 'The request could not be completed.');
  }
  return data;
}

export function getHealth() {
  return request('/health');
}

export function getRestaurants() {
  return request('/restaurants');
}

export function getMenu(filters = {}) {
  const params = new URLSearchParams();
  if (filters.cuisine) params.set('cuisine', filters.cuisine);
  if (filters.maxBudget !== '' && filters.maxBudget != null) params.set('maxBudget', String(filters.maxBudget));
  if (filters.dietary?.length) params.set('dietary', filters.dietary.join(','));
  if (filters.restaurantId) params.set('restaurantId', String(filters.restaurantId));
  const query = params.toString();
  return request(`/menu${query ? `?${query}` : ''}`);
}

export function getMenuItem(id) {
  return request(`/menu/${id}`);
}

export function getFavorites() {
  return request('/favorites', withClient());
}

export function createFavorite(menuItemId) {
  return request('/favorites', withClient({
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ menuItemId }),
  }));
}

export function removeFavorite(id) {
  return request(`/favorites/${id}`, withClient({ method: 'DELETE' }));
}

export function getRecommendations(payload, signal) {
  return request('/recommendations', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });
}
