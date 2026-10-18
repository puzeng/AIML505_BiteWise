import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'bitewise-sample-cart';
const CartContext = createContext(null);

function readCart() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => (
      item
      && Number.isInteger(item.menuItemId)
      && typeof item.name === 'string'
      && Number.isFinite(item.price)
      && Number.isInteger(item.quantity)
      && item.quantity > 0
    ));
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(readCart);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const value = useMemo(() => {
    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    function addItem(item) {
      setNotice('');
      setItems((current) => {
        const existing = current.find((row) => row.menuItemId === item.id);
        if (existing) {
          return current.map((row) => (
            row.menuItemId === item.id ? { ...row, quantity: row.quantity + 1 } : row
          ));
        }
        return [...current, {
          menuItemId: item.id,
          name: item.name,
          price: item.price,
          restaurantName: item.restaurant.name,
          quantity: 1,
        }];
      });
    }

    function setQuantity(menuItemId, quantity) {
      setItems((current) => current.flatMap((row) => {
        if (row.menuItemId !== menuItemId) return [row];
        if (quantity <= 0) return [];
        return [{ ...row, quantity }];
      }));
    }

    function clear() {
      setItems([]);
    }

    function finishSampleCheckout() {
      setItems([]);
      setNotice('Sample checkout complete. No payment was taken and no restaurant was notified.');
    }

    return { items, count, subtotal, notice, addItem, setQuantity, clear, finishSampleCheckout };
  }, [items, notice]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error('useCart must be used within CartProvider');
  return value;
}
