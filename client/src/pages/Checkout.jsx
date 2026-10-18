import { Link } from 'react-router-dom';
import { Button, StatusBlock } from '../components/Ui.jsx';
import { formatPrice } from '../constants.js';
import { useCart } from '../context/CartContext.jsx';

export function CheckoutPage() {
  const { items, subtotal, notice, setQuantity, finishSampleCheckout } = useCart();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-5xl">Sample checkout</h1>
        <p className="mt-3 max-w-2xl leading-7 text-bark">
          This summary stays on your machine. There is no payment, no order, and no restaurant receives anything.
        </p>
      </div>
      {notice ? <StatusBlock title="Checkout noted">{notice}</StatusBlock> : null}
      {items.length === 0 && !notice ? (
        <StatusBlock
          title="Your sample cart is empty"
          action={<Link to="/explore" className="font-semibold text-coral-dark">Browse meals</Link>}
        >
          Add a meal from its detail page when you want to see a checkout summary.
        </StatusBlock>
      ) : null}
      {items.length > 0 ? (
        <div className="space-y-4 rounded-3xl bg-white p-5 ring-1 ring-ink/10">
          <ul className="divide-y divide-ink/10">
            {items.map((item) => (
              <li key={item.menuItemId} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-sm text-bark">{item.restaurantName} · sample price {formatPrice(item.price)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" className="min-h-11 min-w-11 rounded-full ring-1 ring-ink/10" aria-label={`Decrease ${item.name}`} onClick={() => setQuantity(item.menuItemId, item.quantity - 1)}>-</button>
                  <span className="w-8 text-center">{item.quantity}</span>
                  <button type="button" className="min-h-11 min-w-11 rounded-full ring-1 ring-ink/10" aria-label={`Increase ${item.name}`} onClick={() => setQuantity(item.menuItemId, item.quantity + 1)}>+</button>
                  <p className="w-20 text-right font-semibold">{formatPrice(item.price * item.quantity)}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-ink/10 pt-4">
            <p className="font-semibold">Sample subtotal</p>
            <p className="text-2xl font-semibold text-coral">{formatPrice(subtotal)}</p>
          </div>
          <p className="text-sm leading-6 text-bark">Tax, delivery fees, and payment are not part of this prototype.</p>
          <Button onClick={finishSampleCheckout}>Finish sample checkout</Button>
        </div>
      ) : null}
    </div>
  );
}
