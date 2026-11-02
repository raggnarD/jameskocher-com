import Reveal from '@/components/Reveal';
import type { AIProject, BadgeStyle } from '@/content/experience';

const BADGE_STYLES: Record<BadgeStyle, string> = {
  accent: 'bg-accent-soft text-accent',
  neutral: 'bg-ink-50 text-ink-700',
  blue: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  red: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
};

export default function ProjectsSection({
  projects,
}: {
  projects: AIProject[];
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {projects.map((p, i) => (
        <Reveal
          as="article"
          key={p.id}
          delay={i * 60}
          className="relative overflow-hidden rounded-2xl border border-ink-100 bg-surface p-6 transition-shadow hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
        >
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <h3 className="font-serif text-xl text-ink-900 tracking-tight">
              {p.title}
            </h3>
            {p.badge && (
              <span
                className={`shrink-0 rounded-full text-xs px-2.5 py-0.5 font-medium uppercase tracking-wider ${BADGE_STYLES[p.badge.style]}`}
              >
                {p.badge.text}
              </span>
            )}
          </div>
          <p className="text-[15px] leading-relaxed text-ink-700">{p.body}</p>
        </Reveal>
      ))}
    </div>
  );
}
