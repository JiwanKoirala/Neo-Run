import { useEffect, useRef } from 'react';
import { NeonRunnerEngine } from '../game/engine';
import { GameStatus, HudStats, InputAction } from '../game/types';

interface GameCanvasProps {
  onEngineReady: (engine: NeonRunnerEngine) => void;
  onHudUpdate: (stats: HudStats) => void;
  onStatusChange: (status: GameStatus) => void;
  onContextLost: (lost: boolean) => void;
}

export function GameCanvas({
  onEngineReady,
  onHudUpdate,
  onStatusChange,
  onContextLost,
}: GameCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<NeonRunnerEngine | null>(null);
  const callbacksRef = useRef({
    onEngineReady,
    onHudUpdate,
    onStatusChange,
    onContextLost,
  });
  callbacksRef.current = {
    onEngineReady,
    onHudUpdate,
    onStatusChange,
    onContextLost,
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const engine = new NeonRunnerEngine(container, {
      onHudUpdate: (stats) => callbacksRef.current.onHudUpdate(stats),
      onStatusChange: (status) => callbacksRef.current.onStatusChange(status),
      onContextLost: (lost) => callbacksRef.current.onContextLost(lost),
    });
    engineRef.current = engine;
    callbacksRef.current.onEngineReady(engine);

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Touch swipe controls on the viewport
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let startX = 0;
    let startY = 0;
    let handled = false;
    const SWIPE_THRESHOLD = 28;

    const trigger = (action: InputAction) => {
      handled = true;
      engineRef.current?.handleAction(action);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      handled = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (handled || e.touches.length === 0) return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;

      if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) {
        return;
      }

      if (Math.abs(dx) > Math.abs(dy)) {
        trigger(dx < 0 ? 'left' : 'right');
      } else {
        trigger(dy < 0 ? 'jump' : 'slide');
      }
    };

    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: true });

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0 w-full h-full overflow-hidden" />;
}
