/**
 * /experience page content — single source of truth for the timeline,
 * AI projects, skills, and education sections. To add a new job or
 * tweak a bullet, edit this file. No bundle patching needed.
 *
 * Rendered by app/experience/page.tsx via the components in
 * components/experience/.
 */

// ============================================================
// Types
// ============================================================

export type Role = {
  /** Job title. */
  title: string;
  /** Year range like "2018–2019" or "2022–Present". En-dash, no spaces. */
  years: string;
};

/** Media item attached to a job's left-rail (lightbox-openable). */
export type MediaItem =
  | {
      kind: 'image';
      src: string;
      alt: string;
      caption: string;
    }
  | {
      kind: 'video';
      poster: string;
      href: string;
      alt: string;
      caption: string;
    };

export type Job = {
  kind: 'job';
  id: string;
  company: string;
  location: string;
  /** Left-rail desktop date display (rendered with em-dash). */
  aside: { from: string; to: string };
  /** Inline mobile date string ("Aug 2008 — Aug 2013" or "2008 — 2013"). */
  mobileDate: string;
  roles: Role[];
  bullets: string[];
  /** Optional thumbnails shown under the year aside. */
  media?: MediaItem[];
  /** Set on the most recent job to show a pulsing green dot. */
  current?: boolean;
};

/** Inline single-line timeline marker (e.g. Columbia degree). */
export type EducationBreak = {
  kind: 'education-break';
  id: string;
  aside: { from: string; to: string };
  school: string;
  degree: string;
};

export type TimelineEntry = Job | EducationBreak;

export type AIProject = {
  id: string;
  title: string;
  badge?: { text: string; style: 'accent' | 'neutral' };
  body: string;
};

export type SkillGroup = {
  heading: string;
  items: string[];
};

export type EducationEntry = {
  school: string;
  location: string;
  degree: string;
  detail?: string;
};

export type HeroCta = {
  label: string;
  href: string;
  icon?: 'github' | 'linkedin';
  external?: boolean;
};

export type SectionPill = {
  label: string;
  href: string;
};

export type ExperienceHero = {
  eyebrow: string;
  heading: string;
  paragraphs: string[];
  ctas: HeroCta[];
  sectionPills: SectionPill[];
};

export type ExperienceMeta = {
  /** Side note shown next to "A career, end to end" heading. */
  experienceSideNote: string;
};

// ============================================================
// Content
// ============================================================

export const hero: ExperienceHero = {
  eyebrow: 'Sr. Technical Product Manager — Builder',
  heading: 'James Kocher',
  paragraphs: [
    'Senior Technical Product Manager with 10+ years productizing ML, AI, and complex technical systems for business and consumer users. Background spans B2B solar PV monitoring at Locus Energy (hardware-agnostic data ingestion at utility scale, Tesla Microgrid) and ML-powered safety products at Amazon | Ring (30M+ users), including the SOPs governing human verification of CV-detected events. Owns the full stack from data pipelines and labeling systems to user-facing interfaces and human-in-the-loop workflows. Ships AI-native internal tooling (Claude Code, Cursor) including a production agentic workflow that triages customer complaints.',
  ],
  ctas: [
    { label: 'jameskocher.com', href: 'https://www.jameskocher.com', external: true },
    { label: 'GitHub', href: 'https://github.com/raggnarD', icon: 'github', external: true },
    {
      label: 'LinkedIn',
      href: 'https://www.linkedin.com/in/jameswkocher/',
      icon: 'linkedin',
      external: true,
    },
  ],
  sectionPills: [
    { label: 'Experience', href: '#experience' },
    { label: 'Projects', href: '#projects' },
    { label: 'Skills', href: '#skills' },
    { label: 'Education', href: '#education' },
  ],
};

export const meta: ExperienceMeta = {
  experienceSideNote:
    '17 years across solar SaaS, consumer mobile, and AI-native safety products at Amazon | Ring.',
};

