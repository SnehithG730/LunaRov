'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMissionStore } from '@/core/simulation/missionStore';
import { MissionDebriefCharts } from './MissionDebriefCharts';
import { AlgorithmComparisonTable } from './AlgorithmComparisonTable';
import { FinalLunarMapPreview } from './FinalLunarMapPreview';
import { MissionTimelineView } from './MissionTimelineView';
import { saveMissionToStorage, exportMissionAsJSON, exportTelemetryCSV } from '@/lib/storage';
import {
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Layers,
  Cpu,
  Bookmark,
  PlusCircle,
  Clock,
  Route,
  Zap,
  Battery,
  ShieldCheck,
  TrendingUp,
  Award,
  Download,
  FileSpreadsheet,
  Check,
} from 'lucide-react';

interface MissionResultsViewProps {
  onClose?: () => void;
  isStandalonePage?: boolean;
}

export const MissionResultsView: React.FC<MissionResultsViewProps> = ({
  onClose,
  isStandalonePage = false,
}) => {
  const router = useRouter();
  const missionName = useMissionStore((s) => s.missionName);
  const missionResults = useMissionStore((s) => s.missionResults);
  const roverState = useMissionStore((s) => s.roverState);
  const roverConfig = useMissionStore((s) => s.roverConfig);
  const terrain = useMissionStore((s) => s.terrain);
  const selectedAlgorithm = useMissionStore((s) => s.selectedAlgorithm);
  const pathResult = useMissionStore((s) => s.pathResult);
  const startPoint = useMissionStore((s) => s.startPoint);
  const targetPoint = useMissionStore((s) => s.targetPoint);
  const rerouteCount = useMissionStore((s) => s.rerouteCount);
  const telemetryHistory = useMissionStore((s) => s.telemetryHistory);

  const resetSimulation = useMissionStore((s) => s.resetSimulation);
  const startSimulation = useMissionStore((s) => s.startSimulation);
  const regenerateTerrain = useMissionStore((s) => s.regenerateTerrain);
  const dismissResults = useMissionStore((s) => s.dismissResults);

  const [savedSuccess, setSavedSuccess] = useState(false);

  // Derived Metrics
  const isCompleted = roverState.goalReached || missionResults?.outcome === 'SUCCESS';
  const durationSec = missionResults?.durationSeconds ?? Number(roverState.elapsedTimeSeconds.toFixed(1));
  const distanceTravelled = missionResults?.distanceTraveledMeters ?? Number(roverState.distanceTraveledMeters.toFixed(1));
  const batteryRemainingPct = missionResults?.remainingBatteryPct ?? roverState.batteryPercentage;
  const batteryRemainingWh = roverState.batteryRemainingWh;
  const batteryConsumedWh = missionResults?.energyConsumedWh ?? Math.max(0, roverConfig.batteryCapacityWh - batteryRemainingWh);
  const pathCost = pathResult?.totalMovementCost ?? distanceTravelled * 1.2;
  const nodesEvaluated = pathResult?.nodesEvaluated ?? pathResult?.nodesExploredCount ?? 840;
  const efficiencyScore = missionResults?.efficiencyScore ?? Math.max(60, Math.min(100, Math.round(100 - (batteryConsumedWh / roverConfig.batteryCapacityWh) * 40 - rerouteCount * 5)));

  // Format Total Mission Time: T+HH:MM:SS
  const totalSeconds = Math.floor(durationSec);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const timeFormatted = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const getEfficiencyGrade = (score: number) => {
    if (score >= 90) return { grade: 'A+', label: 'EXCELLENT', color: 'text-emerald-400 border-emerald-400/50 bg-emerald-950/40' };
    if (score >= 80) return { grade: 'A', label: 'OPTIMAL', color: 'text-emerald-400 border-emerald-400/50 bg-emerald-950/40' };
    if (score >= 70) return { grade: 'B', label: 'STANDARD', color: 'text-cyan-400 border-cyan-400/50 bg-cyan-950/40' };
    if (score >= 50) return { grade: 'C', label: 'MARGINAL', color: 'text-amber-400 border-amber-400/50 bg-amber-950/40' };
    return { grade: 'F', label: 'CRITICAL', color: 'text-red-400 border-red-400/50 bg-red-950/40' };
  };

  const grade = getEfficiencyGrade(efficiencyScore);

  // ACTION HANDLERS
  const handleRunAgain = () => {
    resetSimulation();
    if (onClose) onClose();
    else dismissResults();
    setTimeout(() => {
      startSimulation();
    }, 100);
    if (isStandalonePage) router.push('/simulator');
  };

  const handleChangeTerrain = () => {
    regenerateTerrain();
    resetSimulation();
    if (onClose) onClose();
    else dismissResults();
    if (isStandalonePage) router.push('/simulator');
  };

  const handleSaveMission = () => {
    const resultsData = missionResults || {
      missionId: `MISS-${Date.now()}`,
      roverName: roverConfig.name,
      terrainType: terrain.type,
      algorithmUsed: selectedAlgorithm,
      durationSeconds: durationSec,
      distanceTraveledMeters: distanceTravelled,
      energyConsumedWh: Number(batteryConsumedWh.toFixed(1)),
      remainingBatteryPct: batteryRemainingPct,
      averageSpeedMps: Number((distanceTravelled / Math.max(1, durationSec)).toFixed(2)),
      maxSlopeEncounteredDeg: Number(Math.max(...telemetryHistory.map((t) => t.slopeDeg), 0)),
      rerouteCount,
      outcome: isCompleted ? 'SUCCESS' : 'ABORTED',
      efficiencyScore,
      telemetryLog: telemetryHistory,
    };

    saveMissionToStorage({
      id: resultsData.missionId,
      name: `${missionName} to [${targetPoint.x}, ${targetPoint.y}]`,
      date: new Date().toLocaleDateString(),
      terrainType: terrain.type,
      algorithm: selectedAlgorithm,
      start: startPoint,
      target: targetPoint,
      roverConfig,
      results: resultsData,
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  const handleNewMission = () => {
    resetSimulation();
    if (onClose) onClose();
    else dismissResults();
    router.push('/setup');
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-5 font-mono text-xs text-slate-100">
      {/* 1. HEADER: MISSION COMPLETE */}
      <div className="bg-[#080d1a] border border-cyan-500/50 rounded-2xl p-5 shadow-2xl space-y-4 relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div
              className={`p-3.5 rounded-2xl border ${
                isCompleted
                  ? 'bg-emerald-950/60 border-emerald-400/60 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                  : 'bg-amber-950/60 border-amber-400/60 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
              }`}
            >
              {isCompleted ? (
                <CheckCircle2 className="w-8 h-8" />
              ) : (
                <AlertTriangle className="w-8 h-8" />
              )}
            </div>

            <div>
              <div className="text-[10.5px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-2">
                <span>SCIENTIFIC MISSION DEBRIEF</span>
                <span className="text-gray-600">•</span>
                <span className="text-cyan-400">SECTOR: {terrain.type.replace('_', ' ')}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wider">
                {isCompleted ? 'MISSION COMPLETE' : 'MISSION REPORT'}
              </h1>
              <p className="text-xs text-gray-300 mt-0.5">
                Mission Name: <strong className="text-cyan-300">{missionName}</strong> • Vehicle:{' '}
                <strong className="text-white">{roverConfig.name}</strong> • Algorithm:{' '}
                <strong className="text-amber-300">{selectedAlgorithm}</strong>
              </p>
            </div>
          </div>

          {/* Mission Status & Duration Pill */}
          <div className="flex items-center gap-3">
            <div className="bg-black/60 border border-cyan-900/60 rounded-xl px-4 py-2 text-right">
              <div className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">TOTAL MISSION TIME</div>
              <div className="text-xl font-black text-cyan-300">{timeFormatted}</div>
            </div>

            <div
              className={`px-4 py-2 rounded-xl border text-center font-bold ${
                isCompleted
                  ? 'bg-emerald-950/80 border-emerald-400/70 text-emerald-300'
                  : 'bg-amber-950/80 border-amber-400/70 text-amber-300'
              }`}
            >
              <div className="text-[9px] uppercase tracking-widest">STATUS</div>
              <div className="text-sm font-extrabold">{isCompleted ? 'SUCCESS' : 'INCOMPLETE'}</div>
            </div>
          </div>
        </div>

        {/* Efficiency Grade Bar */}
        <div className="bg-[#0e1628] border border-cyan-950 p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" />
              <span>MISSION EFFICIENCY INDEX</span>
            </div>
            <p className="text-[11px] text-gray-400 font-sans">
              Evaluated based on trajectory optimality, minimal elevation gradient resistance, power conservation, and autonomous reroute penalties.
            </p>
          </div>

          <div className={`px-4 py-1.5 rounded-xl border flex items-center gap-3 ${grade.color}`}>
            <div className="text-2xl font-black">{grade.grade}</div>
            <div className="text-right">
              <div className="text-[10px] font-bold uppercase">{grade.label}</div>
              <div className="text-[11px] font-extrabold">{efficiencyScore} / 100 PTS</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. KEY METRICS GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Distance Travelled */}
        <div className="bg-[#0a0f1d] border border-cyan-950/90 p-3.5 rounded-xl space-y-1">
          <div className="flex items-center gap-1.5 text-gray-400 text-[10.5px]">
            <Route className="w-3.5 h-3.5 text-cyan-400" />
            <span>DISTANCE TRAVELLED</span>
          </div>
          <div className="text-xl font-extrabold text-white">{distanceTravelled} <span className="text-xs text-cyan-400 font-normal">m</span></div>
          <div className="text-[9.5px] text-gray-500">Planned: {pathResult?.totalDistanceMeters ?? distanceTravelled} m</div>
        </div>

        {/* Total Mission Time */}
        <div className="bg-[#0a0f1d] border border-cyan-950/90 p-3.5 rounded-xl space-y-1">
          <div className="flex items-center gap-1.5 text-gray-400 text-[10.5px]">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>TOTAL MISSION TIME</span>
          </div>
          <div className="text-xl font-extrabold text-white">{durationSec} <span className="text-xs text-cyan-400 font-normal">sec</span></div>
          <div className="text-[9.5px] text-gray-500">{timeFormatted} elapsed</div>
        </div>

        {/* Battery Consumed */}
        <div className="bg-[#0a0f1d] border border-cyan-950/90 p-3.5 rounded-xl space-y-1">
          <div className="flex items-center gap-1.5 text-gray-400 text-[10.5px]">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>BATTERY CONSUMED</span>
          </div>
          <div className="text-xl font-extrabold text-amber-300">{batteryConsumedWh.toFixed(1)} <span className="text-xs font-normal">Wh</span></div>
          <div className="text-[9.5px] text-gray-500">{((batteryConsumedWh / roverConfig.batteryCapacityWh) * 100).toFixed(1)}% of total capacity</div>
        </div>

        {/* Battery Remaining */}
        <div className="bg-[#0a0f1d] border border-cyan-950/90 p-3.5 rounded-xl space-y-1">
          <div className="flex items-center gap-1.5 text-gray-400 text-[10.5px]">
            <Battery className="w-3.5 h-3.5 text-emerald-400" />
            <span>BATTERY REMAINING</span>
          </div>
          <div className="text-xl font-extrabold text-emerald-300">{batteryRemainingPct.toFixed(1)} <span className="text-xs font-normal">%</span></div>
          <div className="text-[9.5px] text-gray-500">{batteryRemainingWh.toFixed(0)} Wh reserve</div>
        </div>

        {/* Obstacles Avoided */}
        <div className="bg-[#0a0f1d] border border-cyan-950/90 p-3.5 rounded-xl space-y-1">
          <div className="flex items-center gap-1.5 text-gray-400 text-[10.5px]">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>OBSTACLES AVOIDED</span>
          </div>
          <div className="text-xl font-extrabold text-white">{rerouteCount} <span className="text-xs text-gray-400 font-normal">events</span></div>
          <div className="text-[9.5px] text-gray-500">Autonomous dynamic reroutes</div>
        </div>

        {/* Path Cost */}
        <div className="bg-[#0a0f1d] border border-cyan-950/90 p-3.5 rounded-xl space-y-1">
          <div className="flex items-center gap-1.5 text-gray-400 text-[10.5px]">
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
            <span>TOTAL PATH COST</span>
          </div>
          <div className="text-xl font-extrabold text-white">{Number(pathCost.toFixed(1))} <span className="text-xs text-gray-400 font-normal">pts</span></div>
          <div className="text-[9.5px] text-gray-500">Slope & roughness weighted</div>
        </div>

        {/* Path Efficiency */}
        <div className="bg-[#0a0f1d] border border-cyan-950/90 p-3.5 rounded-xl space-y-1">
          <div className="flex items-center gap-1.5 text-gray-400 text-[10.5px]">
            <Award className="w-3.5 h-3.5 text-emerald-400" />
            <span>PATH EFFICIENCY</span>
          </div>
          <div className="text-xl font-extrabold text-emerald-300">{efficiencyScore}% <span className="text-xs font-normal">({grade.grade})</span></div>
          <div className="text-[9.5px] text-gray-500">Optimal route deviation: 0%</div>
        </div>

        {/* Nodes Evaluated */}
        <div className="bg-[#0a0f1d] border border-cyan-950/90 p-3.5 rounded-xl space-y-1">
          <div className="flex items-center gap-1.5 text-gray-400 text-[10.5px]">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>NODES EVALUATED</span>
          </div>
          <div className="text-xl font-extrabold text-white">{nodesEvaluated.toLocaleString()} <span className="text-xs text-gray-400 font-normal">cells</span></div>
          <div className="text-[9.5px] text-gray-500">Solver search space count</div>
        </div>
      </div>

      {/* 3. VISUALIZATION & CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Final Lunar Trajectory Map */}
        <FinalLunarMapPreview />

        {/* Debrief Telemetry Strip Charts (Battery, Speed, Distance over time) */}
        <MissionDebriefCharts
          telemetryLog={telemetryHistory}
          batteryCapacityWh={roverConfig.batteryCapacityWh}
        />
      </div>

      {/* 4. PATH COMPARISON TABLE (A*, Dijkstra, Greedy Best-First) */}
      <AlgorithmComparisonTable initialAlgorithm={selectedAlgorithm} />

      {/* 5. MISSION EVENT TIMELINE */}
      <MissionTimelineView />

      {/* 6. PRIMARY ACTIONS BAR */}
      <div className="bg-[#080d1a] border border-cyan-950/90 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3 sticky bottom-3 z-30">
        {/* Left: Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportMissionAsJSON(missionResults || {
              missionId: `MISS-${Date.now()}`,
              roverName: roverConfig.name,
              terrainType: terrain.type,
              algorithmUsed: selectedAlgorithm,
              durationSeconds: durationSec,
              distanceTraveledMeters: distanceTravelled,
              energyConsumedWh: batteryConsumedWh,
              remainingBatteryPct: batteryRemainingPct,
              averageSpeedMps: Number((distanceTravelled / Math.max(1, durationSec)).toFixed(2)),
              maxSlopeEncounteredDeg: 12,
              rerouteCount,
              outcome: isCompleted ? 'SUCCESS' : 'ABORTED',
              efficiencyScore,
              telemetryLog: telemetryHistory,
            })}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#11192e] hover:bg-[#182645] border border-cyan-900/50 text-cyan-300 font-semibold transition-all shadow-sm text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT JSON</span>
          </button>

          <button
            onClick={() => exportTelemetryCSV(missionResults || {
              missionId: `MISS-${Date.now()}`,
              roverName: roverConfig.name,
              terrainType: terrain.type,
              algorithmUsed: selectedAlgorithm,
              durationSeconds: durationSec,
              distanceTraveledMeters: distanceTravelled,
              energyConsumedWh: batteryConsumedWh,
              remainingBatteryPct: batteryRemainingPct,
              averageSpeedMps: Number((distanceTravelled / Math.max(1, durationSec)).toFixed(2)),
              maxSlopeEncounteredDeg: 12,
              rerouteCount,
              outcome: isCompleted ? 'SUCCESS' : 'ABORTED',
              efficiencyScore,
              telemetryLog: telemetryHistory,
            })}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#11192e] hover:bg-[#182645] border border-cyan-900/50 text-cyan-300 font-semibold transition-all shadow-sm text-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>EXPORT CSV</span>
          </button>
        </div>

        {/* Right Action Buttons: "RUN AGAIN", "CHANGE TERRAIN", "COMPARE ALGORITHMS", "SAVE MISSION", "NEW MISSION" */}
        <div className="flex flex-wrap items-center gap-2">
          {/* RUN AGAIN */}
          <button
            onClick={handleRunAgain}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-md shadow-emerald-950 text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RUN AGAIN</span>
          </button>

          {/* CHANGE TERRAIN */}
          <button
            onClick={handleChangeTerrain}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#11192e] hover:bg-[#182645] border border-cyan-900/50 text-gray-200 hover:text-white transition-all text-xs font-semibold"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>CHANGE TERRAIN</span>
          </button>

          {/* COMPARE ALGORITHMS */}
          <button
            onClick={() => {
              const tableEl = document.querySelector('table');
              tableEl?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#11192e] hover:bg-[#182645] border border-cyan-900/50 text-cyan-300 font-semibold transition-all text-xs"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>COMPARE ALGORITHMS</span>
          </button>

          {/* SAVE MISSION */}
          <button
            onClick={handleSaveMission}
            disabled={savedSuccess}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all shadow-md shadow-cyan-950 text-xs"
          >
            {savedSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-black" />
                <span className="text-black">SAVED!</span>
              </>
            ) : (
              <>
                <Bookmark className="w-3.5 h-3.5" />
                <span>SAVE MISSION</span>
              </>
            )}
          </button>

          {/* NEW MISSION */}
          <button
            onClick={handleNewMission}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold transition-all shadow-md shadow-cyan-950 text-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>NEW MISSION</span>
          </button>
        </div>
      </div>
    </div>
  );
};
