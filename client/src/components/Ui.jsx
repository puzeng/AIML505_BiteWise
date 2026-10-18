export function Button({ variant = 'primary', className = '', type = 'button', ...props }) {
  const styles = {
    primary: 'bg-coral text-white hover:bg-coral-dark',
    secondary: 'bg-white text-ink ring-1 ring-ink/10 hover:bg-sand',
    ghost: 'bg-transparent text-ink hover:bg-sand',
  }[variant];
  return (
    <button
      type={type}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
      {...props}
    />
  );
}

export function TagList({ tags }) {
  if (!tags?.length) return <p className="text-sm text-bark">No dietary labels on this sample item.</p>;
  return (
    <ul className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <li key={tag} className="rounded-full bg-sand px-2.5 py-1 text-xs font-medium text-ink">
          {tag}
        </li>
      ))}
    </ul>
  );
}

export function StatusBlock({ title, children, action }) {
  return (
    <div className="rounded-3xl bg-white px-6 py-10 text-center ring-1 ring-ink/10" role="status">
      <h2 className="font-serif text-3xl text-ink">{title}</h2>
      <div className="mx-auto mt-3 max-w-lg text-sm leading-6 text-bark">{children}</div>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function ErrorBlock({ title = 'Something went wrong', children, onRetry }) {
  return (
    <div className="rounded-3xl bg-white px-6 py-10 text-center ring-1 ring-red-200" role="alert">
      <h2 className="font-serif text-3xl text-ink">{title}</h2>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-bark">{children}</p>
      {onRetry ? (
        <Button className="mt-6" onClick={onRetry}>Try again</Button>
      ) : null}
    </div>
  );
}

export function SkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="h-72 animate-pulse rounded-3xl bg-white ring-1 ring-ink/5" />
      ))}
    </div>
  );
}
