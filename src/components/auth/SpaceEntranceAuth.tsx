'use client';

import React, { useState, useEffect, useRef, useId } from 'react';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Globe,
  Compass,
} from 'lucide-react';

export interface AuthUserData {
  name: string;
  email: string;
  isAuthenticated: boolean;
  avatarSeed?: string;
  loginTimestamp?: number;
}

interface SpaceEntranceAuthProps {
  onLoginSuccess: (user: AuthUserData) => void;
  onSkip?: () => void;
}

type AuthPhase =
  | 'INITIAL'           // 1. Initial Screen: Floating rocket, Earth & Satellite, "ENTER ->" button
  | 'ORBITING'          // 2. Rocket enters orbital circular path around center
  | 'FORM_ACTIVE'       // 3 & 4. Cloud login form appears with real-time validation
  | 'AUTHENTICATING'   // 5. Authenticating spinner & verification
  | 'LAUNCHING'         // 6. Rocket ignites flame plume and launches upward
  | 'WARP_TRANSITION';  // 7. Warp-speed tunnel & "Welcome Aboard!" message

export const SpaceEntranceAuth: React.FC<SpaceEntranceAuthProps> = ({
  onLoginSuccess,
  onSkip,
}) => {
  const [phase, setPhase] = useState<AuthPhase>('INITIAL');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Form touched states for UX validation
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
  });

  // Canvas for background cosmic stars & particles
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Validation logic
  const isNameValid = name.trim().length >= 2;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isPasswordValid = password.length >= 6;
  const isFormValid = isNameValid && isEmailValid && isPasswordValid;

  // Starfield & warp animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Generate stars
    const starCount = 200;
    const stars = Array.from({ length: starCount }, () => ({
      x: (Math.random() - 0.5) * width * 2,
      y: (Math.random() - 0.5) * height * 2,
      z: Math.random() * width,
      size: Math.random() * 2 + 0.5,
      color: Math.random() > 0.8 ? '#38bdf8' : Math.random() > 0.6 ? '#c084fc' : '#ffffff',
    }));

    let warpSpeed = 1;

    const render = () => {
      if (phase === 'WARP_TRANSITION' || phase === 'LAUNCHING') {
        warpSpeed = Math.min(warpSpeed + 0.5, 35);
      } else {
        warpSpeed = 1;
      }

      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;

      stars.forEach((star) => {
        star.z -= warpSpeed;
        if (star.z <= 0) {
          star.z = width;
          star.x = (Math.random() - 0.5) * width * 2;
          star.y = (Math.random() - 0.5) * height * 2;
        }

        const k = 250 / star.z;
        const px = star.x * k + cx;
        const py = star.y * k + cy;

        if (px >= 0 && px < width && py >= 0 && py < height) {
          const depthAlpha = Math.min(1, Math.max(0.2, 1 - star.z / width));
          ctx.beginPath();
          if (warpSpeed > 5) {
            // Draw warp light streak
            const prevK = 250 / (star.z + warpSpeed * 3);
            const prevPx = star.x * prevK + cx;
            const prevPy = star.y * prevK + cy;
            ctx.moveTo(prevPx, prevPy);
            ctx.lineTo(px, py);
            ctx.strokeStyle = star.color;
            ctx.lineWidth = star.size * 1.5;
            ctx.stroke();
          } else {
            ctx.arc(px, py, star.size * depthAlpha, 0, Math.PI * 2);
            ctx.fillStyle = star.color;
            ctx.globalAlpha = depthAlpha;
            ctx.fill();
            ctx.globalAlpha = 1.0;
          }
        }
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
    };
  }, [phase]);

  // Handle Step 1 -> 2 & 3: Click "ENTER ->"
  const handleEnterClick = () => {
    setPhase('ORBITING');
    setTimeout(() => {
      setPhase('FORM_ACTIVE');
    }, 1800);
  };

  // Handle Step 4 -> 5 -> 6 -> 7 -> 8: Submit Form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    // Phase 5: Authenticating
    setPhase('AUTHENTICATING');

    setTimeout(() => {
      // Phase 6: Rocket Launch
      setPhase('LAUNCHING');

      setTimeout(() => {
        // Phase 7: Warp Speed Transition
        setPhase('WARP_TRANSITION');

        setTimeout(() => {
          // Phase 8: Main Dashboard
          const user: AuthUserData = {
            name: name.trim(),
            email: email.trim().toLowerCase(),
            isAuthenticated: true,
            avatarSeed: name.trim().toLowerCase(),
            loginTimestamp: Date.now(),
          };
          onLoginSuccess(user);
        }, 2600);
      }, 1600);
    }, 1800);
  };

  const nameInputId = useId();
  const emailInputId = useId();
  const passwordInputId = useId();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#030712] font-sans select-none">
      {/* Background Starfield Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      {/* Realistic Distant Moon / Celestial Body */}
      <div className="absolute top-12 left-12 w-28 h-28 rounded-full bg-gradient-to-tr from-slate-900 via-slate-700 to-slate-400 opacity-70 shadow-2xl shadow-cyan-950/40 pointer-events-none animate-pulse-slow">
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-300/20 via-transparent to-black/80" />
        {/* Procedural Moon Craters */}
        <div className="absolute top-5 left-6 w-5 h-4 rounded-full bg-slate-800/80 border border-slate-600/40 shadow-inner" />
        <div className="absolute bottom-6 right-7 w-7 h-5 rounded-full bg-slate-800/70 border border-slate-600/40 shadow-inner" />
        <div className="absolute top-12 right-4 w-3 h-3 rounded-full bg-slate-800/60" />
      </div>

      {/* Orbiting Satellite */}
      <div className="absolute top-20 right-20 pointer-events-none animate-float-satellite z-10">
        <div className="relative flex items-center space-x-1.5 opacity-90 scale-90">
          {/* Solar panels left */}
          <div className="w-8 h-4 bg-gradient-to-r from-blue-700 to-cyan-500 rounded border border-cyan-400/60 shadow-lg shadow-cyan-500/40 grid grid-cols-2 gap-0.5 p-0.5">
            <div className="bg-black/30 rounded-xs" />
            <div className="bg-black/30 rounded-xs" />
          </div>
          {/* Satellite core */}
          <div className="w-5 h-5 bg-gradient-to-tr from-slate-600 via-slate-300 to-white rounded-xs shadow-md border border-white/60 flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
          </div>
          {/* Solar panels right */}
          <div className="w-8 h-4 bg-gradient-to-r from-cyan-500 to-blue-700 rounded border border-cyan-400/60 shadow-lg shadow-cyan-500/40 grid grid-cols-2 gap-0.5 p-0.5">
            <div className="bg-black/30 rounded-xs" />
            <div className="bg-black/30 rounded-xs" />
          </div>
        </div>
      </div>

      {/* Realistic Curved Earth at Bottom with Atmosphere and City Lights */}
      <div className="absolute -bottom-[38vw] sm:-bottom-[30vw] md:-bottom-[26vw] left-1/2 -translate-x-1/2 w-[160vw] md:w-[130vw] aspect-square rounded-full pointer-events-none z-0 overflow-hidden shadow-[0_-25px_80px_rgba(56,189,248,0.35)]">
        {/* Earth sphere base */}
        <div className="w-full h-full bg-gradient-to-b from-[#0e3b68] via-[#08203e] to-[#020b18] relative">
          {/* Atmospheric Blue Glow */}
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-cyan-400/60 via-blue-500/30 to-transparent blur-md" />
          {/* Continental landmass textures & city lights */}
          <div className="absolute top-12 left-1/4 w-3/5 h-48 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-300/40 via-cyan-600/20 to-transparent blur-sm animate-pulse-slow" />
          <div className="absolute top-16 left-1/3 w-1/3 h-32 bg-amber-400/20 blur-md" />
          {/* Subtle cloud swirls */}
          <div className="absolute top-6 left-1/6 w-2/3 h-24 bg-white/15 rounded-full blur-xl transform -rotate-6" />
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. ORBITAL PATH VISUALIZER (When ENTER is clicked) */}
      {/* ========================================================= */}
      {(phase === 'ORBITING' || phase === 'FORM_ACTIVE' || phase === 'AUTHENTICATING') && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="w-[420px] sm:w-[540px] md:w-[680px] h-[220px] sm:h-[280px] md:h-[340px] rounded-[50%] border-2 border-dashed border-cyan-400/30 shadow-[0_0_30px_rgba(56,189,248,0.25)] animate-spin-orbital-slow transform -rotate-12" />
        </div>
      )}

      {/* ========================================================= */}
      {/* ROCKET COMPONENT (With 6 Dynamic Flight Behaviors) */}
      {/* ========================================================= */}
      <div
        className={`absolute z-30 transition-all duration-1000 ${
          phase === 'INITIAL'
            ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-28 scale-100 animate-float-rocket'
            : phase === 'ORBITING'
            ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-75 animate-rocket-orbit'
            : phase === 'FORM_ACTIVE' || phase === 'AUTHENTICATING'
            ? 'top-16 right-1/4 md:right-1/3 scale-50 rotate-45 animate-float-gentle'
            : phase === 'LAUNCHING'
            ? 'top-1/2 left-1/2 -translate-x-1/2 scale-125 -rotate-12 animate-rocket-launch'
            : 'opacity-0 scale-0 pointer-events-none'
        }`}
      >
        <div className="relative flex flex-col items-center">
          {/* Reference-Accurate Red-and-White Rocket */}
          <div className="relative w-16 h-32 sm:w-20 sm:h-40 drop-shadow-[0_0_25px_rgba(56,189,248,0.5)]">
            <svg
              viewBox="0 0 100 220"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full"
            >
              {/* Nose Cone */}
              <path
                d="M50 0C40 25 32 55 32 80H68C68 55 60 25 50 0Z"
                fill="#EF4444"
              />
              <path
                d="M50 0C45 25 40 55 40 80H50V0Z"
                fill="#DC2626"
                opacity="0.6"
              />
              {/* Rocket Body */}
              <rect x="32" y="80" width="36" height="85" fill="#F8FAFC" rx="2" />
              <rect x="48" y="80" width="20" height="85" fill="#E2E8F0" />
              {/* Cockpit Window */}
              <circle cx="50" cy="105" r="10" fill="#38BDF8" stroke="#0284C7" strokeWidth="2.5" />
              <circle cx="48" cy="102" r="3" fill="#FFFFFF" opacity="0.8" />
              {/* Aerospace stripe */}
              <rect x="32" y="130" width="36" height="6" fill="#EF4444" />
              {/* Left Wing / Booster */}
              <path
                d="M32 125C22 135 12 165 10 185C18 185 28 175 32 160V125Z"
                fill="#DC2626"
              />
              {/* Right Wing / Booster */}
              <path
                d="M68 125C78 135 88 165 90 185C82 185 72 175 68 160V125Z"
                fill="#EF4444"
              />
              {/* Center Engine Nozzle */}
              <path d="M38 165L42 180H58L62 165H38Z" fill="#475569" />
            </svg>
          </div>

          {/* Dynamic Thruster Fire & Exhaust Particles */}
          <div className="relative flex flex-col items-center -mt-2">
            <div
              className={`w-4 rounded-full bg-gradient-to-b from-amber-200 via-orange-500 to-transparent blur-[1px] animate-thruster ${
                phase === 'LAUNCHING' ? 'h-36 w-8 from-cyan-200 via-orange-500 to-red-600' : 'h-14'
              }`}
            />
            <div
              className={`w-8 h-8 rounded-full bg-orange-500/40 blur-md -mt-10 ${
                phase === 'LAUNCHING' ? 'scale-250 bg-cyan-400/80' : 'scale-100'
              }`}
            />
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. INITIAL PHASE: "ENTER ->" GLOWING CLOUD BUTTON */}
      {/* ========================================================= */}
      {phase === 'INITIAL' && (
        <div className="relative z-20 flex flex-col items-center mt-44 sm:mt-52 animate-fade-in">
          {/* Cloud-shaped Glow Pill Button */}
          <div className="relative group">
            {/* Cloud glow aura */}
            <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/50 via-blue-500/40 to-cyan-400/50 rounded-full blur-xl group-hover:blur-2xl transition-all opacity-80 group-hover:opacity-100 animate-pulse-slow" />

            <button
              onClick={handleEnterClick}
              className="relative flex items-center space-x-3 px-10 py-4.5 rounded-full bg-gradient-to-b from-cyan-400 via-cyan-500 to-blue-600 text-white font-mono font-bold text-base sm:text-lg tracking-wider border-2 border-white/60 shadow-[0_0_35px_rgba(56,189,248,0.8)] hover:scale-105 active:scale-95 transition-transform cursor-pointer"
            >
              <span>ENTER</span>
              <ArrowRight className="w-5 h-5 text-white group-hover:translate-x-1.5 transition-transform" />
            </button>
          </div>

          {/* Subtitle / Brand identity */}
          <div className="mt-8 flex items-center space-x-2 text-cyan-300/80 font-mono text-xs tracking-widest uppercase">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>LunaRov SpaceHub Gateway</span>
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          </div>

          {/* Quick guest bypass button */}
          {onSkip && (
            <button
              onClick={onSkip}
              className="mt-4 text-xs font-mono text-gray-400 hover:text-cyan-300 underline underline-offset-4 cursor-pointer transition-colors"
            >
              Direct Guest Exploration &rarr;
            </button>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 3, 4, 5. CLOUD-SHAPED LOGIN FORM (With Validation & Auth) */}
      {/* ========================================================= */}
      {(phase === 'FORM_ACTIVE' || phase === 'AUTHENTICATING') && (
        <div className="relative z-40 w-full max-w-md px-4 animate-cloud-rise">
          {/* Outer Cloud Container Styling */}
          <div className="relative p-8 sm:p-10 rounded-[40px] bg-gradient-to-b from-white/95 via-white/90 to-cyan-50/95 text-slate-900 shadow-[0_0_60px_rgba(56,189,248,0.7),_0_20px_40px_rgba(0,0,0,0.4)] backdrop-blur-xl border-4 border-white/80">
            {/* Cloud Puffs (Decorative 3D spheres around perimeter) */}
            <div className="absolute -top-6 -left-6 w-20 h-20 bg-white/90 rounded-full blur-[1px] -z-10 shadow-lg" />
            <div className="absolute -top-8 left-1/3 w-28 h-28 bg-white/95 rounded-full blur-[1px] -z-10 shadow-lg" />
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/90 rounded-full blur-[1px] -z-10 shadow-lg" />
            <div className="absolute -bottom-6 -left-4 w-20 h-20 bg-cyan-50/90 rounded-full blur-[1px] -z-10 shadow-lg" />
            <div className="absolute -bottom-8 right-1/4 w-28 h-28 bg-white/90 rounded-full blur-[1px] -z-10 shadow-lg" />

            {/* Cloud Header */}
            {phase === 'FORM_ACTIVE' && (
              <div className="text-center mb-6">
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-2">
                  <span>Welcome Back</span>
                </h2>
                <p className="text-xs sm:text-sm font-medium text-cyan-700/80 mt-1 font-mono">
                  Sign in to continue your journey
                </p>
              </div>
            )}

            {/* Phase 5: Authenticating State inside cloud */}
            {phase === 'AUTHENTICATING' ? (
              <div className="py-10 flex flex-col items-center justify-center text-center space-y-4 animate-fade-in">
                <div className="relative flex items-center justify-center w-20 h-20">
                  <div className="absolute inset-0 rounded-full border-4 border-cyan-400/30 animate-ping" />
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/50">
                    <CheckCircle2 className="w-9 h-9 text-white animate-bounce-slow" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Authenticating...</h3>
                  <p className="text-xs text-slate-600 font-mono mt-1">
                    Please wait while we verify your details
                  </p>
                </div>
                <div className="w-48 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-600 rounded-full animate-progress" />
                </div>
              </div>
            ) : (
              /* Phase 3 & 4: Interactive Input Form */
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Field 1: Name */}
                <div>
                  <label htmlFor={nameInputId} className="block text-xs font-bold text-slate-700 font-mono mb-1">
                    Name
                  </label>
                  <div className="relative flex items-center">
                    <User className="absolute left-3.5 w-4 h-4 text-cyan-600" />
                    <input
                      id={nameInputId}
                      type="text"
                      placeholder="Enter your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onBlur={() => setTouched((p) => ({ ...p, name: true }))}
                      required
                      className={`w-full pl-10 pr-10 py-3 text-sm font-medium rounded-full bg-cyan-50/70 border-2 transition-all outline-none text-slate-900 placeholder:text-slate-400 ${
                        touched.name && !isNameValid
                          ? 'border-red-400 bg-red-50/50'
                          : isNameValid
                          ? 'border-emerald-500 bg-white'
                          : 'border-cyan-200 focus:border-cyan-500 focus:bg-white'
                      }`}
                    />
                    {isNameValid && (
                      <CheckCircle2 className="absolute right-3.5 w-4 h-4 text-emerald-500" />
                    )}
                    {touched.name && !isNameValid && (
                      <AlertCircle className="absolute right-3.5 w-4 h-4 text-red-500" />
                    )}
                  </div>
                  {touched.name && !isNameValid && (
                    <p className="text-[10px] text-red-500 font-mono mt-1 ml-3">
                      Please enter at least 2 characters.
                    </p>
                  )}
                </div>

                {/* Field 2: Email */}
                <div>
                  <label htmlFor={emailInputId} className="block text-xs font-bold text-slate-700 font-mono mb-1">
                    Email
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3.5 w-4 h-4 text-cyan-600" />
                    <input
                      id={emailInputId}
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={() => setTouched((p) => ({ ...p, email: true }))}
                      required
                      className={`w-full pl-10 pr-10 py-3 text-sm font-medium rounded-full bg-cyan-50/70 border-2 transition-all outline-none text-slate-900 placeholder:text-slate-400 ${
                        touched.email && !isEmailValid
                          ? 'border-red-400 bg-red-50/50'
                          : isEmailValid
                          ? 'border-emerald-500 bg-white'
                          : 'border-cyan-200 focus:border-cyan-500 focus:bg-white'
                      }`}
                    />
                    {isEmailValid && (
                      <CheckCircle2 className="absolute right-3.5 w-4 h-4 text-emerald-500" />
                    )}
                    {touched.email && !isEmailValid && (
                      <AlertCircle className="absolute right-3.5 w-4 h-4 text-red-500" />
                    )}
                  </div>
                  {touched.email && !isEmailValid && (
                    <p className="text-[10px] text-red-500 font-mono mt-1 ml-3">
                      Enter a valid email address.
                    </p>
                  )}
                </div>

                {/* Field 3: Password */}
                <div>
                  <label htmlFor={passwordInputId} className="block text-xs font-bold text-slate-700 font-mono mb-1">
                    Password
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3.5 w-4 h-4 text-cyan-600" />
                    <input
                      id={passwordInputId}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onBlur={() => setTouched((p) => ({ ...p, password: true }))}
                      required
                      className={`w-full pl-10 pr-16 py-3 text-sm font-medium rounded-full bg-cyan-50/70 border-2 transition-all outline-none text-slate-900 placeholder:text-slate-400 ${
                        touched.password && !isPasswordValid
                          ? 'border-red-400 bg-red-50/50'
                          : isPasswordValid
                          ? 'border-emerald-500 bg-white'
                          : 'border-cyan-200 focus:border-cyan-500 focus:bg-white'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-9 text-slate-400 hover:text-cyan-600 transition-colors"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                    {isPasswordValid && (
                      <CheckCircle2 className="absolute right-3.5 w-4 h-4 text-emerald-500" />
                    )}
                  </div>
                  {touched.password && !isPasswordValid && (
                    <p className="text-[10px] text-red-500 font-mono mt-1 ml-3">
                      Password must be at least 6 characters.
                    </p>
                  )}
                </div>

                {/* Live Form Validation Feedback Pill */}
                {isFormValid && (
                  <div className="flex items-center justify-center space-x-2 py-1.5 px-3 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-semibold animate-fade-in">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>All fields are valid!</span>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={!isFormValid}
                  className={`w-full py-3.5 rounded-full font-mono font-bold text-sm tracking-wider flex items-center justify-center space-x-2 transition-all shadow-lg cursor-pointer ${
                    isFormValid
                      ? 'bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-600 text-white shadow-cyan-500/50 hover:scale-[1.02] active:scale-[0.98]'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-75'
                  }`}
                >
                  <span>SUBMIT</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 7. WARP-SPEED TRANSITION & "WELCOME ABOARD!" OVERLAY */}
      {/* ========================================================= */}
      {phase === 'WARP_TRANSITION' && (
        <div className="relative z-50 flex flex-col items-center justify-center text-center px-4 animate-zoom-in">
          {/* Central Blue Planet Hologram */}
          <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-gradient-to-tr from-cyan-600 via-blue-500 to-indigo-400 shadow-[0_0_80px_rgba(56,189,248,0.9)] flex items-center justify-center mb-6 animate-pulse-slow">
            <Globe className="w-20 h-20 text-white/90 animate-spin-slow" />
            <div className="absolute inset-0 rounded-full border-2 border-cyan-200/50 animate-ping" />
          </div>

          <h1 className="text-3xl sm:text-5xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-blue-400 tracking-wider">
            Welcome Aboard!
          </h1>
          <p className="mt-3 text-sm sm:text-base text-cyan-200 font-mono tracking-widest uppercase animate-pulse">
            You are now entering your space journey...
          </p>

          <div className="mt-6 flex items-center space-x-2 text-xs text-slate-400 font-mono">
            <Compass className="w-4 h-4 text-cyan-400 animate-spin-slow" />
            <span>INITIALIZING LUNAROV MISSION DASHBOARD</span>
          </div>
        </div>
      )}
    </div>
  );
};
