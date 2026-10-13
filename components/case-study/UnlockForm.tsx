'use client';

import { useState, type FormEvent } from 'react';
import { openWithPassphrase } from '@/lib/case-crypto';

/**
 * Asks for a deck's passphrase and checks it by decrypting the deck. `onUnlock` gets the
 * decrypted HTML; the key is already stored for this tab by the time it runs.
 */
export default function UnlockForm({
  slug,
  onUnlock,
}: {
  slug: string;
  onUnlock: (html: string) => void;
}) {
  const [value, setValue] = useState('');
  const [state, setState] = useState<'idle' | 'checking' | 'wrong' | 'failed'>('idle');
  const id = `unlock-${slug}`;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!value || state === 'checking') return;
    setState('checking');
    try {
      const html = await openWithPassphrase(slug, value.trim());
      if (html === null) setState('wrong');
      else onUnlock(html);
    } catch {
      setState('failed');
    }
  }

  const message =
    state === 'wrong'
      ? 'Incorrect password.'
      : state === 'failed'
        ? 'Could not load the deck. Try again.'
        : null;

  return (
    <form onSubmit={onSubmit} className="max-w-sm">
      <label htmlFor={id} className="block text-[15px] text-ink-800 mb-2">
        Enter the password to open this case study.
      </label>
      <div className="flex gap-3">
        <input
          id={id}
          type="password"
          autoFocus
          autoComplete="off"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (state !== 'checking') setState('idle');
          }}
          aria-invalid={state === 'wrong'}
          aria-describedby={message ? `${id}-message` : undefined}
          className="flex-1 min-w-0 rounded-sm border border-ink-300 bg-surface px-3 py-2 text-[15px] text-ink-900 focus:outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={state === 'checking'}
          className="rounded-sm bg-accent px-4 py-2 text-[15px] font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {state === 'checking' ? 'Checking…' : 'Open'}
        </button>
      </div>
      {message && (
        <p id={`${id}-message`} role="alert" className="mt-3 text-[15px] text-brand">
          {message}
        </p>
      )}
    </form>
  );
}
