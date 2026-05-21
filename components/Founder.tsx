import Link from 'next/link';
import Reveal from './Reveal';
import { founderLinks } from '@/content/projects';

export default function Founder() {
  return (
    <section id="experience" className="section">
      <div className="mb-8">
        <p className="eyebrow mb-3">Experience</p>
        <h2 className="h-section">Founder</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {founderLinks.map((l, i) => {
          const Inner = (
            <article className="group relative h-full rounded-2xl border border-ink-100 bg-surface p-6 transition-shadow hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <h3 className="font-serif text-xl text-ink-900 tracking-tight mb-2">
                {l.name}
              </h3>
              <p className="text-[15px] leading-relaxed text-ink-700">
                {l.blurb}
              </p>
              <span className="mt-4 inline-block text-sm text-accent group-hover:underline">
                {l.external ? 'Visit →' : 'See more →'}
              </span>
            </article>
          );

          return (
            <Reveal key={l.name} delay={i * 80} as="div">
              {l.external ? (
                <a
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block h-full"
                >
                  {Inner}
                </a>
              ) : (
                <Link href={l.href} className="block h-full">
                  {Inner}
                </Link>
              )}
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
