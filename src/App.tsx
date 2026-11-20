import { useCallback, useEffect, useRef, useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { GameHUD } from './components/GameHUD';
import { GameOverlays } from './components/GameOverlays';
import { soundEngine } from './game/audio';
import { NeonRunnerEngine } from './game/engine';
import { GameStatus, HudStats, InputAction } from './game/types';

const INITIAL_STATS: HudStats = {
  score: 0,
  highScore: 0,
  distance: 0,
  speedKmh: 76,
  orbs: 0,
  combo: 1,
  isNewHighScore: false,
  hitReason: '',
};

export default function App() {
  const engineRef = useRef<NeonRunnerEngine | null>(null);
  const [status, setStatus] = useState<GameStatus>('title');
  const [stats, setStats] = useState<HudStats>(INITIAL_STATS);
  const [muted, setMuted] = useState(false);
  const [contextLost, setContextLost] = useState(false);
  const [showTouchControls, setShowTouchControls] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(pointer: coarse)').matches ?? false;
  });

  const statusRef = useRef(status);
  statusRef.current = status;

  const handleEngineReady = useCallback((engine: NeonRunnerEngine) => {
    engineRef.current = engine;
  }, []);

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      return next;
    });
  }, []);

  const handleStart = useCallback(() => {
    engineRef.current?.startNewRun();
  }, []);

  const handleTogglePause = useCallback(() => {
    engineRef.current?.togglePause();
  }, []);

  const handleMainMenu = useCallback(() => {
    engineRef.current?.returnToTitle();
  }, []);

  const handleAction = useCallback((action: InputAction) => {
    engineRef.current?.handleAction(action);
  }, []);

  // Desktop keyboard controls
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;

      const engine = engineRef.current;
      if (!engine) return;

      const key = e.key.toLowerCase();
      const currentStatus = statusRef.current;

      if (e.key === 'Escape') {
        if (currentStatus === 'playing' || currentStatus === 'paused') {
          e.preventDefault();
          engine.togglePause();
        }
        return;
      }

      // Allow Space / Enter to start or replay from Title / Game Over
      if (currentStatus === 'title' || currentStatus === 'gameover') {
        if (e.code === 'Space' || e.key === 'Enter') {
          e.preventDefault();
          engine.startNewRun();
        }
        return;
      }

      if (currentStatus !== 'playing') return;

      if (key === 'a' || e.key === 'ArrowLeft') {
        e.preventDefault();
        engine.handleAction('left');
      } else if (key === 'd' || e.key === 'ArrowRight') {
        e.preventDefault();
        engine.handleAction('right');
      } else if (key === 'w' || e.key === 'ArrowUp' || e.code === 'Space') {
        e.preventDefault();
        engine.handleAction('jump');
      } else if (key === 's' || e.key === 'ArrowDown') {
        e.preventDefault();
        engine.handleAction('slide');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <main className="relative h-full w-full overflow-hidden bg-[#050611]">
      <GameCanvas
        onEngineReady={handleEngineReady}
        onHudUpdate={setStats}
        onStatusChange={setStatus}
        onContextLost={setContextLost}
      />

      <GameHUD
        status={status}
        stats={stats}
        muted={muted}
        showTouchControls={showTouchControls}
        onToggleMute={handleToggleMute}
        onTogglePause={handleTogglePause}
        onToggleTouchControls={() => setShowTouchControls((v) => !v)}
        onAction={handleAction}
      />

      <GameOverlays
        status={status}
        stats={stats}
        contextLost={contextLost}
        onStart={handleStart}
        onResume={handleTogglePause}
        onMainMenu={handleMainMenu}
      />
    </main>
  );
}
