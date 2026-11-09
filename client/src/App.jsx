import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import SqlPlayground from './components/SqlPlayground';
import SchemaExplorer from './components/SchemaExplorer';
import HowItWorks from './components/HowItWorks';
import ComparisonSection from './components/ComparisonSection';
import Features from './components/Features';
import FaqSection from './components/FaqSection';
import Footer from './components/Footer';

export default function App() {
  const [currentView, setCurrentView] = useState(() => {
    return window.location.hash === '#playground' ? 'playground' : 'landing';
  });

  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#playground') {
        setCurrentView('playground');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setCurrentView('landing');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (view) => {
    setCurrentView(view);
    if (view === 'playground') {
      window.location.hash = '#playground';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.location.hash = '';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-dvh flex flex-col justify-between bg-[var(--color-paper)] text-[var(--color-ink)]">
      <Navbar currentView={currentView} onNavigate={navigateTo} />
      
      {currentView === 'playground' ? (
        <main className="flex-1">
          <SqlPlayground isDedicatedPage={true} onBack={() => navigateTo('landing')} />
        </main>
      ) : (
        <main>
          <Hero onLaunchPlayground={() => navigateTo('playground')} />
          <HowItWorks />
          <SchemaExplorer />
          <ComparisonSection />
          <Features />
          <FaqSection />
        </main>
      )}

      <Footer onNavigate={navigateTo} />
    </div>
  );
}