export const timeline: TimelineEntry[] = [
  {
    kind: 'job',
    id: 'amazon-ring',
    company: 'Amazon | Ring',
    location: 'New York, NY',
    aside: { from: '2022', to: 'Present' },
    mobileDate: 'Mar 2022 — Present',
    current: true,
    roles: [
      { title: 'Sr. Product Manager — Technical', years: '2022–Present' },
      { title: 'Product Manager — Technical', years: '2022' },
    ],
    bullets: [
      'Own product strategy for the Ring Platform (Web & Mobile) across 30M+ users, defining the roadmap for AI-powered safety features that combine on-device computer vision, cloud inference, and human-in-the-loop monitoring.',
      'Led 0→1 launch of Virtual Security Guard, Ring’s flagship subscription monitoring service. The full-stack product spans CV-based event detection, real-time human-in-the-loop verification, and a guided onboarding workflow. Improved onboarding completion from 62.9% to 91.2% and cut P50/P90 onboarding time by 43.6% / 84.9%.',
      'Designed the Standard Operating Procedure (SOP) governing human-operator response after CV-detected person-in-frame events. The SOP specifies decision rules, escalation paths, and verification steps that translate digital signals into trustworthy, real-time, real-world security response.',
      'Drove Alexa/Ring Routine integration across multiple orgs, building cross-functional alignment up to the C-suite (Ring CEO/CTO and Amazon VP of Devices); doubled feature engagement vs. baseline Alexa Routines.',
      'Set vision across multiple scrum teams; ran Monthly Product and Business Reviews at the Director level, translating telemetry, funnel, and reliability data into prioritized roadmap decisions.',
    ],
    media: [
      {
        kind: 'image',
        src: '/assets/experience/ring-app.png',
        alt: 'Ring app interface',
        caption: 'Ring App',
      },
      {
        kind: 'video',
        poster: '/assets/experience/ring-vsg-poster.jpg',
        href: 'https://www.youtube.com/watch?v=CMbDHOTH6qU',
        alt: 'Virtual Security Guard video',
        caption: 'Virtual Security Guard',
      },
      {
        kind: 'video',
        poster: '/assets/experience/ring-carcam-poster.jpg',
        href: 'https://www.youtube.com/shorts/TEESINPGQZk',
        alt: 'Ring Car Cam video',
        caption: 'Ring Car Cam',
      },
    ],
  },
  {
    kind: 'job',
    id: 'teltech',
    company: 'Teltech | IAC Mosaic Group',
    location: 'New York, NY',
    aside: { from: '2019', to: '2022' },
    mobileDate: 'Jun 2019 — Mar 2022',
    roles: [
      { title: 'Sr. Product Manager', years: '2020–2022' },
      { title: 'Product Manager', years: '2019–2020' },
    ],
    bullets: [
      'Designed and shipped an internal ML labeling admin portal that productized a research-grade SMS classification system into a scalable labeling tool used by ops teams. Drove 200% improvement in spam-text blocked through continuous ML model refinement and a structured human-in-the-loop labeling workflow.',
      'Owned the ML-powered Spam SMS filtering roadmap end-to-end, driving accuracy to 95%. Hand-labeled new user-reported messages as spam/not-spam to feed the retraining pipeline; defined the eval criteria, labeling workflow, and human-in-the-loop feedback loop between user reports and model retraining. Raised TextKiller average review from 3.5 stars to 4.3 stars via near-daily filter iteration.',
      'Shipped 3 mobile apps in one year, including RoboKiller iOS v5.0 (~700K subscribers) and TextKiller, which was designed and productized in 4 weeks. Built consensus on backend/frontend flows across a complex VoIP, telephony, and Mobile OS stack, driving a 20% increase in spam calls blocked per user in 30 days of launch.',
      'Researched, pitched, and shipped SwitchUp (Top 100 Business category) to 2,000 paid subscribers within 90 days of launch.',
      'Promoted to Sr. PM with Rising Star designation for roadmapping and exec comms across RoboKiller (App Store Top 100 Utilities, App of the Day 2019 & 2020, 1M+ subscribers); met 90% of 2020 OKRs and developed associate PMs, cutting time-to-productive by 20%.',
      'Lifted RoboKiller trial-to-paid conversion 60% → 70% and user LTV 10.2% via funnel instrumentation, onboarding redesign, and BI/UX partnership on conversion trend analysis.',
    ],
    media: [
      {
        kind: 'image',
        src: '/assets/experience/robokiller.png',
        alt: 'RoboKiller app screenshot',
        caption: 'RoboKiller',
      },
      {
        kind: 'image',
        src: '/assets/experience/textkiller.png',
        alt: 'TextKiller app screenshot',
        caption: 'TextKiller',
      },
      {
        kind: 'image',
        src: '/assets/experience/switchup.png',
        alt: 'SwitchUp app screenshot',
        caption: 'SwitchUp',
      },
    ],
  },
  {
    kind: 'job',
    id: 'locus-energy',
    company: 'Locus Energy',
    location: 'Hoboken, NJ',
    aside: { from: '2015', to: '2019' },
    mobileDate: '2015 — 2019',
    roles: [
      { title: 'Product Manager', years: '2018–2019' },
      {
        title: 'Applications Engineer / Technical Sales Engineer',
        years: '2016–2018',
      },
      { title: 'Project Manager', years: '2015–2016' },
    ],
    bullets: [
      'Built B2B SaaS platform for monitoring and control of commercial, industrial, and utility-scale solar PV installations. The hardware-agnostic data-ingestion product served 10,000+ accounts of technical end users including solar engineers, asset managers, and utility operators.',
      'As Product Manager, drove $2.2M in increased market share and 137% growth in assets monitored in 2018; built consensus across engineering, sales, and customers, and shipped two mobile apps to the full user base.',
      'Identified and validated new product lines by analyzing industry trends and customer signal. Secured the second-largest U.S. solar developer as a beta partner for a new add-on product.',
      'Productized hardware-agnostic data ingestion: led 50+ new hardware and software (API) integrations and shipped a self-service integration feature, increasing new-integration deployment speed by 300%.',
      'Built internal web app and tool suite for common support tasks, reducing support bottlenecks by up to 50% and increasing team scalability.',
      'As Applications Engineer, designed custom monitoring and control solutions for high-revenue clients including Tesla and GE. Contributed to the Tesla Microgrid project in American Samoa and grew APAC region sales by $1M+ in 2017 via a new device-integration roadmap.',
    ],
    media: [
      {
        kind: 'image',
        src: '/assets/experience/locusnoc-dashboard.png',
        alt: 'LocusNOC solar monitoring dashboard',
        caption: 'LocusNOC Dashboard',
      },
      {
        kind: 'image',
        src: '/assets/experience/locusnoc-app.png',
        alt: 'LocusNOC mobile app',
        caption: 'LocusNOC App',
      },
      {
        kind: 'video',
        poster: '/assets/experience/tesla-microgrid-poster.jpg',
        href: 'https://vimeo.com/347363332',
        alt: 'Tesla Microgrid in American Samoa video',
        caption: 'Tesla Microgrid · Ta’u',
      },
    ],
  },
  {
    kind: 'job',
    id: 'mars',
    company: 'Mars Inc.',
    location: 'Hackettstown, NJ',
    aside: { from: '2013', to: '2015' },
    mobileDate: 'Aug 2013 — Jan 2015',
    roles: [
      {
        title: 'Commercial Buying Operations Specialist',
        years: '2013–2015',
      },
    ],
    bullets: [
      'Managed Corrugate packaging category ($100M+ spend) operational issues as a special-project manager.',
      'Ideated and implemented over $1.12M in sustainability-driven savings.',
      'Represented packaging on two brand activity teams covering 50+ new products and projects, including M&M’s® Crispy.',
      'Improved the packaging pricing model, delivering a 50% reduction in the team’s time expenditure.',
    ],
  },
  {
    kind: 'education-break',
    id: 'columbia-marker',
    aside: { from: '2010', to: '2013' },
    school: 'Columbia University',
    degree: 'M.S. Sustainability Management',
  },
  {
    kind: 'job',
    id: 'apple',
    company: 'Apple Inc.',
    location: 'Paramus, NJ',
    aside: { from: '2008', to: '2013' },
    mobileDate: '2008 — 2013',
    roles: [
      { title: 'Inventory Control Specialist', years: '2011–2013' },
      { title: 'Mac Genius', years: '2008–2011' },
    ],
    bullets: [
      'Managed and developed a team of 10 inventory associates handling daily inventory worth $2M+, using Apple Retail Leadership training.',
      'Implemented rigorous in-store recycling, capturing 90% of inbound shipping materials.',
      'Drove process improvements that increased the inventory team’s receiving efficiency by 33% and brought customer order wait time under 2 minutes.',
      'Trained as an Apple Certified Macintosh Technician at corporate headquarters in Cupertino, CA.',
      'Recognized at the 2011 semi-annual all-market meeting for a 100% Net Promoter Score (NPS) in a quarter; ranked in the Top 5 for Genius team NPS (95%) for three years at the #1 trafficked store in the market.',
      'Resolved 50+ critical in-store IT problems; recognized as the in-store “champion” by corporate IT.',
      'Reduced customer wait time for common repairs by 75%+ by implementing a network solution.',
    ],
  },
];

