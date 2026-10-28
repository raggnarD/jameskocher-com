import LandingHeader from '@/components/landing/LandingHeader';
import Hero from '@/components/Hero';
import AnnouncementModal from '@/components/landing/AnnouncementModal';

export default function Page() {
  return (
    <>
      <LandingHeader />
      <main>
        <Hero />
      </main>
      <AnnouncementModal />
    </>
  );
}
