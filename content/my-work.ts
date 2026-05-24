export type App = {
  name: string;
  blurb: string;
  scope: string;
  image: string;
  icon?: string;
  link: { label: string; href: string };
};

export const apps: App[] = [
  {
    name: 'Ring App',
    blurb:
      'Home security platform with video doorbells, cameras, alarms, and smart lighting featuring motion detection alerts.',
    scope:
      'Shared Users, Linked Devices, Alexa Routines, Modes, Virtual Security Guard, and Video Monitoring.',
    image: '/assets/apps/ring.png',
    icon: '/assets/apps/icons/ring.webp',
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
    image: '/assets/apps/robokiller.png',
    icon: '/assets/apps/icons/robokiller.webp',
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
    image: '/assets/apps/textkiller.png',
    icon: '/assets/apps/icons/textkiller.webp',
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
    image: '/assets/apps/switchup.png',
    icon: '/assets/apps/icons/switchup.webp',
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
    image: '/assets/apps/locusnoc.png',
    icon: '/assets/apps/icons/locusnoc.png',
    link: {
      label: 'AppAdvice',
      href: 'https://appadvice.com/app/mylocusenergy/1389547007',
    },
  },
];

export type Highlight = {
  name: string;
  blurb: string;
  scope: string;
  image: string;
  link: { label: string; href: string };
};

export const highlights: Highlight[] = [
  {
    name: 'Ring <> Alexa Routines',
    blurb:
      'Set up and manage common useful Alexa Routines directly from within the Ring App.',
    scope: 'Lead Product Manager from ideation to execution.',
    image: '/assets/highlights/alexa-routines.svg',
    link: {
      label: 'Ring App',
      href: 'https://apps.apple.com/us/app/ring-always-home/id926252661',
    },
  },
  {
    name: 'Virtual Security Guard',
    blurb:
      'When your Ring camera detects a person with its person-detecting technology, Security Professionals immediately begin monitoring the situation to help protect your home or business.',
    scope: 'Protected Home Owner.',
    image: '/assets/highlights/ring-vsg.jpg',
    link: {
      label: 'Watch video',
      href: 'https://www.youtube.com/watch?v=CMbDHOTH6qU',
    },
  },
  {
    name: 'Ring Car Cam',
    blurb:
      'Help protect your car 24/7 with Car Cam, the dual-facing vehicle security camera. Two HD cameras record movement, giving you a better picture of suspicious activity to help keep you ahead of a break-in and more.',
    scope: 'Evasive action driver.',
    image: '/assets/highlights/ring-carcam.jpg',
    link: {
      label: 'Watch video',
      href: 'https://www.youtube.com/shorts/TEESINPGQZk',
    },
  },
  {
    name: 'Tesla Microgrid · Ta’u, American Samoa',
    blurb:
      'The island of Ta’u in American Samoa now runs on nearly 100% solar energy thanks to 5,300+ solar panels and 60 Tesla Powerpacks.',
    scope: 'Designed and supported custom monitoring and control solutions.',
    image: '/assets/highlights/tesla-microgrid.jpg',
    link: {
      label: 'Watch video',
      href: 'https://vimeo.com/347363332',
    },
  },
];
