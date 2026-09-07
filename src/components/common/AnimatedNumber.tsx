'use client';

import React, { useEffect, useState, useRef } from 'react';

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  decimals = 1,
  suffix = '',
  prefix = '',
  className = '',
}) => {
  const [displayValue, setDisplayValue] = useState(value);
  const targetRef = useRef(value);
  const currentRef = useRef(value);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    targetRef.current = value;

    const step = () => {
      const delta = targetRef.current - currentRef.current;
      if (Math.abs(delta) < 0.001) {
        currentRef.current = targetRef.current;
        setDisplayValue(targetRef.current);
        return;
      }

      // Smooth exponential interpolation for telemetry values
      currentRef.current += delta * 0.25;
      setDisplayValue(currentRef.current);
      animFrameRef.current = requestAnimationFrame(step);
    };

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    animFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [value]);

  return (
    <span className={`inline-block font-mono tracking-tight tabular-nums ${className}`}>
      {prefix}
      {displayValue.toFixed(decimals)}
      {suffix}
    </span>
  );
};
