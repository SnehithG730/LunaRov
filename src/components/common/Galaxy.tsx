'use client';

import React, { useEffect, useRef } from 'react';
import { Renderer, Program, Mesh, Triangle } from 'ogl';

export interface GalaxyProps extends React.HTMLAttributes<HTMLDivElement> {
  focal?: [number, number];
  rotation?: [number, number];
  starSpeed?: number;
  density?: number;
  hueShift?: number;
  disableAnimation?: boolean;
  speed?: number;
  mouseInteraction?: boolean;
  glowIntensity?: number;
  saturation?: number;
  mouseRepulsion?: boolean;
  repulsionStrength?: number;
  twinkleIntensity?: number;
  rotationSpeed?: number;
  autoCenterRepulsion?: number;
  transparent?: boolean;
  lightMode?: boolean;
}

const VERTEX_SHADER = /* glsl */ `
  attribute vec2 uv;
  attribute vec2 position;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  varying vec2 vUv;

  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec2 uFocal;
  uniform vec2 uRotation;
  uniform float uStarSpeed;
  uniform float uDensity;
  uniform float uHueShift;
  uniform float uSpeed;
  uniform vec2 uMouse;
  uniform float uGlowIntensity;
  uniform float uSaturation;
  uniform float uMouseRepulsion;
  uniform float uTwinkleIntensity;
  uniform float uRotationSpeed;
  uniform float uRepulsionStrength;
  uniform float uMouseActivity;
  uniform float uAutoCenterRepulsion;
  uniform float uTransparent;
  uniform float uLightMode;

  // -------------------------------------------------------------
  // Hash function for pseudo-random 2D generation
  // -------------------------------------------------------------
  float Hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  vec2 Hash22(vec2 p) {
    float n = sin(dot(p, vec2(41.0, 289.0)));
    return fract(vec2(262144.0, 32768.0) * n);
  }

  // -------------------------------------------------------------
  // Color Space Conversions (RGB <-> HSV)
  // -------------------------------------------------------------
  vec3 rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
  }

  vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  }

  // -------------------------------------------------------------
  // 2D Rotation Matrix
  // -------------------------------------------------------------
  mat2 rotate2D(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat2(c, -s, s, c);
  }

  // -------------------------------------------------------------
  // Individual Procedural Star Generator
  // -------------------------------------------------------------
  float RenderStar(vec2 uv, float flare, float size, float glow, float twinkle) {
    float d = length(uv);
    
    // Bright central core glow
    float core = (0.015 * size * glow) / (d + 0.001);
    core = smoothstep(0.0, 1.0, core);

    // Soft radial halo
    float halo = exp(-d * (14.0 / (size + 0.001))) * glow * 1.8;

    // Cross-shaped 4-point flare rays
    float rays = 0.0;
    if (flare > 0.1) {
      // 45-degree rotated rays matrix
      mat2 rot45 = rotate2D(0.785398);
      vec2 rUv1 = uv;
      vec2 rUv2 = rot45 * uv;

      float ray1 = max(0.0, 1.0 - abs(rUv1.x * 35.0 / (size + 0.1))) * max(0.0, 1.0 - abs(rUv1.y * 3.5));
      float ray2 = max(0.0, 1.0 - abs(rUv1.y * 35.0 / (size + 0.1))) * max(0.0, 1.0 - abs(rUv1.x * 3.5));
      float ray3 = max(0.0, 1.0 - abs(rUv2.x * 45.0 / (size + 0.1))) * max(0.0, 1.0 - abs(rUv2.y * 5.0));
      float ray4 = max(0.0, 1.0 - abs(rUv2.y * 45.0 / (size + 0.1))) * max(0.0, 1.0 - abs(rUv2.x * 5.0));

      rays = (ray1 + ray2 + (ray3 + ray4) * 0.6) * flare * glow * 1.5;
    }

    return (core + halo + rays) * twinkle;
  }

  // -------------------------------------------------------------
  // Procedural Star Layer with Neighboring Cells
  // -------------------------------------------------------------
  vec3 StarLayer(vec2 uv, float scale, float density, float seed, float speedMultiplier, float brightness) {
    vec3 layerColor = vec3(0.0);
    vec2 gridUv = uv * scale;
    vec2 id = floor(gridUv);
    vec2 gv = fract(gridUv) - 0.5;

    // Time-based movement for this depth layer
    float t = uTime * uSpeed * uStarSpeed * speedMultiplier;

    // 3x3 neighboring cell loop to prevent seams/gaps
    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec2 offset = vec2(float(x), float(y));
        vec2 cellId = id + offset;

        // Deterministic random seed for current cell
        float randVal = Hash21(cellId + seed);

        // Density threshold check
        if (randVal > (1.0 - (0.28 * density * uDensity))) {
          vec2 randPos = Hash22(cellId + seed * 13.1);
          
          // Star position within cell (with local micro-motion)
          vec2 starPos = (randPos - 0.5) * 0.8;
          starPos += vec2(sin(t + randVal * 6.28), cos(t * 0.8 + randVal * 6.28)) * 0.06;

          vec2 delta = gv - offset - starPos;

          // Star properties
          float starSize = mix(0.4, 1.6, Hash21(cellId + 71.3));
          float flareStrength = step(0.82, randVal) * mix(0.4, 1.2, Hash21(cellId + 93.7));

          // Twinkle calculation using triangle-wave brightness oscillation
          float twinklePhase = uTime * (1.5 + randVal * 3.5) + randVal * 6.28;
          float triangleWave = abs(fract(twinklePhase * 0.15915) * 2.0 - 1.0);
          float twinkle = mix(1.0, mix(0.2, 1.8, triangleWave), uTwinkleIntensity);

          // Star rendering
          float starLum = RenderStar(delta, flareStrength, starSize, uGlowIntensity, twinkle);

          // Procedural Star Color Generation
          vec3 baseColor;
          float colorPick = Hash21(cellId + 31.9);
          if (colorPick < 0.33) {
            // Cyan / Ice Blue
            baseColor = vec3(0.25, 0.85, 1.0);
          } else if (colorPick < 0.66) {
            // Purple / Deep Violet
            baseColor = vec3(0.75, 0.45, 1.0);
          } else {
            // Pure White / Warm Amber
            baseColor = vec3(1.0, 0.95, 0.9);
          }

          // Convert to HSV for HueShift and Saturation adjustments
          vec3 hsv = rgb2hsv(baseColor);
          hsv.x = fract(hsv.x + (uHueShift / 360.0));
          hsv.y = clamp(hsv.y + uSaturation, 0.0, 1.0);
          vec3 finalRgb = hsv2rgb(hsv);

          layerColor += finalRgb * starLum * brightness;
        }
      }
    }

    return layerColor;
  }

  void main() {
    // Aspect ratio corrected coordinates
    vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
    vec2 uv = (vUv - uFocal) * aspect;

    // Apply Base & Continuous Rotation
    float baseAngle = atan(uRotation.y, uRotation.x);
    float totalRotation = baseAngle + uTime * uRotationSpeed * 0.05 * uSpeed;
    uv = rotate2D(totalRotation) * uv;

    // Normalized Mouse Coordinates
    vec2 mouseNorm = (uMouse - uFocal) * aspect;
    mouseNorm = rotate2D(totalRotation) * mouseNorm;

    // Interaction Modes: Repulsion, Center Repulsion, or Parallax
    if (uAutoCenterRepulsion > 0.0) {
      // Automatic Center Repulsion
      float centerDist = length(uv);
      vec2 centerDir = normalize(uv + vec2(0.0001));
      uv += centerDir * (0.15 * uAutoCenterRepulsion / (centerDist + 0.3));
    } else if (uMouseRepulsion > 0.5) {
      // Interactive Mouse Repulsion
      float mouseDist = length(uv - mouseNorm);
      vec2 repulseDir = normalize(uv - mouseNorm + vec2(0.0001));
      float repulsion = (0.08 * uRepulsionStrength * uMouseActivity) / (mouseDist + 0.25);
      uv += repulseDir * repulsion;
    } else {
      // Subtle Mouse Parallax
      uv -= mouseNorm * 0.08 * uMouseActivity;
    }

    // -------------------------------------------------------------
    // Multi-Depth Galaxy (Exactly 4 Procedural Depth Layers)
    // -------------------------------------------------------------
    vec3 col = vec3(0.0);

    // Layer 1: Foreground (Large glowing stars, high parallax speed)
    col += StarLayer(uv, 3.5, 0.8, 101.1, 1.4, 1.25);

    // Layer 2: Mid-ground (Medium density, balanced scale)
    col += StarLayer(uv, 6.0, 1.0, 203.7, 1.0, 1.0);

    // Layer 3: Background (Dense clusters, smaller stars)
    col += StarLayer(uv, 11.0, 1.2, 307.3, 0.65, 0.8);

    // Layer 4: Deep Distant Dust / Micro-Stars (Atmospheric depth)
    col += StarLayer(uv, 22.0, 1.5, 409.9, 0.35, 0.55);

    // Subtle Volumetric Space Dust Nebulae Background
    float dust = Hash21(floor(uv * 2.5)) * 0.02;
    col += vec3(0.05, 0.12, 0.22) * dust * uGlowIntensity;

    // Light Mode Support (Dark ink-like star pattern on white)
    if (uLightMode > 0.5) {
      col = vec3(1.0) - col;
    }

    // Transparency / Alpha calculation
    float alpha = 1.0;
    if (uTransparent > 0.5 && uLightMode < 0.5) {
      alpha = clamp(max(col.r, max(col.g, col.b)) * 1.5, 0.0, 1.0);
    }

    gl_FragColor = vec4(col, alpha);
  }
`;

