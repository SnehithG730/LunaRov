'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { TopBar } from '@/components/dashboard/TopBar';
import { LeftMissionControls } from '@/components/dashboard/LeftMissionControls';
import { LiveTelemetryPanel } from '@/components/dashboard/LiveTelemetryPanel';
import { TimelineEventLog } from '@/components/dashboard/TimelineEventLog';
import { BottomStatusBar } from '@/components/dashboard/BottomStatusBar';
import { ViewportContainer } from '@/components/viewports/ViewportContainer';
import { ManualControlPad } from '@/components/controls/ManualControlPad';
import { MobileMissionSheet, MobileSheetTab } from '@/components/dashboard/MobileMissionSheet';
import { MobileTelemetryBar } from '@/components/dashboard/MobileTelemetryBar';
import { MobileControlsBar } from '@/components/dashboard/MobileControlsBar';
import { MissionResultsModal } from '@/components/results/MissionResultsModal';
import { SavedMissionsDrawer } from '@/components/results/SavedMissionsDrawer';
import { EducationalModal } from '@/components/help/EducationalModal';
import { CelestialSpaceBackground } from '@/components/background/CelestialSpaceBackground';
import { useSimulation } from '@/hooks/useSimulation';
import { useKeyboardControls } from '@/hooks/useKeyboardControls';
import { useMissionStore } from '@/core/simulation/missionStore';

function SimulatorDashboardContent() {
  // Active simulation tick and keyboard control hooks
  useSimulation();
  useKeyboardControls();

  const computePath = useMissionStore((s) => s.computePath);
  const selectedAlgorithm = useMissionStore((s) => s.selectedAlgorithm);
  const searchParams = useSearchParams();

  const initialView = searchParams.get('view');

  const [isHelpOpen, setIsHelpOpen] = useState(initialView === 'help');
  const [isSavedMissionsOpen, setIsSavedMissionsOpen] = useState(initialView === 'missions');

  // Mobile Bottom Sheet state ('NONE' | 'TELEMETRY' | 'SETTINGS' | 'EVENT_LOG')
  const [mobileSheetTab, setMobileSheetTab] = useState<MobileSheetTab>('NONE');

  // Compute initial path once mounted
  useEffect(() => {
    computePath();
  }, [computePath]);

  return (
    <div className="min-h-screen flex flex-col bg-[#040711] text-slate-100 selection:bg-cyan-500 selection:text-black font-mono relative">
      {/* Ambient 3D Celestial Background Horizon */}
      <div className="fixed inset-0 pointer-events-none opacity-20 z-0">
        <CelestialSpaceBackground interactive={false} intensity="ambient" />
      </div>

      {/* 1. TOP BAR: Mission name, Status, Connection indicator, Simulation speed */}
      <TopBar
        onOpenHelp={() => setIsHelpOpen(true)}
        onOpenSavedMissions={() => setIsSavedMissionsOpen(true)}
      />

      {/* 2. MAIN MISSION CONTROL WORKSPACE */}
      <main className="flex-1 p-2.5 sm:p-3.5 max-w-[1920px] mx-auto w-full flex flex-col justify-between z-10 relative">
        {/* =========================================================================
            MOBILE LAYOUT (< 1024px)
            Top: Status (In TopBar) -> Middle: Lunar Map -> Below: Telemetry -> Below: Controls
           ========================================================================= */}
        <div className="flex lg:hidden flex-col space-y-2.5 w-full flex-1">
          {/* Middle: Touch-Interactive Lunar Map */}
          <div className="w-full h-[48vh] min-h-[320px] max-h-[500px] rounded-xl overflow-hidden shadow-2xl border border-cyan-950/80 bg-[#080d1a] relative">
            <ViewportContainer />
          </div>

          {/* Below Map: Compact Rover Telemetry Strip (Tap to open full charts) */}
          <MobileTelemetryBar onOpenDetails={() => setMobileSheetTab('TELEMETRY')} />

          {/* Below Telemetry: Mission Controls Bar */}
          <MobileControlsBar
            onOpenSettings={() => setMobileSheetTab('SETTINGS')}
            onOpenLogs={() => setMobileSheetTab('EVENT_LOG')}
          />

          {/* Manual Control Virtual Pad on Mobile when in Manual Mode */}
          {selectedAlgorithm === 'MANUAL' && (
            <div className="pt-1">
              <ManualControlPad />
            </div>
          )}
        </div>

        {/* =========================================================================
            DESKTOP / LARGE TABLET LAYOUT (>= 1024px)
            Full 3-Column Mission Control Grid
           ========================================================================= */}
        <div className="hidden lg:grid grid-cols-12 gap-3.5 w-full flex-1">
          {/* LEFT PANEL: Mission Controls & Algorithm Engine (Col 1-3) */}
          <aside className="col-span-3 space-y-3">
            <LeftMissionControls />
            {selectedAlgorithm === 'MANUAL' && <ManualControlPad />}
          </aside>

          {/* CENTER COLUMN: Large Interactive Lunar Map & Event Log (Col 4-9) */}
          <section className="col-span-6 flex flex-col space-y-3">
            {/* 3D / 2D Viewport Container */}
            <div className="flex-1 w-full min-h-[520px] rounded-xl overflow-hidden shadow-2xl border border-cyan-950/80 bg-[#080d1a]">
              <ViewportContainer />
            </div>

            {/* Bottom Event Log & Timeline */}
            <TimelineEventLog />
          </section>

          {/* RIGHT PANEL: Live Rover Telemetry & Gauges (Col 10-12) */}
          <aside className="col-span-3 space-y-3">
            <LiveTelemetryPanel />
          </aside>
        </div>
      </main>

      {/* 3. BOTTOM STATUS BAR: Algorithm, Path Status, Terrain, Rover */}
      <BottomStatusBar />

      {/* Mobile Collapsible Bottom Sheet */}
      <MobileMissionSheet
        activeTab={mobileSheetTab}
        onClose={() => setMobileSheetTab('NONE')}
        onSelectTab={(tab) => setMobileSheetTab(tab)}
      />

      {/* Modals and Drawers */}
      <MissionResultsModal />
      <SavedMissionsDrawer
        isOpen={isSavedMissionsOpen}
        onClose={() => setIsSavedMissionsOpen(false)}
      />
      <EducationalModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
    </div>
  );
}

export default function SimulatorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#040711] text-cyan-400 font-mono flex items-center justify-center">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-bold tracking-widest text-sm">INITIALIZING LUNAROV MISSION CONTROL...</span>
          </div>
        </div>
      }
    >
      <SimulatorDashboardContent />
    </Suspense>
  );
}
