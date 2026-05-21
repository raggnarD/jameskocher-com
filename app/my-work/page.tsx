import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import Reveal from '@/components/Reveal';
import { apps, roles, highlights } from '@/content/my-work';

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
        <section className="section pt-14 sm:pt-20">
          <Reveal>
            <p className="eyebrow mb-4">Portfolio</p>
            <h1 className="h-display mb-6">My Work</h1>
            <p className="body-lg max-w-readable">
              A deeper look at the products I’ve built and shipped across Amazon
              | Ring, Teltech, and Locus Energy.
            </p>
          </Reveal>
        </section>

        <section className="section">
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
                className="group relative rounded-2xl border border-ink-100 bg-surface p-6 transition-shadow hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
              >
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
              </Reveal>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="mb-8">
            <p className="eyebrow mb-3">Roles</p>
            <h2 className="h-section">Professional history</h2>
          </div>
          <ul className="space-y-6">
            {roles.map((r) => (
              <li
                key={r.company}
                className="rounded-2xl border border-ink-100 bg-surface p-6"
              >
                <h3 className="font-serif text-lg text-ink-900 tracking-tight mb-2">
                  {r.company}
                </h3>
                <ul className="text-[15px] text-ink-700 space-y-1">
                  {r.titles.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>

        <section className="section">
          <div className="mb-8">
            <p className="eyebrow mb-3">Highlights</p>
            <h2 className="h-section">Notable launches</h2>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {highlights.map((h) => (
              <li
                key={h}
                className="rounded-xl border border-ink-100 bg-surface p-4 text-[15px] text-ink-800"
              >
                {h}
              </li>
            ))}
          </ul>
        </section>
      </main>
      <Footer />
    </>
  );
}
