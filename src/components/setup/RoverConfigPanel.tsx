'use client';

import React from 'react';
import { useMissionStore } from '@/core/simulation/missionStore';
import { Sliders, Battery, Gauge, Radar } from 'lucide-react';

export const RoverConfigPanel: React.FC = () => {
  const roverConfig = useMissionStore((s) => s.roverConfig);
  const setRoverConfig = useMissionStore((s) => s.setRoverConfig);
  const simulationStatus = useMissionStore((s) => s.simulationStatus);

  const disabled = simulationStatus === 'RUNNING';

  return (
    <div className="bg-[#0a0f1d] border border-cyan-950/80 rounded-xl p-3 shadow-lg space-y-3 font-mono text-xs">
      <div className="flex items-center justify-between border-b border-cyan-900/40 pb-2">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-gray-200">ROVER SPECIFICATIONS</span>
        </div>
        <span className="text-[10px] text-cyan-400 font-bold">{roverConfig.name}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Rover Name */}
        <div className="space-y-1">
          <label className="text-[10px] text-gray-400 flex items-center justify-between">
            <span>VEHICLE IDENTIFIER</span>
          </label>
          <input
            type="text"
            value={roverConfig.name}
            disabled={disabled}
            onChange={(e) => setRoverConfig({ name: e.target.value })}
            className="w-full bg-[#0e1628] border border-cyan-900/60 rounded px-2.5 py-1.5 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
          />
        </div>

        {/* Max Speed */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-gray-400 flex items-center gap-1">
              <Gauge className="w-3 h-3 text-cyan-400" />
              <span>MAX VELOCITY:</span>
            </span>
            <span className="text-cyan-300 font-bold">{roverConfig.maxSpeed.toFixed(1)} m/s</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="4.0"
            step="0.1"
            value={roverConfig.maxSpeed}
            disabled={disabled}
            onChange={(e) => setRoverConfig({ maxSpeed: parseFloat(e.target.value) })}
            className="w-full accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Battery Capacity */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-gray-400 flex items-center gap-1">
              <Battery className="w-3 h-3 text-amber-400" />
              <span>BATTERY CAPACITY:</span>
            </span>
            <span className="text-amber-300 font-bold">{roverConfig.batteryCapacityWh} Wh</span>
          </div>
          <input
            type="range"
            min="400"
            max="3000"
            step="100"
            value={roverConfig.batteryCapacityWh}
            disabled={disabled}
            onChange={(e) => setRoverConfig({ batteryCapacityWh: parseInt(e.target.value) })}
            className="w-full accent-amber-400 cursor-pointer"
          />
        </div>

        {/* Sensor Range */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-gray-400 flex items-center gap-1">
              <Radar className="w-3 h-3 text-cyan-400" />
              <span>LIDAR RANGE:</span>
            </span>
            <span className="text-cyan-300 font-bold">{roverConfig.sensorRangeMeters.toFixed(0)} m</span>
          </div>
          <input
            type="range"
            min="6"
            max="24"
            step="2"
            value={roverConfig.sensorRangeMeters}
            disabled={disabled}
            onChange={(e) => setRoverConfig({ sensorRangeMeters: parseFloat(e.target.value) })}
            className="w-full accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Turning Rate */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-gray-400">TURNING AGILITY:</span>
            <span className="text-white font-bold">{roverConfig.turningRate}°/s</span>
          </div>
          <input
            type="range"
            min="20"
            max="120"
            step="5"
            value={roverConfig.turningRate}
            disabled={disabled}
            onChange={(e) => setRoverConfig({ turningRate: parseInt(e.target.value) })}
            className="w-full accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Vehicle Mass */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-gray-400">PAYLOAD MASS:</span>
            <span className="text-white font-bold">{roverConfig.massKg} kg</span>
          </div>
          <input
            type="range"
            min="80"
            max="350"
            step="10"
            value={roverConfig.massKg}
            disabled={disabled}
            onChange={(e) => setRoverConfig({ massKg: parseInt(e.target.value) })}
            className="w-full accent-cyan-400 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
