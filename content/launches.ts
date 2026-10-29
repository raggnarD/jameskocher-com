// Launches with press coverage. Shown in a modal from a Notable launches
// card ("Learn more") on /my-work and, for the current one, on every load
// of the landing page. Each piece gets a short line in our own words (not a
// quote, so it renders without quote marks); the link goes to the article.

/** Type treatment for an outlet's name on the press wall (no logos). */
export type OutletMark =
  | 'amazon'
  | 'verge'
  | 'engadget'
  | 'toms'
  | 'pcmag'
  | 'cnet'
  | 'mashable'
  | 'bloomberg'
  | 'biggo';

export type CoverageItem = {
  outlet: string;
  mark: OutletMark;
  headline: string;
  date: string;
  /** Short paraphrase shown when this outlet is highlighted. */
  line: string;
  href: string;
};

export type Launch = {
  eyebrow: string;
  title: string;
  role: string;
  image: string;
  imageAlt: string;
  cta: { label: string; href: string };
  coverage: CoverageItem[];
};

export const homeMap: Launch = {
  eyebrow: 'Just announced',
  title: 'Alexa Home Map',
  role: 'I was the Lead Mobile App Product Manager for the new app.',
  image: '/assets/highlights/alexa-home-map.jpg',
  imageAlt: 'Alexa Home Map on three phones: 3D home map, device remote, and camera timeline',
  cta: {
    label: 'Read my LinkedIn post',
    href: 'https://www.linkedin.com/posts/jameswkocher_amazing-to-see-my-teams-hard-work-on-alexa-ugcPost-7521200909251563520-kB1e/',
  },
  coverage: [
    {
      outlet: 'About Amazon',
      mark: 'amazon',
      headline: 'Alexa Home Map lets you see your whole home in 3D',
      date: 'Oct 28, 2026',
      line: 'Your whole home, inside and out, in 3D.',
      href: 'https://www.aboutamazon.com/news/devices/alexa-home-map-3d-smart-home-view',
    },
    {
      outlet: 'The Verge',
      mark: 'verge',
      headline: 'Amazon’s Alexa Home Map is getting a smarter 3D redesign',
      date: 'Oct 28, 2026',
      line: 'A big leap past the old 2D map.',
      href: 'https://www.theverge.com/tech/1020392/amazon-alexa-home-view-3d-update-external-view',
    },
    {
      outlet: 'The Verge',
      mark: 'verge',
      headline: 'Amazon Echo Show 16 hands-on: price, release date, and new features',
      date: 'Oct 28, 2026',
      line: 'Tap a figure outside, get the live view.',
      href: 'https://www.theverge.com/tech/1020286/amazon-echo-show-16-hands-on-price-screen-styles',
    },
    {
      outlet: 'Engadget',
      mark: 'engadget',
      headline: 'The Alexa Home Map is a visual way to see and control your smart home',
      date: 'Oct 28, 2026',
      line: 'Even the rain and snow show up on the map.',
      href: 'https://www.engadget.com/2299183/alexa-home-map-visual-way-see-control-smart-home/',
    },
    {
      outlet: 'Tom’s Guide',
      mark: 'toms',
      headline: 'I went hands-on with the new Amazon Echo Show 16, and it looks like the most complete smart display yet',
      date: 'Oct 28, 2026',
      line: 'Smart home control, taken to the next level.',
      href: 'https://www.tomsguide.com/home/smart-home/i-went-hands-on-with-the-new-amazon-echo-show-16-and-it-looks-like-the-most-complete-smart-display-yet',
    },
    {
      outlet: 'PCMag',
      mark: 'pcmag',
      headline: 'Amazon’s Echo Show 16 Can See Everyone Walking Past Your House. That’s Amazing…and Terrifying',
      date: 'Oct 28, 2026',
      line: 'The Echo Show 16’s centerpiece. A technical marvel.',
      href: 'https://www.pcmag.com/news/amazons-echo-show-16-can-see-everyone-walking-past-your-house-thats-amazingand',
    },
    {
      outlet: 'CNET',
      mark: 'cnet',
      headline: 'Amazon’s 5 New Smart Home Devices: Everything You Need to Know',
      date: 'Oct 28, 2026',
      line: 'Weather, cars and people, updated live.',
      href: 'https://www.cnet.com/home/smart-home/amazon-5-new-smart-home-devices-rundown/',
    },
    {
      outlet: 'Mashable',
      mark: 'mashable',
      headline: 'Amazon announces new smart home devices, including a new Echo Dot',
      date: 'Oct 28, 2026',
      line: 'Control every device, room by room.',
      href: 'https://mashable.com/tech/amazon-announces-new-echo-dot-studio-time-show-16-alexa-photo-frame',
    },
    {
      outlet: 'Bloomberg',
      mark: 'bloomberg',
      headline: 'Amazon Unveils New Echo Show 16, Alexa Speakers, Smart Clock and Photo Frame',
      date: 'Oct 28, 2026',
      line: 'Part of Amazon’s new Echo lineup.',
      href: 'https://www.bloomberg.com/news/articles/2026-10-28/amazon-unveils-new-echo-show-16-alexa-speakers-smart-clock-and-photo-frame',
    },
    {
      outlet: 'BigGo Finance',
      mark: 'biggo',
      headline: 'Amazon Prices Echo Show 16 at $500, Undercuts Apple’s $299 HomeView as Smart-Home Battle Intensifies',
      date: 'Oct 28, 2026',
      line: 'Echo Show 16 enters the smart-home battle.',
      href: 'https://finance.biggo.com/news/910fedb8-94b1-40ae-8153-e0c8d24860e2',
    },
  ],
};
