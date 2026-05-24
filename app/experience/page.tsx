import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import Reveal from '@/components/Reveal';
import Timeline from '@/components/experience/Timeline';
import ProjectsSection from '@/components/experience/ProjectsSection';
import SkillsCloud from '@/components/experience/SkillsCloud';
import EducationList from '@/components/experience/EducationList';
import MediaLightbox from '@/components/experience/MediaLightbox';
import {
  hero,
  meta,
  timeline,
  aiProjects,
  skills,
  education,
} from '@/content/experience';

export const metadata = {
  title: 'James Kocher — Sr. Technical Product Manager',
  description:
    'Senior Technical Product Manager productizing ML, AI, and complex technical systems. 10+ years across Amazon | Ring, Teltech, and Locus Energy.',
};

function GitHubIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.63 1.59.23 2.77.11 3.06.74.81 1.19 1.84 1.19 3.1 0 4.43-2.7 5.4-5.27 5.69.41.35.78 1.05.78 2.12v3.14c0 .31.21.68.8.56C20.22 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.95v5.66H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43A2.06 2.06 0 1 1 5.33 3.3a2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

export default function ExperiencePage() {
  return (
    <>
      <Nav />
      <main>
        {/* Hero */}
        <section id="top" className="section pt-14 sm:pt-20 pb-4">
          <Reveal>
            <p className="eyebrow mb-4">{hero.eyebrow}</p>
            <h1 className="h-display mb-6">{hero.heading}</h1>
            {hero.paragraphs.map((p, i) => (
              <p
                key={i}
                className={`body-lg ${i > 0 ? 'mt-4' : ''}`}
              >
                {p}
              </p>
            ))}

            {/* CTAs row: site link + GitHub + LinkedIn with bullet separators */}
            {hero.ctas.length > 0 && (
              <ul className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-700">
                {hero.ctas.map((c, i) => (
                  <li key={c.href} className="flex items-center gap-4">
                    <a
                      href={c.href}
                      target={c.external ? '_blank' : undefined}
                      rel={c.external ? 'noopener noreferrer' : undefined}
                      className="inline-flex items-center gap-1.5 hover:text-ink-900 transition-colors"
                    >
                      {c.icon === 'github' && <GitHubIcon />}
                      {c.icon === 'linkedin' && <LinkedInIcon />}
                      <span>{c.label}</span>
                    </a>
                    {i < hero.ctas.length - 1 && (
                      <span aria-hidden className="text-ink-300">
                        •
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {/* Section anchor pills */}
            {hero.sectionPills.length > 0 && (
              <ul className="mt-6 flex flex-wrap items-center gap-2">
                {hero.sectionPills.map((p) => (
                  <li key={p.href}>
                    <a
                      href={p.href}
                      className="inline-flex items-center rounded-full border border-ink-100 bg-surface px-4 py-1.5 text-sm text-ink-700 hover:border-accent/40 hover:text-accent transition-colors"
                    >
                      {p.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Reveal>
        </section>

        {/* Experience timeline */}
        <section id="experience" className="section pt-4">
          <Reveal>
            <div className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
              <div>
                <p className="eyebrow mb-3">Experience</p>
                <h2 className="h-section">A career, end to end</h2>
              </div>
              {meta.experienceSideNote && (
                <p className="text-sm text-ink-500 max-w-sm">
                  {meta.experienceSideNote}
                </p>
              )}
            </div>
          </Reveal>
          <Timeline entries={timeline} />
        </section>

        {/* AI Projects */}
        <section id="projects" className="section">
          <Reveal>
            <p className="eyebrow mb-3">Agentic AI Projects</p>
            <h2 className="h-section mb-3">Things I build with AI</h2>
            <p className="text-[15px] leading-relaxed text-ink-700 max-w-readable mb-8">
              Production-grade and proof-of-concept workflows I’ve shipped
              using Claude Code, Cursor, and other agent frameworks.
            </p>
          </Reveal>
          <ProjectsSection projects={aiProjects} />
        </section>

        {/* Skills / Toolbox */}
        <section id="skills" className="section">
          <Reveal>
            <p className="eyebrow mb-3">Skills</p>
            <h2 className="h-section mb-8">Toolbox</h2>
          </Reveal>
          <SkillsCloud groups={skills} />
        </section>

        {/* Education */}
        <section id="education" className="section">
          <Reveal>
            <p className="eyebrow mb-3">Education</p>
            <h2 className="h-section mb-8">School</h2>
          </Reveal>
          <EducationList entries={education} />
        </section>
      </main>
      <Footer />
      <MediaLightbox />
    </>
  );
}
