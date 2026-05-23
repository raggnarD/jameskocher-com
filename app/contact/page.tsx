import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import Reveal from '@/components/Reveal';
import { profile } from '@/content/profile';
import { asset } from '@/lib/asset';

export const metadata = {
  title: 'Contact — James Kocher',
  description: 'Get in touch with James Kocher.',
};

export default function ContactPage() {
  return (
    <>
      <Nav />
      <main>
        <section className="section pt-14 sm:pt-20">
          <Reveal>
            <p className="eyebrow mb-4">Get in touch</p>
            <h1 className="h-display mb-6">Contact</h1>
            <p className="body-lg max-w-readable mb-8">
              The best way to reach me is via LinkedIn or GitHub.
            </p>
            <ul className="space-y-3 text-[15px] text-ink-800">
              <li>
                <a
                  href={profile.links.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  LinkedIn → linkedin.com/in/jameswkocher
                </a>
              </li>
              <li>
                <a
                  href={profile.links.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  GitHub → github.com/raggnarD
                </a>
              </li>
              <li>
                <a
                  href={asset(profile.links.resume)}
                  className="text-accent hover:underline"
                >
                  Resume → jameskocher.com/experience
                </a>
              </li>
            </ul>
          </Reveal>
        </section>
      </main>
      <Footer />
    </>
  );
}
