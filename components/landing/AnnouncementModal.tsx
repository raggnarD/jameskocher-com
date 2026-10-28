'use client';

import { useCallback, useEffect, useState } from 'react';
import { announcement } from '@/content/landing';
import LaunchModal from '@/components/LaunchModal';

/**
 * Opens the current launch's modal on every load of the landing page.
 * Opens after hydration, so nothing is in the static HTML.
 */
export default function AnnouncementModal() {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (announcement) setOpen(true);
  }, []);

  if (!announcement) return null;
  return <LaunchModal launch={announcement} open={open} onClose={close} />;
}
