export type Project = {
  name: string;
  blurb: string;
  href: string;
  external?: boolean;
};

export const projects: Project[] = [
  {
    name: 'Netflix Resume',
    blurb:
      'A Netflix-style streaming UI that walks through my career like a series catalog.',
    href: '/netflix-resume/',
  },
  {
    name: 'RPG Skills',
    blurb:
      'A character-sheet view of a product manager — stats, classes, and abilities, visualized.',
    href: '/rpg-skills/',
  },
  {
    name: 'Kids Games',
    blurb:
      'A small collection of browser games I built for my kids — reading, math, and listening.',
    href: '/kids-games/',
  },
  {
    name: 'Rushroost',
    blurb: 'Side project — visit the live site.',
    href: 'https://www.rushroost.com',
    external: true,
  },
];

export type FounderLink = {
  name: string;
  blurb: string;
  href: string;
  external?: boolean;
};

export const founderLinks: FounderLink[] = [
  {
    name: 'My Work',
    blurb:
      'A deeper look at the products I’ve built and shipped — Ring, RoboKiller, TextKiller, SwitchUp, LocusNOC.',
    href: '/my-work/',
  },
  {
    name: 'Rational Mind Studios',
    blurb:
      'Studio I run that explores small, useful software experiments and side projects.',
    href: 'https://www.rationalmindstudios.com',
    external: true,
  },
];
