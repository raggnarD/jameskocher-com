import Reveal from '@/components/Reveal';
import type { EducationEntry } from '@/content/experience';

export default function EducationList({
  entries,
}: {
  entries: EducationEntry[];
}) {
  return (
    <div className="space-y-8">
      {entries.map((e, i) => (
        <Reveal as="article" key={e.school} delay={i * 60}>
          <div className="flex items-baseline justify-between flex-wrap gap-x-4 gap-y-1">
            <h3 className="font-serif text-2xl text-ink-900 tracking-tight">
              {e.school}
            </h3>
            <p className="text-sm text-ink-500">{e.location}</p>
          </div>
          <p className="font-medium text-ink-700 mt-1">{e.degree}</p>
          {e.detail && (
            <p className="mt-2 text-[15px] leading-relaxed text-ink-700 max-w-readable">
              {e.detail}
            </p>
          )}
        </Reveal>
      ))}
    </div>
  );
}
