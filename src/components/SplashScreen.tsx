import React, { useEffect, useState, useRef } from 'react';
import { sound } from '../game/sound';

interface SplashScreenProps {
  onComplete: () => void;
}

interface PuzzleArrow {
  id: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  dir: 'UP' | 'RIGHT' | 'DOWN' | 'LEFT';
  dx: number;
  dy: number;
  exitTime: number; // millisecond timestamp within animation
  color: string;
  glow: string;
}

// 8 Interlocking Arrows arranged in a puzzle pattern
const PUZZLE_ARROWS: PuzzleArrow[] = [
  // 1. Top-left outer arrow pointing UP (Escapes first)
  {
    id: 1,
    startX: 75,
    startY: 85,
    endX: 75,
    endY: 50,
    dir: 'UP',
    dx: 0,
    dy: -140,
    exitTime: 500,
    color: '#38BDF8', // Cyan
    glow: 'rgba(56, 189, 248, 0.8)',
  },
  // 2. Top-right outer arrow pointing RIGHT (Escapes second)
  {
    id: 2,
    startX: 115,
    startY: 75,
    endX: 150,
    endY: 75,
    dir: 'RIGHT',
    dx: 140,
    dy: 0,
    exitTime: 780,
    color: '#60A5FA', // Blue
    glow: 'rgba(96, 165, 250, 0.8)',
  },
  // 3. Bottom-right outer arrow pointing DOWN (Escapes third)
  {
    id: 3,
    startX: 125,
    startY: 115,
    endX: 125,
    endY: 150,
    dir: 'DOWN',
    dx: 0,
    dy: 140,
    exitTime: 1060,
    color: '#FBBF24', // Amber
    glow: 'rgba(251, 191, 36, 0.8)',
  },
  // 4. Bottom-left outer arrow pointing LEFT (Escapes fourth)
  {
    id: 4,
    startX: 85,
    startY: 125,
    endX: 50,
    endY: 125,
    dir: 'LEFT',
    dx: -140,
    dy: 0,
    exitTime: 1340,
    color: '#34D399', // Emerald
    glow: 'rgba(52, 211, 153, 0.8)',
  },
  // 5. Inner top arrow pointing RIGHT
  {
    id: 5,
    startX: 85,
    startY: 90,
    endX: 115,
    endY: 90,
    dir: 'RIGHT',
    dx: 140,
    dy: 0,
    exitTime: 1620,
    color: '#818CF8', // Indigo
    glow: 'rgba(129, 140, 248, 0.8)',
  },
  // 6. Inner right arrow pointing DOWN
  {
    id: 6,
    startX: 110,
    startY: 85,
    endX: 110,
    endY: 115,
    dir: 'DOWN',
    dx: 0,
    dy: 140,
    exitTime: 1900,
    color: '#F472B6', // Rose
    glow: 'rgba(244, 114, 182, 0.8)',
  },
  // 7. Inner bottom arrow pointing LEFT
  {
    id: 7,
    startX: 115,
    startY: 110,
    endX: 85,
    endY: 110,
    dir: 'LEFT',
    dx: -140,
    dy: 0,
    exitTime: 2180,
    color: '#38BDF8', // Cyan
    glow: 'rgba(56, 189, 248, 0.8)',
  },
  // 8. Core arrow pointing UP (Final escape)
  {
    id: 8,
    startX: 100,
    startY: 115,
    endX: 100,
    endY: 80,
    dir: 'UP',
    dx: 0,
    dy: -140,
    exitTime: 2460,
    color: '#F59E0B', // Gold
    glow: 'rgba(245, 158, 11, 0.9)',
  },
];

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [exiting, setExiting] = useState(false);
  const hasFinishedRef = useRef(false);
  const playedSoundsRef = useRef<Set<number>>(new Set());
  const winSoundPlayedRef = useRef(false);

  const TOTAL_DURATION = 4800; // 4.8 seconds total for full cinematic intro

  useEffect(() => {
    sound.playSplashIntro();

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      const timer = setTimeout(() => {
        if (!hasFinishedRef.current) {
          hasFinishedRef.current = true;
          onComplete();
        }
      }, 1500);
      return () => clearTimeout(timer);
    }

    const startTime = performance.now();
    let rafId: number;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      setElapsedTime(elapsed);

      // Play sound for each escaping arrow
      PUZZLE_ARROWS.forEach((arrow) => {
        if (elapsed >= arrow.exitTime && !playedSoundsRef.current.has(arrow.id)) {
          playedSoundsRef.current.add(arrow.id);
          sound.playSlide();
        }
      });

      // Play completion chime when all arrows finish escaping
      if (elapsed >= 2850 && !winSoundPlayedRef.current) {
        winSoundPlayedRef.current = true;
        sound.playWin();
      }

      if (elapsed >= TOTAL_DURATION - 350 && !hasFinishedRef.current) {
        setExiting(true);
      }

      if (elapsed < TOTAL_DURATION) {
        rafId = requestAnimationFrame(tick);
      } else {
        if (!hasFinishedRef.current) {
          hasFinishedRef.current = true;
          onComplete();
        }
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [onComplete]);

  const handleSkip = () => {
    if (hasFinishedRef.current) return;
    sound.playTap();
    setExiting(true);
    hasFinishedRef.current = true;
    setTimeout(onComplete, 180);
  };

  // Phase Calculations
  const isPuzzlePhase = elapsedTime < 3100;
  const showTitle = elapsedTime >= 3100;
  const showTagline = elapsedTime >= 3700;

  return (
    <div
      role="region"
      aria-label="Arrow Master Animated Intro"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-between bg-[#080E1E] text-white p-6 overflow-hidden select-none transition-all duration-350 ease-out ${
        exiting ? 'opacity-0 scale-102 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Background Radiance & Ambient Lighting */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Soft static ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] bg-radial from-cyan-500/10 via-blue-600/5 to-transparent rounded-full blur-3xl" />

        {/* Ambient subtle grid pattern */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>

      {/* Top Bar with Skip Button */}
      <div className="relative z-10 w-full flex justify-end">
        <button
          type="button"
          onClick={handleSkip}
          className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-black tracking-wider uppercase text-cyan-200 border border-cyan-400/30 backdrop-blur-md shadow-xs transition-all cursor-pointer touch-manipulation"
        >
          SKIP
        </button>
      </div>

      {/* Center Cinematic Stage */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto w-full max-w-sm text-center">
        {/* 1. ANIMATED ARROW PUZZLE STAGE (0.0s - 3.1s) */}
        {isPuzzlePhase && (
          <div className="relative w-64 h-64 flex items-center justify-center">
            {/* Clean puzzle container boundary */}
            <div className="absolute inset-4 rounded-3xl border border-slate-700/60 bg-slate-900/50 overflow-hidden">
              {/* Corner decorative anchors */}
              <div className="absolute top-2 left-2 w-2 h-2 border-t-2 border-l-2 border-cyan-400/40" />
              <div className="absolute top-2 right-2 w-2 h-2 border-t-2 border-r-2 border-cyan-400/40" />
              <div className="absolute bottom-2 left-2 w-2 h-2 border-b-2 border-l-2 border-cyan-400/40" />
              <div className="absolute bottom-2 right-2 w-2 h-2 border-b-2 border-r-2 border-cyan-400/40" />
            </div>

            {/* SVG Puzzle Canvas with 8 Animated Escaping Arrows */}
            <svg
              viewBox="0 0 200 200"
              className="w-full h-full relative z-10 overflow-visible"
            >
              {/* Render 8 Interlocking Puzzle Arrows */}
              {PUZZLE_ARROWS.map((arrow) => {
                const isSliding = elapsedTime >= arrow.exitTime;
                const slideElapsed = Math.max(0, elapsedTime - arrow.exitTime);
                const slideDuration = 420; // 0.42s per arrow exit glide
                const progress = Math.min(1, slideElapsed / slideDuration);

                // Smooth ease-out sliding curve
                const ease = 1 - Math.pow(1 - progress, 3);
                const currentTranslateX = arrow.dx * ease;
                const currentTranslateY = arrow.dy * ease;
                const opacity = isSliding ? Math.max(0, 1 - progress * 1.15) : 1;

                if (progress >= 1) return null; // Arrow has fully escaped

                return (
                  <g
                    key={arrow.id}
                    transform={`translate(${currentTranslateX}, ${currentTranslateY})`}
                    opacity={opacity}
                  >
                    {/* Arrow Shaft */}
                    <line
                      x1={arrow.startX}
                      y1={arrow.startY}
                      x2={arrow.endX}
                      y2={arrow.endY}
                      stroke={arrow.color}
                      strokeWidth="5"
                      strokeLinecap="round"
                    />

                    {/* Arrowhead Chevron */}
                    {arrow.dir === 'UP' && (
                      <path
                        d={`M ${arrow.endX - 6} ${arrow.endY + 6} L ${arrow.endX} ${arrow.endY} L ${arrow.endX + 6} ${arrow.endY + 6}`}
                        fill="none"
                        stroke={arrow.color}
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}
                    {arrow.dir === 'RIGHT' && (
                      <path
                        d={`M ${arrow.endX - 6} ${arrow.endY - 6} L ${arrow.endX} ${arrow.endY} L ${arrow.endX - 6} ${arrow.endY + 6}`}
                        fill="none"
                        stroke={arrow.color}
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}
                    {arrow.dir === 'DOWN' && (
                      <path
                        d={`M ${arrow.endX - 6} ${arrow.endY - 6} L ${arrow.endX} ${arrow.endY} L ${arrow.endX + 6} ${arrow.endY - 6}`}
                        fill="none"
                        stroke={arrow.color}
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}
                    {arrow.dir === 'LEFT' && (
                      <path
                        d={`M ${arrow.endX + 6} ${arrow.endY - 6} L ${arrow.endX} ${arrow.endY} L ${arrow.endX + 6} ${arrow.endY + 6}`}
                        fill="none"
                        stroke={arrow.color}
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        )}

        {/* 2. REVEALED GAME TITLE ANIMATION (3.1s+) */}
        {showTitle && (
          <div className="flex flex-col items-center text-center animate-in zoom-in-90 fade-in duration-500">
            {/* Glowing Diamond Emblem */}
            <div className="relative w-16 h-16 mb-4 flex items-center justify-center">
              <div className="absolute inset-0 rounded-2xl border-2 border-cyan-400/40 rotate-45 animate-spin-slow shadow-[0_0_20px_rgba(34,211,238,0.35)]" />
              <div className="absolute inset-2 rounded-xl border border-blue-400/30 -rotate-45" />
              <svg
                className="w-8 h-8 text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </div>

            {/* Title: ARROW MASTER */}
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-1.5 leading-none drop-shadow-md">
              <span className="bg-gradient-to-r from-white via-cyan-100 to-cyan-300 bg-clip-text text-transparent">
                ARROW
              </span>{' '}
              <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-400 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(245,158,11,0.4)]">
                MASTER
              </span>
            </h1>

            {/* Subtitle: PUZZLE ESCAPE */}
            <p className="text-xs sm:text-sm font-black tracking-[0.25em] text-blue-400 uppercase drop-shadow-xs">
              PUZZLE ESCAPE
            </p>

            <div className="w-16 h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-amber-400 rounded-full mt-3 opacity-90 shadow-[0_0_10px_rgba(56,189,248,0.6)]" />

            {/* 3. SHORT QUEST / TAGLINE (3.7s+) */}
            {showTagline && (
              <p className="text-xs sm:text-sm font-bold text-slate-300 mt-4 tracking-wide max-w-xs animate-in fade-in slide-in-from-bottom-2 duration-500">
                Solve the Puzzle. Train Your Brain. Escape!
              </p>
            )}
          </div>
        )}
      </div>

      {/* Bottom Loading Progress Bar */}
      <div className="relative z-10 w-full max-w-xs flex flex-col items-center gap-2 pb-4">
        <div className="w-full h-1.5 bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-cyan-500/20 shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-amber-400 rounded-full transition-all duration-75 shadow-[0_0_8px_rgba(34,211,238,0.7)]"
            style={{ width: `${Math.min(100, Math.round((elapsedTime / TOTAL_DURATION) * 100))}%` }}
          />
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          {elapsedTime < 2800 ? 'Escaping Arrows...' : 'Preparing Puzzle Escape...'}
        </span>
      </div>
    </div>
  );
};
