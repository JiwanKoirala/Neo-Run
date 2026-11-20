import { Play, RotateCcw, Trophy } from 'lucide-react';
import { GameStatus, HudStats } from '../game/types';

interface GameOverlaysProps {
  status: GameStatus;
  stats: HudStats;
  contextLost: boolean;
  onStart: () => void;
  onResume: () => void;
  onMainMenu: () => void;
}

export function GameOverlays({
  status,
  stats,
  contextLost,
  onStart,
  onResume,
  onMainMenu,
}: GameOverlaysProps) {
  if (contextLost) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#050611]/95 p-6">
        <div className="w-full max-w-md rounded-xl border border-rose-500/40 bg-[#090d20] p-6 text-center">
          <h2 className="font-display text-2xl font-bold text-white">Graphics Context Paused</h2>
          <p className="mt-2 text-sm text-slate-300">
            WebGL rendering was interrupted by the browser. Reload the page if the scene does not
            resume automatically.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'playing') {
    return null;
  }

  if (status === 'title') {
    return (
      <div className="pointer-events-none fixed inset-0 z-10 flex flex-col items-center justify-between px-4 pt-20 pb-8 sm:pb-10">
        {/* Top Hero Title */}
        <div className="text-center">
          <p className="text-xs font-semibold tracking-[0.26em] text-cyan-300 uppercase">
            3D Cyberpunk Endless Runner
          </p>
          <h1 className="font-display mt-2 text-5xl font-bold tracking-tight text-white drop-shadow-[0_0_24px_rgba(0,240,255,0.45)] sm:text-7xl">
            NEON <span className="text-cyan-300">RUNNER</span>
          </h1>
        </div>

        {/* Bottom Dock: Start Action & Controls Legend (leaves center runner 100% visible) */}
        <div className="pointer-events-auto w-full max-w-2xl rounded-xl border border-cyan-400/30 bg-[#070a18]/92 p-5 shadow-[0_0_40px_rgba(0,0,0,0.65)] sm:p-6">
          <div className="flex flex-col items-center justify-between gap-5 sm:flex-row">
            <div className="space-y-1.5 text-center sm:text-left">
              <div className="text-sm font-semibold text-white">Dodge Barriers · Slide Lasers · Collect Orbs</div>
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-slate-300 sm:justify-start">
                <span>
                  <strong className="text-cyan-300">A / D</strong> or <strong className="text-cyan-300">← / →</strong> Lanes
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  <strong className="text-cyan-300">W / ↑ / Space</strong> Jump
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  <strong className="text-fuchsia-300">S / ↓</strong> Slide
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  <strong className="text-slate-200">Swipe</strong> on Touch
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onStart}
              className="flex shrink-0 items-center justify-center gap-2.5 rounded-lg bg-cyan-400 px-7 py-3.5 font-display text-base font-bold tracking-wide text-slate-950 transition-transform hover:bg-cyan-300 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
            >
              <Play className="h-5 w-5 fill-slate-950" />
              Start Run
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'paused') {
    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#040610]/80 p-4">
        <div className="w-full max-w-md rounded-xl border border-cyan-400/30 bg-[#080c1e] p-6 shadow-2xl">
          <h2 className="font-display text-center text-3xl font-bold tracking-wide text-white">
            Game Paused
          </h2>
          <p className="mt-1 text-center text-sm text-slate-300">
            Press <strong className="text-cyan-300">Esc</strong> to resume your run
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3 rounded-lg border border-white/10 bg-[#050814] p-3.5 text-center">
            <div>
              <div className="text-xs text-slate-400">Current Score</div>
              <div className="font-mono-num mt-0.5 text-lg font-bold text-white">
                {stats.score.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Distance</div>
              <div className="font-mono-num mt-0.5 text-lg font-bold text-cyan-300">
                {stats.distance}m
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={onResume}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-400 px-5 py-3 font-display text-base font-bold text-slate-950 transition-colors hover:bg-cyan-300"
            >
              <Play className="h-4 w-4 fill-slate-950" />
              Resume Run
            </button>
            <button
              type="button"
              onClick={onStart}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              <RotateCcw className="h-4 w-4" />
              Restart Run
            </button>
            <button
              type="button"
              onClick={onMainMenu}
              className="w-full rounded-lg px-5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:text-white"
            >
              Main Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Game Over screen
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#040610]/85 p-4">
      <div className="w-full max-w-md rounded-xl border border-fuchsia-500/40 bg-[#080c1e] p-6 shadow-2xl">
        <div className="text-center">
          {stats.isNewHighScore ? (
            <div className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-amber-300 uppercase">
              <Trophy className="h-4 w-4" />
              New High Score
            </div>
          ) : (
            <div className="text-xs font-semibold tracking-wider text-rose-400 uppercase">
              Run Terminated
            </div>
          )}

          <h2 className="font-display mt-1 text-3xl font-bold tracking-wide text-white">
            Game Over
          </h2>

          {stats.hitReason && (
            <p className="mt-1.5 text-sm text-slate-300">
              Impacted: <span className="font-semibold text-rose-300">{stats.hitReason}</span>
            </p>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-white/10 bg-[#050814] p-3.5">
            <div className="text-xs text-slate-400">Final Score</div>
            <div className="font-mono-num mt-0.5 text-2xl font-bold text-cyan-300">
              {stats.score.toLocaleString()}
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-[#050814] p-3.5">
            <div className="text-xs text-slate-400">Best Score</div>
            <div className="font-mono-num mt-0.5 text-2xl font-bold text-amber-300">
              {stats.highScore.toLocaleString()}
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-[#050814] p-3.5">
            <div className="text-xs text-slate-400">Distance</div>
            <div className="font-mono-num mt-0.5 text-lg font-bold text-white">
              {stats.distance}m
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-[#050814] p-3.5">
            <div className="text-xs text-slate-400">Energy Orbs</div>
            <div className="font-mono-num mt-0.5 text-lg font-bold text-fuchsia-300">
              {stats.orbs}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={onStart}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-400 px-5 py-3.5 font-display text-base font-bold text-slate-950 transition-colors hover:bg-cyan-300"
          >
            <RotateCcw className="h-4 w-4" />
            Play Again
          </button>
          <button
            type="button"
            onClick={onMainMenu}
            className="w-full rounded-lg border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10"
          >
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}
