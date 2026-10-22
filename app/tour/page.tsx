import type { Metadata } from 'next';
import Tour from '@/components/tour/Tour';

export const metadata: Metadata = {
  title: 'Guided tour · James Kocher',
  description: 'A guided flyover of the Wilson massif, one stop for each part of jameskocher.com.',
};

export default function TourPage() {
  return <Tour />;
}
