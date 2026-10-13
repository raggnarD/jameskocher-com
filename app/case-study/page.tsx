import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import AutoCoreCard from '@/components/case-study/AutoCoreCard';

export const metadata = {
  title: 'Case Study — James Kocher',
  robots: { index: false, follow: false },
};

export default function CaseStudyPage() {
  return (
    <>
      <Nav />
      <main>
        <section className="section pt-14 sm:pt-20">
          <p className="eyebrow mb-4">Selected work</p>
          <h1 className="h-display mb-10 sm:mb-14">Case Study</h1>
          <ul className="grid gap-12 justify-items-center sm:justify-items-start sm:grid-cols-[repeat(auto-fill,minmax(280px,320px))]">
            <li className="w-full max-w-[320px]">
              <AutoCoreCard />
            </li>
          </ul>
        </section>
      </main>
      <Footer />
    </>
  );
}
