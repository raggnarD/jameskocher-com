import { profile } from '@/content/profile';

export default function Hero() {
  return (
    <section
      id="top"
      className="relative isolate overflow-hidden bg-ink-900 text-white"
    >
      <div
        className="absolute inset-0 -z-10 bg-cover bg-center"
        style={{ backgroundImage: "url('/assets/hero-mountain.jpg')" }}
        aria-hidden
      />
      <div className="absolute inset-0 -z-10 bg-black/45" aria-hidden />
      <div className="mx-auto max-w-5xl px-6 sm:px-8 py-28 sm:py-40 md:py-48">
        <p className="text-base sm:text-lg font-light tracking-wide text-white/90 max-w-2xl">
          {profile.tagline}
        </p>
      </div>
    </section>
  );
}
