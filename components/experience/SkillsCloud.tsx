import Reveal from '@/components/Reveal';
import type { SkillGroup } from '@/content/experience';

export default function SkillsCloud({ groups }: { groups: SkillGroup[] }) {
  return (
    <dl className="space-y-7 sm:grid sm:grid-cols-[180px_1fr] sm:gap-x-12 sm:gap-y-8 sm:space-y-0">
      {groups.map((g, i) => (
        <Reveal key={g.heading} delay={i * 40} as="div" className="contents">
          <dt className="font-mono text-xs uppercase tracking-wider text-ink-500 mt-2">
            {g.heading}
          </dt>
          <dd className="flex flex-wrap gap-2">
            {g.items.map((item) => (
              <span
                key={item}
                className="rounded-full border border-ink-100 bg-surface px-3 py-1 text-sm text-ink-700"
              >
                {item}
              </span>
            ))}
          </dd>
        </Reveal>
      ))}
    </dl>
  );
}