export const aiProjects: AIProject[] = [
  {
    id: 'complaint-triage',
    title: 'Customer-complaint triage agent',
    badge: { text: 'In production', style: 'accent' },
    body: 'Multi-step agentic workflow that ingests CEO-forwarded customer emails, retrieves similar past complaints, feedback, and existing Jira tickets, then generates a "true problem score" to help the team prioritize issues. Turns ad-hoc executive escalations into structured, evidence-backed prioritization signal.',
  },
  {
    id: 'prd-gen',
    title: 'Automated PRD generation',
    badge: { text: 'Internal tool', style: 'neutral' },
    body: 'Agentic workflow that drafts PRDs from initial requirement notes — accelerating spec authoring and standardizing structure across the team.',
  },
  {
    id: 'slack-digest',
    title: 'Slack daily digest agent',
    badge: { text: 'Internal tool', style: 'neutral' },
    body: 'Summarizes channel conversations and extracts outstanding to-do items, surfacing action items that otherwise get lost in noise.',
  },
  {
    id: 'pocs',
    title: 'Production proof-of-concepts',
    badge: { text: 'POC', style: 'neutral' },
    body: 'Multiple Claude Code and Cursor built proof-of-concept features merged into production codebases.',
  },
];

export const skills: SkillGroup[] = [
  {
    heading: 'AI / ML Product',
    items: [
      'ML model productization (data → labeling → training → eval → deploy)',
      'LLM applications',
      'Computer Vision (CV)',
      'Image Recognition',
      'Object Detection',
      'Agentic AI workflows (Claude Code, Cursor)',
      'Human-in-the-Loop Systems',
    ],
  },
  {
    heading: 'Technical',
    items: [
      'Python',
      'SQL',
      'Postgres',
      'JSON',
      'Swift',
      'Kotlin',
      'JavaScript',
      'HTML',
      'React',
      'Ember',
      'Vertica',
      'Redshift',
      'BigQuery',
      'REST APIs',
      'Machine Learning',
    ],
  },
  {
    heading: 'Product & Strategy',
    items: [
      'Product Strategy & Roadmap',
      'OKRs',
      'Agile / Scrum / Kanban',
      'Cross-Functional Leadership',
      'Stakeholder Management',
      'Lean Startup',
      'User Testing',
      'A/B Testing',
      'Business Intelligence',
      'Root Cause Analysis',
    ],
  },
  {
    heading: 'Tools',
    items: [
      'JIRA',
      'Confluence',
      'Looker',
      'Tableau',
      'Amplitude',
      'Firebase',
      'Adjust',
      'Leanplum',
      'Figma',
      'Balsamiq',
      'Invision',
      'GitLab',
      'Asana',
      'Salesforce',
      'Postman',
      'TextQL',
    ],
  },
  {
    heading: 'Domain',
    items: [
      'B2B SaaS & Enterprise Software',
      'Mobile App Development',
      'IoT / Sensor Data Ingestion',
      'Solar / Clean Energy Monitoring',
      'Subscription Lifecycle',
      'Monetization',
      'User Journey & Conversion',
      'LTV Optimization',
    ],
  },
  {
    heading: 'Design',
    items: ['Design Thinking', 'UX', 'UI', 'Mobile App Design', 'Figma'],
  },
];

export const education: EducationEntry[] = [
  {
    school: 'Columbia University',
    location: 'New York, NY',
    degree: 'M.S. Sustainability Management',
    detail:
      'Coursework: Statistics for Sustainability, Energy Efficiency Analysis, GHG / Carbon Footprint Accounting, Cost-Benefit Analysis, Financing the Green Economy.',
  },
  {
    school: 'Franklin & Marshall College',
    location: 'Lancaster, PA',
    degree: 'B.A. Business Administration',
  },
];
