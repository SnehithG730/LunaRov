'use client';

import React, { useState } from 'react';
import { LandingNav } from '@/components/landing/LandingNav';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { HowItWorksSection } from '@/components/landing/HowItWorksSection';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { EducationalModal } from '@/components/help/EducationalModal';

export default function LandingPage() {
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);

  return (
    <main className="min-h-screen flex flex-col bg-[#050811] text-slate-100 selection:bg-cyan-500 selection:text-black">
      {/* Aerospace Navigation Bar */}
      <LandingNav onOpenAbout={() => setIsAboutModalOpen(true)} />

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
