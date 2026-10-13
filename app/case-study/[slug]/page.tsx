import { notFound } from 'next/navigation';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import DeckViewer from '@/components/case-study/DeckViewer';
import { caseStudies } from '@/content/case-studies';

export const dynamicParams = false;

export function generateStaticParams() {
  return caseStudies.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const study = caseStudies.find((c) => c.slug === slug);
  return {
    title: study ? `${study.title} — James Kocher` : 'Case Study — James Kocher',
    robots: { index: false, follow: false },
  };
}

export default async function CaseStudyDeckPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const study = caseStudies.find((c) => c.slug === slug);
  if (!study) notFound();

  return (
    <>
      <Nav />
      <main>
        <DeckViewer slug={study.slug} title={study.title} />
      </main>
      <Footer />
    </>
  );
}
