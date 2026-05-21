import Nav from '@/components/Nav';
import Hero from '@/components/Hero';
import Intro from '@/components/Intro';
import Founder from '@/components/Founder';
import Projects from '@/components/Projects';
import Footer from '@/components/Footer';

export default function Page() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Intro />
        <Founder />
        <Projects />
      </main>
      <Footer />
    </>
  );
}
