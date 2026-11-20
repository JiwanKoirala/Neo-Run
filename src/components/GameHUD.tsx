import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Gamepad2,
  Pause,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { GameStatus, HudStats, InputAction } from '../game/types';

interface GameHUDProps {
  status: GameStatus;
  stats: HudStats;
  muted: boolean;
  showTouchControls: boolean;
  onToggleMute: () => void;
  onTogglePause: () => void;
  onToggleTouchControls: () => void;
  onAction: (action: InputAction) => void;
}

export function GameHUD({
  status,
  stats,
  muted,
  showTouchControls,
  onToggleMute,
  onTogglePause,
  onToggleTouchControls,
  onAction,
}: GameHUDProps) {
  if (status === 'title') {
    return (
      <div className="pointer-events-none fixed inset-x-0 top-0 z-20 flex items-center justify-between px-4 py-4 sm:px-6">
        <div className="pointer-events-auto flex items-center gap-4 rounded-lg border border-cyan-400/25 bg-[#070a18]/90 px-4 py-2">
          <span className="font-display text-sm font-bold tracking-wider text-cyan-300">
            BEST SCORE
          </span>
          <span className="font-mono-num text-base font-bold text-white">
            {stats.highScore.toLocaleString()}
          </span>
        </div>

        <button
          type="button"
          onClick={onToggleMute}
          aria-label={muted ? 'Unmute Audio' : 'Mute Audio'}
          className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-[#070a18]/90 text-slate-200 transition-colors hover:border-cyan-400/50 hover:text-cyan-300 focus-visible:outline-2 focus-visible:outline-cyan-400"
        >
          {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Top Telemetry Bar */}
      <header className="pointer-events-none fixed inset-x-0 top-0 z-20 flex items-start justify-between gap-3 px-4 py-4 sm:px-6">
        {/* Left: Score & Distance */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-4 rounded-lg border border-cyan-400/25 bg-[#070a18]/90 px-4 py-2.5">
          <div>
            <div className="text-[11px] font-semibold tracking-wider text-cyan-300/80 uppercase">
              Score
            </div>
            <div className="font-mono-num text-xl font-bold leading-tight text-white sm:text-2xl">
              {stats.score.toLocaleString()}
            </div>
          </div>

          <div className="h-8 w-px bg-white/10" aria-hidden="true" />

          <div>
            <div className="text-[11px] font-semibold tracking-wider text-fuchsia-300/80 uppercase">
              Distance
            </div>
            <div className="font-mono-num text-lg font-bold leading-tight text-slate-100 sm:text-xl">
              {stats.distance}m
            </div>
          </div>

          <div className="hidden h-8 w-px bg-white/10 sm:block" aria-hidden="true" />

          <div className="hidden sm:block">
            <div className="text-[11px] font-semibold tracking-wider text-violet-300/80 uppercase">
              Speed
            </div>
            <div className="font-mono-num text-lg font-bold leading-tight text-slate-100">
              {stats.speedKmh} km/h
            </div>
          </div>

          {stats.combo > 1 && (
            <>
              <div className="h-8 w-px bg-white/10" aria-hidden="true" />
              <div>
                <div className="text-[11px] font-semibold tracking-wider text-amber-300/90 uppercase">
                  Combo
                </div>
                <div className="font-mono-num text-lg font-bold leading-tight text-amber-300">
                  x{stats.combo}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right: Quick Controls */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleTouchControls}
            aria-label="Toggle On-Screen Controls"
            title="Toggle On-Screen Controls"
            className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400 ${
              showTouchControls
                ? 'border-cyan-400/70 bg-cyan-500/20 text-cyan-200'
                : 'border-white/15 bg-[#070a18]/90 text-slate-300 hover:border-cyan-400/50 hover:text-cyan-300'
            }`}
          >
            <Gamepad2 className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'Unmute Audio' : 'Mute Audio'}
            title={muted ? 'Unmute Audio' : 'Mute Audio'}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-[#070a18]/90 text-slate-200 transition-colors hover:border-cyan-400/50 hover:text-cyan-300 focus-visible:outline-2 focus-visible:outline-cyan-400"
          >
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>

          {status === 'playing' && (
            <button
              type="button"
              onClick={onTogglePause}
              aria-label="Pause Game"
              title="Pause (Esc)"
              className="flex h-10 items-center gap-2 rounded-lg border border-white/15 bg-[#070a18]/90 px-3 text-sm font-semibold text-slate-100 transition-colors hover:border-fuchsia-400/60 hover:text-fuchsia-200 focus-visible:outline-2 focus-visible:outline-cyan-400"
            >
              <Pause className="h-4 w-4" />
              <span className="hidden sm:inline">Pause</span>
            </button>
          )}
        </div>
      </header>

      {/* Optional On-Screen Touch / Click Controls */}
      {status === 'playing' && showTouchControls && (
        <div className="pointer-events-none fixed inset-x-0 bottom-5 z-20 flex items-end justify-between px-4 sm:px-8">
          {/* Left / Right Lane Buttons */}
          <div className="pointer-events-auto flex items-center gap-3">
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                onAction('left');
              }}
              aria-label="Move Left"
              className="flex h-14 w-14 items-center justify-center rounded-xl border border-cyan-400/40 bg-[#080c20]/90 text-cyan-200 active:scale-95 active:bg-cyan-500/30"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                onAction('right');
              }}
              aria-label="Move Right"
              className="flex h-14 w-14 items-center justify-center rounded-xl border border-cyan-400/40 bg-[#080c20]/90 text-cyan-200 active:scale-95 active:bg-cyan-500/30"
            >
              <ArrowRight className="h-6 w-6" />
            </button>
          </div>

          {/* Slide / Jump Buttons */}
          <div className="pointer-events-auto flex items-center gap-3">
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                onAction('slide');
              }}
              aria-label="Slide"
              className="flex h-14 w-14 items-center justify-center rounded-xl border border-fuchsia-400/40 bg-[#080c20]/90 text-fuchsia-200 active:scale-95 active:bg-fuchsia-500/30"
            >
              <ArrowDown className="h-6 w-6" />
            </button>
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                onAction('jump');
              }}
              aria-label="Jump"
              className="flex h-14 w-14 items-center justify-center rounded-xl border border-cyan-400/50 bg-[#080c20]/90 text-cyan-200 active:scale-95 active:bg-cyan-500/30"
            >
              <ArrowUp className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
