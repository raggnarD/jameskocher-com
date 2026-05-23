import { profile } from '@/content/profile';
import { asset } from '@/lib/asset';

type CatLink = { label: string; href: string; external?: boolean };


const sections: { title: string; links: CatLink[] }[] = [
  {
    title: 'Experience',
    links: [
      { label: 'My Work', href: '/my-work/' },
      { label: 'Experience', href: '/experience/' },
    ],
  },
  {
    title: 'Projects',
    links: [
      { label: 'Netflix Resume', href: '/netflix-resume/' },
      { label: 'RPG Skills', href: '/rpg-skills/' },
      { label: 'Kids Games', href: '/kids-games/' },
      { label: 'Rushroost', href: 'https://www.rushroost.com', external: true },
    ],
  },
  {
    title: 'Founder',
    links: [
      {
        label: 'Rational Mind Studios',
        href: 'https://www.rationalmindstudios.com',
        external: true,
      },
    ],
  },
];

function LinkPill({ link }: { link: CatLink }) {
  const cls =
    'font-sans text-brand text-sm font-bold uppercase tracking-[0.22em] hover:text-white transition-colors [text-shadow:0_1px_3px_rgb(0_0_0_/_0.7)]';
  if (link.external) {
    return (
      <a href={link.href} target="_blank" rel="noopener noreferrer" className={cls}>
        {link.label}
      </a>
    );
  }
  // For both Next routes and bundled sub-sites, use a raw <a> with basePath
  // prefix. Bundled paths MUST use raw <a> (Next's <Link> would try to fetch
  // an RSC payload that doesn't exist); using raw <a> for Next routes too
  // keeps the code simple at the cost of a full page navigation (cheap for
  // a static site).
  return (
    <a href={asset(link.href)} className={cls}>
      {link.label}
    </a>
  );
}

export default function Hero() {
  return (
    <section
      id="top"
      className="relative isolate min-h-[calc(100vh-3.5rem)] overflow-hidden bg-ink-900 text-white"
    >
      <div
        className="absolute inset-0 -z-10 bg-cover bg-no-repeat"
        style={{
          backgroundImage: `url('${asset('/assets/hero-mountain.jpg')}')`,
          backgroundPosition: 'center 55%',
        }}
        aria-hidden
      />
      <div
        className="absolute inset-0 -z-10 bg-gradient-to-b from-black/45 via-black/55 to-black/80"
        aria-hidden
      />

      <div className="mx-auto max-w-6xl px-6 sm:px-10 py-10 sm:py-14 min-h-[calc(100vh-3.5rem)] flex flex-col">
        {/* TOP — tagline + intro */}
        <div>
          <h1 className="font-display font-medium text-3xl sm:text-5xl md:text-6xl leading-[1.1] tracking-tight max-w-5xl [text-shadow:0_2px_12px_rgb(0_0_0_/_0.6)]">
            {profile.tagline}
          </h1>
          <p className="mt-8 font-sans text-base sm:text-lg text-white max-w-3xl [text-shadow:0_1px_4px_rgb(0_0_0_/_0.7)]">
            {profile.intro}
          </p>
        </div>

        {/* Sections + headshot — bottom-anchored block so it sits below the foothills at any viewport height */}
        <div className="mt-auto flex flex-col gap-6 sm:gap-8">
          <div className="space-y-7 sm:space-y-9">
            {sections.map((s) => (
              <div key={s.title}>
                <h2 className="font-sans font-semibold text-xl sm:text-2xl text-white mb-3 [text-shadow:0_1px_3px_rgb(0_0_0_/_0.6)]">
                  {s.title}
                </h2>
                <div className="flex flex-wrap gap-x-8 sm:gap-x-10 gap-y-3">
                  {s.links.map((l) => (
                    <LinkPill key={l.href} link={l} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <img
              src={asset('/assets/headshot.png')}
              alt="James Kocher"
              width={88}
              height={88}
              className="h-10 w-10 sm:h-12 sm:w-12 object-cover rounded-sm border-2 border-white/80 shadow-lg"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
