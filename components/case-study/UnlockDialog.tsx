'use client';

import { useEffect, useRef } from 'react';
import UnlockForm from '@/components/case-study/UnlockForm';
import { deckPath } from '@/lib/case-crypto';

/** Modal password prompt for one deck. On success it goes to the deck's page. */
export default function UnlockDialog({
  slug,
  title,
  onClose,
}: {
  slug: string;
  title: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        // A click on the backdrop lands on the dialog element itself.
        if (e.target === ref.current) ref.current?.close();
      }}
      aria-labelledby={`unlock-${slug}-title`}
      className="w-[calc(100vw-2rem)] max-w-md rounded-lg border border-ink-200 bg-bg p-0 text-ink-800 backdrop:bg-black/70"
    >
      <div className="p-6 sm:p-8">
        <p className="eyebrow mb-3">Protected</p>
        <h2 id={`unlock-${slug}-title`} className="mb-5 text-2xl font-semibold tracking-tight text-ink-900">
          {title}
        </h2>
        <UnlockForm slug={slug} onUnlock={() => window.location.assign(deckPath(slug))} />
        <button
          type="button"
          onClick={() => ref.current?.close()}
          className="mt-6 text-[15px] text-ink-600 underline underline-offset-4 hover:text-ink-900"
        >
          Cancel
        </button>
      </div>
    </dialog>
  );
}
