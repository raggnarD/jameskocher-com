// Launches with press coverage. Shown in a modal from a Notable launches
// card ("Learn more") on /my-work and, for the current one, on every load
// of the landing page. Summaries are our own words; link out for the rest.
export type CoverageItem = {
  outlet: string;
  headline: string;
  date: string;
  summary: string;
  href: string;
};

export type Launch = {
  eyebrow: string;
  title: string;
  blurb: string;
  image: string;
  imageAlt: string;
  cta: { label: string; href: string };
  coverage: CoverageItem[];
};

export const homeMap: Launch = {
  eyebrow: 'Just announced',
  title: 'Alexa Home Map',
  blurb:
    'An interactive 3D map of your home and property, with every Alexa and Ring device right where it sits. I was the Lead Mobile App Product Manager for the new app.',
  image: '/assets/highlights/alexa-home-map.jpg',
  imageAlt: 'Alexa Home Map on three phones: 3D home map, device remote, and camera timeline',
  cta: {
    label: 'Read my LinkedIn post',
    href: 'https://www.linkedin.com/posts/jameswkocher_amazing-to-see-my-teams-hard-work-on-alexa-ugcPost-7521200909251563520-kB1e/',
  },
  coverage: [
    {
      outlet: 'About Amazon',
      headline: 'Alexa Home Map lets you see your whole home in 3D',
      date: 'Oct 28, 2026',
      summary:
        'Amazon’s announcement: build the map from your address and an iPhone room scan, then control devices, watch live camera previews and rewind 24 hours of activity from one view.',
      href: 'https://www.aboutamazon.com/news/devices/alexa-home-map-3d-smart-home-view',
    },
    {
      outlet: 'Engadget',
      headline: 'The Alexa Home Map is a visual way to see and control your smart home',
      date: 'Oct 28, 2026',
      summary:
        'A hands-on take that likens the live, animated map to The Sims and calls it more intuitive than the tile dashboards from Google and Apple.',
      href: 'https://www.engadget.com/2299183/alexa-home-map-visual-way-see-control-smart-home/',
    },
    {
      outlet: 'The Verge',
      headline: 'Amazon’s Alexa Home Map is getting a smarter 3D redesign',
      date: 'Oct 28, 2026',
      summary:
        'Calls it a considerable upgrade over the 2023 2D map, highlighting the 360° outdoor view that animates people and cars seen by Ring cameras.',
      href: 'https://www.theverge.com/tech/1020392/amazon-alexa-home-view-3d-update-external-view',
    },
  ],
};
