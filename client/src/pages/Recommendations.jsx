import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getRecommendations } from '../api.js';
import { MealCard } from '../components/MealCard.jsx';
import { Button, ErrorBlock, StatusBlock } from '../components/Ui.jsx';
import { DIETARY_OPTIONS, formatPrice } from '../constants.js';

function formFromParams(params) {
  return {
    prompt: params.get('prompt') || '',
    maxBudget: params.get('maxBudget') || '20',
    dietary: (params.get('dietary') || '').split(',').map((tag) => tag.trim()).filter(Boolean),
  };
}

function badge(result) {
  if (!result) return null;
  if (result.source === 'gemini') {
    return { text: 'Ranked by Gemini', className: 'bg-emerald-50 text-emerald-950 ring-emerald-200' };
  }
  if (result.source === 'fallback' && result.demoMode) {
    return { text: 'Demo mode · fallback ranking', className: 'bg-amber-50 text-amber-950 ring-amber-200' };
  }
  if (result.source === 'fallback') {
    return { text: 'Fallback ranking', className: 'bg-amber-50 text-amber-950 ring-amber-200' };
  }
  return { text: 'No match', className: 'bg-sand text-ink ring-ink/10' };
}

export function RecommendationsPage() {
  const [params] = useSearchParams();
  const [form, setForm] = useState(() => formFromParams(params));
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (params.get('autorun') !== '1' || !params.get('prompt')) return undefined;
    const controller = new AbortController();
    const initial = formFromParams(params);
    setForm(initial);
    run(initial, controller.signal);
    return () => controller.abort();
    // Autorun should follow the link from Home, not later edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  async function run(values, signal) {
    const prompt = values.prompt.trim();
    if (!prompt) {
      setError('Tell us what you want to eat.');
      setStatus('error');
      return;
    }
    setStatus('loading');
    setError('');
    setResult(null);
    try {
      const payload = {
        prompt,
        dietaryPreferences: values.dietary,
      };
      if (values.maxBudget !== '') payload.maxBudget = Number(values.maxBudget);
      const data = await getRecommendations(payload, signal);
      if (signal?.aborted) return;
      setResult(data);
      setStatus('ready');
    } catch (err) {
      if (signal?.aborted || err.name === 'AbortError') return;
      setError(err.message);
      setStatus('error');
    }
  }

  function onSubmit(event) {
    event.preventDefault();
    run(form);
  }

  function toggleDiet(id) {
    setForm((current) => ({
      ...current,
      dietary: current.dietary.includes(id)
        ? current.dietary.filter((tag) => tag !== id)
        : [...current.dietary, id],
    }));
  }

  const pill = badge(result);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="max-w-full font-serif text-4xl leading-tight sm:text-5xl">AI recommendations</h1>
        <p className="mt-3 max-w-2xl leading-7 text-bark">
          Describe a meal. Budget and checked dietary labels are enforced in the server before ranking. You will see whether Gemini or the fallback ranker produced the list.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5 rounded-3xl bg-white p-5 ring-1 ring-ink/10">
        <div>
          <label htmlFor="prompt" className="text-sm font-semibold">What do you want?</label>
          <textarea
            id="prompt"
            required
            maxLength={500}
            rows={4}
            value={form.prompt}
            onChange={(event) => {
              const value = event.target.value;
              setForm((current) => ({ ...current, prompt: value }));
            }}
            placeholder="I want spicy Asian food that is high in protein"
            className="mt-2 w-full rounded-3xl border border-ink/10 bg-cream px-4 py-3 leading-7"
          />
        </div>
        <div>
          <label htmlFor="maxBudget" className="text-sm font-semibold">Max budget</label>
          <input
            id="maxBudget"
            type="number"
            inputMode="decimal"
            min="0"
            max="200"
            step="0.25"
            value={form.maxBudget}
            onChange={(event) => {
              const value = event.target.value;
              setForm((current) => ({ ...current, maxBudget: value }));
            }}
            className="mt-2 min-h-11 w-full max-w-xs rounded-2xl border border-ink/10 bg-cream px-3"
          />
          <p className="mt-2 text-sm text-bark">Meals above this sample price are removed before any ranking.</p>
        </div>
        <fieldset>
          <legend className="text-sm font-semibold">Dietary labels to require</legend>
          <p className="mt-1 text-sm text-bark">A meal is eligible only when the sample menu already carries every checked label.</p>
          <div className="mt-3 grid gap-1 sm:grid-cols-2">
            {DIETARY_OPTIONS.map((option) => (
              <label key={option.id} className="flex min-h-11 items-center gap-2 rounded-xl px-1 text-sm">
                <input
                  type="checkbox"
                  checked={form.dietary.includes(option.id)}
                  onChange={() => toggleDiet(option.id)}
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
        <Button type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? 'Looking through the sample menus…' : 'Recommend meals'}
        </Button>
      </form>

      {status === 'idle' ? (
        <StatusBlock title="Ask for up to three meals">
          Try “spicy, high protein, under $20, not too heavy.” The result badge says whether Gemini ranked them or the demo fallback did.
        </StatusBlock>
      ) : null}
      {status === 'loading' ? (
        <StatusBlock title="Checking the sample menus">
          Eligible meals are filtered first. Ranking comes next.
        </StatusBlock>
      ) : null}
      {status === 'error' ? <ErrorBlock onRetry={() => run(form)}>{error}</ErrorBlock> : null}
      {status === 'ready' && result ? (
        <section className="space-y-4" aria-live="polite">
          {pill ? (
            <p className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ring-1 ${pill.className}`}>{pill.text}</p>
          ) : null}
          <p className="max-w-2xl leading-7">{result.message}</p>
          <p className="text-sm text-bark">
            {result.eligibleCount} eligible meal{result.eligibleCount === 1 ? '' : 's'}
            {result.appliedFilters.maxBudget != null ? ` at or under ${formatPrice(result.appliedFilters.maxBudget)}` : ''}.
            {result.appliedFilters.dietaryPreferences.length
              ? ` Required labels: ${result.appliedFilters.dietaryPreferences.join(', ')}.`
              : ' No dietary labels were required.'}
          </p>
          {result.matched && result.recommendations.length > 0 ? (
            <ol className="space-y-4">
              {result.recommendations.map((recommendation, index) => (
                <li key={recommendation.menuItem.id} className="grid gap-4 rounded-3xl bg-cream p-3 ring-1 ring-ink/5 lg:grid-cols-[1fr_280px]">
                  <MealCard item={recommendation.menuItem} />
                  <div className="rounded-3xl bg-white p-4 ring-1 ring-ink/10">
                    <p className="text-sm font-semibold text-coral">Why this meal · {index + 1}</p>
                    <p className="mt-2 text-sm leading-6">{recommendation.explanation}</p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <StatusBlock title="No meals matched">
              {result.message}
            </StatusBlock>
          )}
          <p className="text-sm leading-6 text-bark">{result.disclaimer}</p>
        </section>
      ) : null}
    </div>
  );
}
