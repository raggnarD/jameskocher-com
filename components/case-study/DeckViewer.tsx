'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import UnlockForm from '@/components/case-study/UnlockForm';
import { openWithStoredKey } from '@/lib/case-crypto';

// The deck is a complete HTML document, so it replaces this page rather than sitting inside it.
function show(html: string) {
  document.open();
  document.write(html);
  document.close();
}

/** Opens the deck straight away if this tab already unlocked it; otherwise asks for the password. */
export default function DeckViewer({ slug, title }: { slug: string; title: string }) {
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    openWithStoredKey(slug)
      .catch(() => null)
      .then((html) => {
        if (cancelled) return;
        if (html === null) setLocked(true);
        else show(html);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (!locked) return null;

  return (
    <section className="section pt-14 sm:pt-20">
      <p className="eyebrow mb-4">Protected</p>
      <h1 className="h-display mb-6">{title}</h1>
      <UnlockForm slug={slug} onUnlock={show} />
      <p className="mt-8 text-[15px]">
        <Link href="/case-study/" className="text-ink-600 underline underline-offset-4 hover:text-ink-900">
          All case studies
        </Link>
      </p>
    </section>
  );
}
