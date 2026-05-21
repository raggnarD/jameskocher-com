import Link from 'next/link';
import Reveal from './Reveal';
import { projects } from '@/content/projects';

export default function Projects() {
  return (
    <section id="projects" className="section">
      <div className="mb-8">
        <p className="eyebrow mb-3">Projects</p>
        <h2 className="h-section">Things I’ve built</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {projects.map((p, i) => {
          const Inner = (
            <article className="group relative h-full rounded-2xl border border-ink-100 bg-surface p-6 transition-shadow hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <h3 className="font-serif text-xl text-ink-900 tracking-tight mb-2">
                {p.name}
              </h3>
              <p className="text-[15px] leading-relaxed text-ink-700">
                {p.blurb}
              </p>
              <span className="mt-4 inline-block text-sm text-accent group-hover:underline">
                {p.external ? 'Visit →' : 'Open →'}
              </span>
            </article>
          );

          return (
            <Reveal key={p.name} delay={i * 80} as="div">
              {p.external ? (
                <a
                  href={p.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block h-full"
                >
                  {Inner}
                </a>
              ) : (
                <Link href={p.href} className="block h-full">
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
