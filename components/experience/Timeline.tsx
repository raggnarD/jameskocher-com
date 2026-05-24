import Reveal from '@/components/Reveal';
import { asset } from '@/lib/asset';
import type {
  TimelineEntry,
  Job,
  EducationBreak,
  MediaItem,
} from '@/content/experience';
import { MediaThumb } from './MediaLightbox';

export default function Timeline({ entries }: { entries: TimelineEntry[] }) {
  return (
    <div className="relative">
      {/* Vertical rail behind the dots; fades to transparent at the bottom. */}
      <div
        aria-hidden
        className="absolute top-1 bottom-1 left-[6px] sm:left-[260px] w-px bg-gradient-to-b from-ink-200 via-ink-200 to-transparent"
      />
      <ol className="space-y-12 sm:space-y-16">
        {entries.map((entry) =>
          entry.kind === 'job' ? (
            <JobItem key={entry.id} job={entry} />
          ) : (
            <EduBreakItem key={entry.id} entry={entry} />
          ),
        )}
      </ol>
    </div>
  );
}

function YearAside({
  from,
  to,
  brand = false,
}: {
  from: string;
  to: string;
  brand?: boolean;
}) {
  const text = brand ? 'text-brand' : 'text-ink-500';
  const dash = brand ? 'text-brand' : 'text-ink-300';
  return (
    <p
      className={`font-mono text-xs ${text} tracking-wider ${
        brand ? '' : 'mb-4'
      }`}
    >
      {from}
      <span className={`mx-1 ${dash}`}>—</span>
      {to}
    </p>
  );
}

function JobItem({ job }: { job: Job }) {
  // First entry (current job) gets a green pulsing dot. Otherwise an empty ring.
  const dotClass = job.current
    ? 'bg-accent animate-breathe motion-reduce:animate-none motion-reduce:ring-4 motion-reduce:ring-accent-soft'
    : 'bg-bg ring-2 ring-ink-300';

  return (
    <li className="relative">
      <span
        aria-hidden
        className={`absolute top-2 sm:top-2.5 left-0 sm:left-[254px] h-[13px] w-[13px] rounded-full ${dotClass}`}
      />
      <div className="pl-7 sm:pl-0 sm:grid sm:grid-cols-[240px_1fr] sm:gap-x-12">
        <aside className="hidden sm:block sm:pr-6 sm:text-right">
          <YearAside from={job.aside.from} to={job.aside.to} />
          {job.media && job.media.length > 0 && (
            <MediaList items={job.media} />
          )}
        </aside>
        <div>
          <div className="flex items-baseline justify-between flex-wrap gap-x-4 gap-y-1">
            <h3 className="font-serif text-2xl text-ink-900 tracking-tight">
              {job.company}
            </h3>
            <p className="font-mono text-xs text-ink-500 uppercase tracking-wider sm:hidden">
              {job.mobileDate}
            </p>
          </div>
          <p className="text-sm text-ink-500 mt-0.5">{job.location}</p>
          <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm text-ink-700">
            {job.roles.map((r, i) => (
              <li key={r.title} className="flex items-center gap-2">
                <span className="font-medium">{r.title}</span>
                <span className="text-ink-400 text-xs">({r.years})</span>
                {i < job.roles.length - 1 && (
                  <span className="text-ink-300">•</span>
                )}
              </li>
            ))}
          </ul>
          <ul className="mt-5 space-y-2.5 text-[15px] leading-relaxed text-ink-700 max-w-readable">
            {job.bullets.map((b, i) => (
              <Reveal as="li" key={i} delay={i * 70} className="relative pl-5">
                <span
                  aria-hidden
                  className="absolute left-0 top-[10px] h-[5px] w-[5px] rounded-full bg-accent"
                />
                {b}
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </li>
  );
}

function EduBreakItem({ entry }: { entry: EducationBreak }) {
  return (
    <li className="relative">
      <span
        aria-hidden
        className="absolute top-2 sm:top-2.5 left-0 sm:left-[254px] h-[13px] w-[13px] rounded-full bg-brand"
      />
      <div className="pl-7 sm:pl-0 sm:grid sm:grid-cols-[240px_1fr] sm:gap-x-12">
        <aside className="hidden sm:block sm:pr-6 sm:text-right">
          <YearAside from={entry.aside.from} to={entry.aside.to} brand />
        </aside>
        <div className="flex items-baseline gap-x-3 flex-wrap">
          <h3 className="font-serif text-xl text-brand tracking-tight">
            {entry.school}
          </h3>
          <p className="text-sm text-brand">{entry.degree}</p>
          <p className="font-mono text-xs text-brand uppercase tracking-wider sm:hidden">
            {entry.aside.from} — {entry.aside.to}
          </p>
        </div>
      </div>
    </li>
  );
}

function MediaList({ items }: { items: MediaItem[] }) {
  return (
    <Reveal className="mt-4">
      <ul className="space-y-3 text-left">
        {items.map((m, i) => (
          <li key={i}>
            <MediaThumb item={m} />
          </li>
        ))}
      </ul>
    </Reveal>
  );
}
