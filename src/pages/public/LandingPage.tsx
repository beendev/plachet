import { Contact } from '../../components/marketing/Contact';
import { Footer } from '../../components/marketing/Footer';
import { Hero } from '../../components/marketing/Hero';
import { Navbar } from '../../components/marketing/Navbar';
import { Process } from '../../components/marketing/Process';
import { SyndicSection } from '../../components/marketing/SyndicSection';

type LandingPageProps = {
  onPortalClick: () => void;
  onRegisterClick: () => void;
  onCachetsClick: () => void;
  onHomeClick: () => void;
};

export const LandingPage = ({ onPortalClick, onRegisterClick, onCachetsClick, onHomeClick }: LandingPageProps) => (
  <div className="min-h-screen bg-white font-sans text-black selection:bg-black selection:text-white">
    <Navbar onPortalClick={onPortalClick} onRegisterClick={onRegisterClick} onCachetsClick={onCachetsClick} onHomeClick={onHomeClick} />
    <main>
      <Hero onRegisterClick={onRegisterClick} />
      <Process />
      <SyndicSection onRegisterClick={onRegisterClick} />
      <Contact />
    </main>
    <Footer onPortalClick={onPortalClick} />
  </div>
);
