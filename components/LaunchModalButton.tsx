'use client';

import { useCallback, useState } from 'react';
import type { Launch } from '@/content/launches';
import LaunchModal from '@/components/LaunchModal';

/** "Learn more" link-styled button that opens a launch's coverage modal. */
export default function LaunchModalButton({
  launch,
  className,
}: {
  launch: Launch;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className={className}
      >
        Learn more →
      </button>
      <LaunchModal launch={launch} open={open} onClose={close} />
    </>
  );
}
