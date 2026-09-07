'use client';

import { useEffect, useRef } from 'react';
import { useMissionStore } from '@/core/simulation/missionStore';

export function useSimulation() {
  const simulationStatus = useMissionStore((s) => s.simulationStatus);
  const playbackSpeed = useMissionStore((s) => s.playbackSpeed);
  const tick = useMissionStore((s) => s.tick);

  const lastTimeRef = useRef<number | null>(null);
  const accumulatorRef = useRef<number>(0);

  useEffect(() => {
    if (
      simulationStatus !== 'RUNNING' &&
      simulationStatus !== 'REROUTING' &&
      simulationStatus !== 'HAZARD_REROUTING'
    ) {
      lastTimeRef.current = null;
      accumulatorRef.current = 0;
      return;
    }

    const FIXED_DT = 0.02; // 20ms physics step (50Hz)
    let animationFrameId: number;

    const loop = (time: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = time;
      }

      const elapsed = Math.min(0.2, (time - lastTimeRef.current) / 1000); // Cap frame delta at 200ms
      lastTimeRef.current = time;

      // Accelerate elapsed time with playback speed
      accumulatorRef.current += elapsed * playbackSpeed;

      // Step fixed simulation ticks
      let steps = 0;
      while (accumulatorRef.current >= FIXED_DT && steps < 10) {
        tick(FIXED_DT);
        accumulatorRef.current -= FIXED_DT;
        steps++;
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [simulationStatus, playbackSpeed, tick]);
}
