export type App = {
  name: string;
  blurb: string;
  scope: string;
  link: { label: string; href: string };
};

export const apps: App[] = [
  {
    name: 'Ring App',
    blurb:
      'Home security platform with video doorbells, cameras, alarms, and smart lighting featuring motion detection alerts.',
    scope:
      'Shared Users, Linked Devices, Alexa Routines, Modes, Virtual Security Guard, and Video Monitoring.',
    link: {
      label: 'App Store',
      href: 'https://apps.apple.com/us/app/ring-always-home/id926252661',
    },
  },
  {
    name: 'RoboKiller',
    blurb:
      'Spam call blocker that stops ~99% of unwanted calls using a 1.4B-call database.',
    scope: 'Lead Product Manager for the full rewrite and refactor of V5.',
    link: {
      label: 'App Store',
      href: 'https://apps.apple.com/us/app/robokiller-spam-call-blocker/id1022831885',
    },
  },
  {
    name: 'TextKiller',
    blurb:
      'Spam text-message blocker that eliminates ~99% of unwanted messages.',
    scope: 'Lead Designer and Product Manager for the 0-to-1 launch.',
    link: {
      label: 'App Store',
      href: 'https://apps.apple.com/us/app/textkiller-spam-text-blocker/id1514005355',
    },
  },
  {
    name: 'SwitchUp',
    blurb:
      'Second phone number app with spam protection and a privacy-focused design.',
    scope: 'Lead Product Manager for a 0-to-1 new product.',
    link: {
      label: 'App Store',
      href: 'https://apps.apple.com/us/app/switchup-second-phone-number/id1527598796',
    },
  },
  {
    name: 'LocusNOC App & Platform',
    blurb:
      'MyLocusEnergy mobile app and LocusNOC web dashboard for solar PV system monitoring and analytics.',
    scope: 'Product Manager across mobile and web.',
    link: {
      label: 'AppAdvice',
      href: 'https://appadvice.com/app/mylocusenergy/1389547007',
    },
  },
];

export type Role = {
  company: string;
  titles: string[];
};

export const roles: Role[] = [
  {
    company: 'Amazon | Ring',
    titles: ['Senior Technical Product Manager', 'Technical Product Manager'],
  },
  {
    company: 'Teltech',
    titles: ['Senior Product Manager', 'Product Manager'],
  },
  {
    company: 'Locus Energy',
    titles: ['Product Manager', 'Application Engineer', 'Project Manager'],
  },
];

export const highlights: string[] = [
  'Alexa Routines integration in the Ring App',
  'Virtual Security Guard feature',
  'Ring Car Cam',
  'Tesla Microgrid project in American Samoa',
];
