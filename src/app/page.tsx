'use client';

import React, { useState, useEffect } from 'react';
import { LandingNav } from '@/components/landing/LandingNav';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { HowItWorksSection } from '@/components/landing/HowItWorksSection';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { EducationalModal } from '@/components/help/EducationalModal';
import { SpaceEntranceAuth, AuthUserData } from '@/components/auth/SpaceEntranceAuth';
import { useAuthStore } from '@/lib/authStore';

export default function LandingPage() {
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [forceShowLogin, setForceShowLogin] = useState(false);
  const [hasSkipped, setHasSkipped] = useState(false);

  const { user, hasCheckedStorage, initializeAuth, login } = useAuthStore();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Show interactive Space Entrance on initial visit if not logged in
  const shouldShowEntrance =
    hasCheckedStorage && !user && !hasSkipped || forceShowLogin;

  const handleLoginSuccess = (userData: AuthUserData) => {
    login(userData);
    setForceShowLogin(false);
    setHasSkipped(true);
  };

  return (
    <main className="min-h-screen flex flex-col bg-[#050811] text-slate-100 selection:bg-cyan-500 selection:text-black">
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

      {/* Hero Section with 3D Visual and CTAs */}
      <HeroSection />

      {/* Feature Modules Breakdown */}
      <FeaturesSection />

      {/* How It Works Operational Lifecycle */}
      <HowItWorksSection />

      {/* Aerospace Footer */}
      <LandingFooter onOpenAbout={() => setIsAboutModalOpen(true)} />

      {/* Interactive System Docs & Architecture Modal */}
      <EducationalModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
      />
    </main>
  );
}

