import { profile } from '@/content/profile';
import Reveal from './Reveal';

export default function Intro() {
  return (
    <section className="section pt-14 sm:pt-20">
      <Reveal>
        <p className="eyebrow mb-4">Hi, I’m</p>
        <h1 className="h-display mb-6">{profile.name}</h1>
        <p className="body-lg max-w-readable">{profile.intro}</p>
      </Reveal>
    </section>
  );
}
