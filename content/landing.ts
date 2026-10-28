import { homeMap, type Launch } from '@/content/launches';

// Sections shared by the landing page (link list revealed on scroll) and the
// /tour/ guided flyover (one objective per section). Internal hrefs are site
// paths; wrap them with asset() when rendering a raw <a>.
export type SectionLink = {
  label: string;
  href: string;
  note: string;
  external?: boolean;
};

export type Section = {
  id: 'experience' | 'projects' | 'founder' | 'contact';
  title: string;
  blurb: string;
  links: SectionLink[];
};

export const sections: Section[] = [
  {
    id: 'experience',
    title: 'Experience',
    blurb: 'Where the climb started — the products I shipped and the roles behind them.',
    links: [
      { label: 'My Work', href: '/my-work/', note: 'Ring, RoboKiller, TextKiller, SwitchUp, LocusNOC' },
      { label: 'Experience', href: '/experience/', note: 'Roles, scope and outcomes' },
    ],
  },
  {
    id: 'projects',
    title: 'Projects',
    blurb: 'Things I build for fun and to learn — résumés as products, games for my kids.',
    links: [
      { label: 'Netflix Resume', href: '/netflix-resume/', note: 'Career as a streaming catalog' },
      { label: 'RPG Skills', href: '/rpg-skills/', note: 'A PM character sheet' },
      { label: 'Kids Games', href: 'https://games.jameskocher.com/', external: true, note: 'Browser games I built for my kids' },
      { label: 'Rushroost', href: 'https://www.rushroost.com', external: true, note: 'Side project, live' },
      { label: 'Case Study', href: '/case-study/', note: 'Password-protected decks' },
    ],
  },
  {
    id: 'founder',
    title: 'Founder',
    blurb: 'The studio I run: small, useful software experiments.',
    links: [
      { label: 'Rational Mind Studios', href: 'https://www.rationalmindstudios.com', external: true, note: 'Studio site' },
    ],
  },
  {
    id: 'contact',
    title: 'Contact',
    blurb: 'You made the summit. Say hello.',
    links: [
      { label: 'Contact', href: '/contact/', note: 'Get in touch' },
      { label: 'LinkedIn', href: 'https://www.linkedin.com/in/jameswkocher/', external: true, note: 'jameswkocher' },
      { label: 'GitHub', href: 'https://github.com/raggnarD', external: true, note: 'raggnarD' },
    ],
  },
];

// The landing page's revealed link list shows these; Contact lives in the header.
export const landingSections = sections.filter((s) => s.id !== 'contact');

// Launch shown in a modal on every load of the landing page (same interface
// as its Notable launches "Learn more" on /my-work). Set to null to turn off.
export const announcement: Launch | null = homeMap;
