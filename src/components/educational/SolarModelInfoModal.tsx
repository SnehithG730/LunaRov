import React from 'react';
import { Sun, ShieldAlert, Sparkles, X, BatteryCharging, Mountain, Clock, Lightbulb } from 'lucide-react';

interface SolarModelInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SolarModelInfoModal: React.FC<SolarModelInfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-950 border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-amber-500/20 bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-950">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
              <Sun className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-mono tracking-wide">
                Lunar Solar & Illumination Model
              </h2>
              <p className="text-xs text-amber-400/80 font-mono">
                Educational Aerospace Power Architecture
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto font-sans text-sm">
          {/* Core Educational Statement */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-amber-200 leading-relaxed text-xs sm:text-sm font-medium">
              &quot;Lunar rovers may need to plan around illumination, terrain, power availability and operational constraints. This simulator models these factors at an educational level.&quot;
            </p>
          </div>

          {/* South Pole Lighting Physics */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
              <Mountain className="w-4 h-4 text-cyan-400" />
              <span>Lunar South Pole Illumination Dynamics</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              At the Lunar South Pole (e.g. Shackleton Crater rim), the Moon&apos;s rotational axis has an obliquity of only <strong className="text-slate-200">1.54°</strong> relative to the ecliptic plane. The Sun skims low along the horizon, casting elongated shadows across the rugged cratered topography.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-lg bg-slate-900/80 border border-amber-500/20 space-y-1.5">
                <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5 font-mono">
                  <Sun className="w-3.5 h-3.5" />
                  <span>Peaks of Eternal Light</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Elevated crater rims and ridge summits that receive direct sunlight for 70–90% of the lunar year, providing continuous solar array charging for surface assets.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/80 border border-blue-500/20 space-y-1.5">
                <div className="text-xs font-bold text-blue-400 flex items-center gap-1.5 font-mono">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Permanently Shadowed Regions (PSRs)</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Deep crater interiors in perpetual shadow (0.0 illumination) at temperatures below 40 K (-233°C). Rovers traversing PSRs rely exclusively on finite stored battery reserve.
                </p>
              </div>
            </div>
          </div>

          {/* Energy Strategies */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
              <BatteryCharging className="w-4 h-4 text-emerald-400" />
              <span>Navigation Energy Strategies</span>
            </h3>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <strong className="text-white font-mono">Normal (Balanced)</strong>
                  <p className="text-slate-400 text-[11px]">Compromise across spatial distance, incline gradient, risk, and energy.</p>
                </div>
                <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono text-[10px]">BALANCED</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <strong className="text-emerald-400 font-mono">Energy Saving</strong>
                  <p className="text-slate-400 text-[11px]">Contours around steep climbs to minimize mechanical motor draw.</p>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px]">LOW POWER</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-amber-500/30 flex items-center justify-between">
                <div>
                  <strong className="text-amber-400 font-mono">Solar Optimized</strong>
                  <p className="text-slate-400 text-[11px]">Detours onto sunlit ridges to maximize solar array input and maintain battery reserve.</p>
                </div>
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px]">SOLAR MAX</span>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-500 space-y-1">
            <span className="font-bold text-slate-400 font-mono">Educational Modeling Notice:</span>
            <p>
              This simulator uses a simplified numerical approximation of lunar solar flux, raycast elevation shadows, and motor kinetics. It is designed for interactive learning and autonomous robotics education, and is not a mission-certified flight dynamics tool.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>LunaRov Autonomous Mission Control</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
};