export const Galaxy: React.FC<GalaxyProps> = ({
  focal = [0.5, 0.5],
  rotation = [1.0, 0.0],
  starSpeed = 0.5,
  density = 1,
  hueShift = 140,
  disableAnimation = false,
  speed = 1.0,
  mouseInteraction = true,
  glowIntensity = 0.3,
  saturation = 0.0,
  mouseRepulsion = true,
  repulsionStrength = 2,
  twinkleIntensity = 0.3,
  rotationSpeed = 0.1,
  autoCenterRepulsion = 0,
  transparent = true,
  lightMode = false,
  className = '',
  style,
  ...restProps
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Mouse interpolation state
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const targetMouseRef = useRef({ x: 0.5, y: 0.5 });
  const mouseActivityRef = useRef(0.0);
  const targetMouseActivityRef = useRef(0.0);

  // Animation & OGL instances
  const animFrameIdRef = useRef<number | null>(null);
  const programRef = useRef<Program | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const timeRef = useRef<number>(0);

  // Synchronize dynamic React props to OGL uniforms
  useEffect(() => {
    if (!programRef.current) return;
    const u = programRef.current.uniforms;
    u.uFocal.value = focal;
    u.uRotation.value = rotation;
    u.uStarSpeed.value = starSpeed;
    u.uDensity.value = density;
    u.uHueShift.value = hueShift;
    u.uSpeed.value = speed;
    u.uGlowIntensity.value = glowIntensity;
    u.uSaturation.value = saturation;
    u.uMouseRepulsion.value = mouseRepulsion ? 1.0 : 0.0;
    u.uTwinkleIntensity.value = twinkleIntensity;
    u.uRotationSpeed.value = rotationSpeed;
    u.uRepulsionStrength.value = repulsionStrength;
    u.uAutoCenterRepulsion.value = autoCenterRepulsion;
    u.uTransparent.value = transparent ? 1.0 : 0.0;
    u.uLightMode.value = lightMode ? 1.0 : 0.0;
  }, [
    focal,
    rotation,
    starSpeed,
    density,
    hueShift,
    speed,
    glowIntensity,
    saturation,
    mouseRepulsion,
    twinkleIntensity,
    rotationSpeed,
    repulsionStrength,
    autoCenterRepulsion,
    transparent,
    lightMode,
  ]);

  // Main OGL WebGL Initialization & Animation Lifecycle
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Create OGL Renderer
    const renderer = new Renderer({
      alpha: transparent,
      premultipliedAlpha: false,
      powerPreference: 'high-performance',
      antialias: false,
    });
    const gl = renderer.gl;
    rendererRef.current = renderer;

    if (transparent) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0);
    } else if (lightMode) {
      gl.clearColor(1, 1, 1, 1);
    } else {
      gl.clearColor(0.02, 0.03, 0.07, 1);
    }

    // 2. Fullscreen Triangle Geometry
    const geometry = new Triangle(gl);

    // 3. GLSL Program with all Uniforms
    const program = new Program(gl, {
      vertex: VERTEX_SHADER,
      fragment: FRAGMENT_SHADER,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: [container.clientWidth || 800, container.clientHeight || 600] },
        uFocal: { value: focal },
        uRotation: { value: rotation },
        uStarSpeed: { value: starSpeed },
        uDensity: { value: density },
        uHueShift: { value: hueShift },
        uSpeed: { value: speed },
        uMouse: { value: [0.5, 0.5] },
        uGlowIntensity: { value: glowIntensity },
        uSaturation: { value: saturation },
        uMouseRepulsion: { value: mouseRepulsion ? 1.0 : 0.0 },
        uTwinkleIntensity: { value: twinkleIntensity },
        uRotationSpeed: { value: rotationSpeed },
        uRepulsionStrength: { value: repulsionStrength },
        uMouseActivity: { value: 0.0 },
        uAutoCenterRepulsion: { value: autoCenterRepulsion },
        uTransparent: { value: transparent ? 1.0 : 0.0 },
        uLightMode: { value: lightMode ? 1.0 : 0.0 },
      },
      depthTest: false,
      depthWrite: false,
    });
    programRef.current = program;

    // 4. Mesh
    const mesh = new Mesh(gl, { geometry, program });

    // 5. Append Canvas to Container
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(gl.canvas);

    // 6. Responsive Resize Observer & Listener
    const handleResize = () => {
      if (!container || !renderer || !program) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      renderer.setSize(width, height);
      program.uniforms.uResolution.value = [width, height];
    };
    window.addEventListener('resize', handleResize);

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // 7. Mouse Interaction Listeners
    const handleMouseMove = (e: MouseEvent) => {
      if (!mouseInteraction || !container) return;
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1.0 - (e.clientY - rect.top) / rect.height;
      targetMouseRef.current = { x, y };
      targetMouseActivityRef.current = 1.0;
    };

    const handleMouseEnter = () => {
      if (!mouseInteraction) return;
      targetMouseActivityRef.current = 1.0;
    };

    const handleMouseLeave = () => {
      if (!mouseInteraction) return;
      targetMouseActivityRef.current = 0.0;
    };

    if (mouseInteraction) {
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseenter', handleMouseEnter);
      container.addEventListener('mouseleave', handleMouseLeave);
    }

    // 8. Continuous Animation Render Loop
    let lastTime = performance.now();

    const animate = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      if (!disableAnimation) {
        timeRef.current += delta;
      }

      // Smooth Mouse Position & Activity Lerping
      mouseRef.current.x += (targetMouseRef.current.x - mouseRef.current.x) * 0.06;
      mouseRef.current.y += (targetMouseRef.current.y - mouseRef.current.y) * 0.06;
      mouseActivityRef.current += (targetMouseActivityRef.current - mouseActivityRef.current) * 0.05;

      // Update uniforms
      program.uniforms.uTime.value = timeRef.current;
      program.uniforms.uMouse.value = [mouseRef.current.x, mouseRef.current.y];
      program.uniforms.uMouseActivity.value = mouseActivityRef.current;

      renderer.render({ scene: mesh });
      animFrameIdRef.current = requestAnimationFrame(animate);
    };

    animFrameIdRef.current = requestAnimationFrame(animate);

    // 9. Cleanup
    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();

      if (mouseInteraction) {
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mouseenter', handleMouseEnter);
        container.removeEventListener('mouseleave', handleMouseLeave);
      }

      if (gl.canvas && container.contains(gl.canvas)) {
        container.removeChild(gl.canvas);
      }

      // Lose WebGL context cleanly
      const loseContextExt = gl.getExtension('WEBGL_lose_context');
      if (loseContextExt) {
        loseContextExt.loseContext();
      }
    };
  }, [disableAnimation, mouseInteraction, transparent, lightMode, autoCenterRepulsion, density, focal, glowIntensity, hueShift, mouseRepulsion, repulsionStrength, rotation, rotationSpeed, saturation, speed, starSpeed, twinkleIntensity]);

  return (
    <div
      ref={containerRef}
      className={`galaxy-container ${className}`}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
      {...restProps}
    />
  );
};
