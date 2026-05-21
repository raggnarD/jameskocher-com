import Link from 'next/link';
import ThemeToggle from './ThemeToggle';

const links = [
  { href: '/my-work/', label: 'My Work' },
  { href: 'https://resume.jameskocher.com', label: 'Resume', external: true },
  { href: '/contact/', label: 'Contact' },
];

export default function Nav() {
  return (
    <header className="sticky top-0 z-40 bg-brand text-white">
      <nav className="mx-auto max-w-5xl px-6 sm:px-8 h-14 flex items-center justify-between gap-6">
        <Link
          href="/"
          className="font-serif text-lg tracking-tight text-white hover:text-white/80 transition-colors"
        >
          James Kocher
        </Link>
        <div className="flex items-center gap-6">
          <ul className="hidden sm:flex items-center gap-7 text-sm text-white/85">
            {links.map((l) =>
              l.external ? (
                <li key={l.href}>
                  <a href={l.href} className="hover:text-white transition-colors">
                    {l.label}
                  </a>
                </li>
              ) : (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="hover:text-white transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ),
            )}
          </ul>
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
