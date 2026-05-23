import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import Reveal from '@/components/Reveal';
import { apps, highlights } from '@/content/my-work';
import { asset } from '@/lib/asset';

export const metadata = {
  title: 'My Work — James Kocher',
  description:
    'Apps and platforms I’ve built and shipped: Ring, RoboKiller, TextKiller, SwitchUp, LocusNOC.',
};

export default function MyWorkPage() {
  return (
    <>
      <Nav />
      <main>
        <section className="section pt-14 sm:pt-20 pb-2 sm:pb-3">
          <Reveal>
            <p className="eyebrow mb-4">Portfolio</p>
            <h1 className="h-display mb-6">My Work</h1>
            <p className="body-lg">
              A deeper look at the products I’ve built and shipped across Amazon
              | Ring, Teltech, and Locus Energy.
            </p>
          </Reveal>
        </section>

        <section className="section pt-4 sm:pt-6">
          <div className="mb-8">
            <p className="eyebrow mb-3">Apps & Platforms</p>
            <h2 className="h-section">Shipped products</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {apps.map((a, i) => (
              <Reveal
                as="article"
                key={a.name}
                delay={i * 60}
                className="group relative overflow-hidden rounded-2xl border border-ink-100 bg-surface transition-shadow hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)]"
              >
                <div className="aspect-[2/1] w-full overflow-hidden bg-white">
                  <img
                    src={asset(a.image)}
                    alt={`${a.name} screenshot`}
                    className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </div>
                <div className="p-6">
                  <h3 className="font-serif text-xl text-ink-900 tracking-tight mb-2">
                    {a.name}
                  </h3>
                  <p className="text-[15px] leading-relaxed text-ink-700 mb-3">
                    {a.blurb}
                  </p>
                  <p className="text-sm text-ink-600 italic mb-4">{a.scope}</p>
                  <a
                    href={a.link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-accent hover:underline"
                  >
                    {a.link.label} →
                  </a>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="section pt-4 sm:pt-6">
          <div className="mb-8">
            <p className="eyebrow mb-3">Highlights</p>
            <h2 className="h-section">Notable launches</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {highlights.map((h, i) => (
              <Reveal
                as="article"
                key={h.name}
                delay={i * 60}
                className="group relative overflow-hidden rounded-2xl border border-ink-100 bg-surface transition-shadow hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)]"
              >
                <div className="aspect-[2/1] w-full overflow-hidden bg-white">
                  <img
                    src={asset(h.image)}
                    alt={`${h.name} preview`}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </div>
                <div className="p-6">
                  <h3 className="font-serif text-xl text-ink-900 tracking-tight mb-2">
                    {h.name}
                  </h3>
                  <p className="text-[15px] leading-relaxed text-ink-700 mb-3">
                    {h.blurb}
                  </p>
                  <p className="text-sm text-ink-600 italic mb-4">
                    Scope: {h.scope}
                  </p>
                  <a
                    href={h.link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-accent hover:underline"
                  >
                    {h.link.label} →
                  </a>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
