'use client';

import React from 'react';
import { InteractiveLunarMap, MapInteractionMode } from '@/components/map/InteractiveLunarMap';

interface Viewport3DProps {
  clickMode?: 'NONE' | 'SET_START' | 'SET_TARGET' | 'BRUSH';
}

export const Viewport3D: React.FC<Viewport3DProps> = ({ clickMode = 'NONE' }) => {
  let mode: MapInteractionMode = 'INSPECT';
  if (clickMode === 'SET_START') mode = 'SET_START';
  else if (clickMode === 'SET_TARGET') mode = 'SET_TARGET';
  else if (clickMode === 'BRUSH') mode = 'PLACE_OBSTACLE';

  return (
    <div className="w-full h-full min-h-[380px]">
      <InteractiveLunarMap initialMode={mode} />
    </div>
  );
};
