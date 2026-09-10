'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LandingNav } from '@/components/landing/LandingNav';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { HowItWorksSection } from '@/components/landing/HowItWorksSection';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { EducationalModal } from '@/components/help/EducationalModal';
import { SpaceEntranceAuth, AuthUserData } from '@/components/auth/SpaceEntranceAuth';
import { SolarSystemBackground } from '@/components/background/SolarSystemBackground';
import { PlanetMoonExplorerModal } from '@/components/celestial/PlanetMoonExplorerModal';
import { PlanetData, MoonData, SOLAR_SYSTEM_PLANETS } from '@/lib/data/celestialData';
import { useAuthStore } from '@/lib/authStore';

export default function LandingPage() {
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [forceShowLogin, setForceShowLogin] = useState(false);
  const [hasSkipped, setHasSkipped] = useState(false);

  // Planet & Moon 3D Explorer state
  const [selectedPlanet, setSelectedPlanet] = useState<PlanetData | null>(null);
  const [isPlanetModalOpen, setIsPlanetModalOpen] = useState(false);

  // Pinned Planetary Scroll Tracking
  const planetTrackRef = useRef<HTMLDivElement | null>(null);
  const [activePlanetIndex, setActivePlanetIndex] = useState<number>(0);

  const { user, hasCheckedStorage, initializeAuth, login } = useAuthStore();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // When user logs out, reset hasSkipped so the authentication gate requires password login
  useEffect(() => {
    if (!user && hasCheckedStorage) {
      setHasSkipped(false);
    }
  }, [user, hasCheckedStorage]);

  // Jump to specific planet waypoint along the pinned track
  const handleScrollToPlanet = useCallback((index: number) => {
    if (!planetTrackRef.current) return;
    const totalTrackScroll = planetTrackRef.current.offsetHeight - window.innerHeight;
    if (totalTrackScroll <= 0) return;
    const targetY = (index / (SOLAR_SYSTEM_PLANETS.length - 1)) * totalTrackScroll;
    window.scrollTo({ top: targetY, behavior: 'smooth' });
  }, []);

  // Show interactive Space Entrance on initial visit if not logged in
  const shouldShowEntrance =
    hasCheckedStorage && !user && !hasSkipped || forceShowLogin;

  const handleLoginSuccess = (userData: AuthUserData) => {
    login(userData);
    setForceShowLogin(false);
    setHasSkipped(true);
  };

  const handlePlanetDoubleClick = (planet: PlanetData) => {
    setSelectedPlanet(planet);
    setIsPlanetModalOpen(true);
  };

  const handleSelectMoon = (moon: MoonData) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('lunarov_selected_celestial_moon', JSON.stringify(moon));
    }
  };

  return (
    <main className="min-h-screen flex flex-col bg-[#030612] text-slate-100 selection:bg-cyan-500 selection:text-black relative">
      {/* 8-Step Interactive Space Login & Launch Gate */}
      {shouldShowEntrance && (
        <SpaceEntranceAuth
          onLoginSuccess={handleLoginSuccess}
          onSkip={() => {
            setHasSkipped(true);
            setForceShowLogin(false);
          }}
        />
      )}

      {/* Aerospace Navigation Bar */}
      <LandingNav
        onOpenAbout={() => setIsAboutModalOpen(true)}
        onOpenLogin={() => setForceShowLogin(true)}
      />

      {/* Pinned Solar System Planetary Exploration Track */}
      {/* The planets are scrolled completely first before the page continues downward */}
      <div
        ref={planetTrackRef}
        className="relative w-full h-[550vh]"
        id="solar-voyage"
      >
        <div className="sticky top-0 h-screen w-full overflow-hidden flex flex-col justify-between">
          {/* 3D WebGL Solar System Background with Continuous Catmull-Rom Camera Splines */}
          <SolarSystemBackground
            onPlanetDoubleClick={handlePlanetDoubleClick}
            activePlanetId={selectedPlanet?.id}
            onActivePlanetChange={(_, idx) => {
              setActivePlanetIndex(idx);
            }}
            onScrollToPlanet={handleScrollToPlanet}
          />

          {/* Hero Section with Dynamic Celestial Telemetry & Actions */}
          <HeroSection
            activePlanetIndex={activePlanetIndex}
            onOpenPlanetInspector={(planet) => {
              setSelectedPlanet(
                planet || SOLAR_SYSTEM_PLANETS[activePlanetIndex] || SOLAR_SYSTEM_PLANETS[2]
              );
              setIsPlanetModalOpen(true);
            }}
            onScrollToPlanet={handleScrollToPlanet}
          />
        </div>
      </div>

      {/* Page Content: Features, How It Works & Footer */}
      {/* Scrolls into view ONLY after the planets have been fully traversed */}
      <div className="relative z-20 bg-[#030612] border-t border-cyan-950/80 shadow-[0_-30px_60px_rgba(3,6,18,0.95)]">
        {/* Feature Modules Breakdown */}
        <FeaturesSection />

        {/* How It Works Operational Lifecycle */}
        <HowItWorksSection />

        {/* Aerospace Footer */}
        <LandingFooter onOpenAbout={() => setIsAboutModalOpen(true)} />
      </div>

      {/* Interactive System Docs & Architecture Modal */}
      <EducationalModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
      />

      {/* 3D Hyper-Realistic Moon Inspector & NASA/ESA Telemetry Modal */}
      <PlanetMoonExplorerModal
        planet={selectedPlanet}
        isOpen={isPlanetModalOpen}
        onClose={() => setIsPlanetModalOpen(false)}
        onSelectMoon={handleSelectMoon}
      />
    </main>
  );
}


