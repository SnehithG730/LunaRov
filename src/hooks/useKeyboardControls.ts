'use client';

import { useEffect } from 'react';
import { useMissionStore } from '@/core/simulation/missionStore';

export function useKeyboardControls() {
  const selectedAlgorithm = useMissionStore((s) => s.selectedAlgorithm);
  const simulationStatus = useMissionStore((s) => s.simulationStatus);
  const setManualInput = useMissionStore((s) => s.setManualInput);

  useEffect(() => {
    if (selectedAlgorithm !== 'MANUAL' || simulationStatus !== 'RUNNING') {
      return;
    }

    const pressedKeys = new Set<string>();

    const updateControls = () => {
      let throttle = 0;
      let steering = 0;

      // Emergency Brake / Stop
      if (pressedKeys.has('Space')) {
        setManualInput({ throttle: 0, steering: 0 });
        return;
      }

      if (pressedKeys.has('KeyW') || pressedKeys.has('ArrowUp')) throttle += 1.0;
      if (pressedKeys.has('KeyS') || pressedKeys.has('ArrowDown')) throttle -= 0.6;
      if (pressedKeys.has('KeyA') || pressedKeys.has('ArrowLeft')) steering -= 1.0;
      if (pressedKeys.has('KeyD') || pressedKeys.has('ArrowRight')) steering += 1.0;

      setManualInput({ throttle, steering });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'].includes(e.code)) {
        e.preventDefault();
        pressedKeys.add(e.code);
        updateControls();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (pressedKeys.has(e.code)) {
        pressedKeys.delete(e.code);
        updateControls();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      setManualInput({ throttle: 0, steering: 0 });
    };
  }, [selectedAlgorithm, simulationStatus, setManualInput]);
}
