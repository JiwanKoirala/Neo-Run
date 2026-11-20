export type GameStatus = 'title' | 'playing' | 'paused' | 'gameover';

export type LaneIndex = -1 | 0 | 1;

export type ObstacleKind = 'barrier' | 'laser' | 'roadblock';

export type InputAction = 'left' | 'right' | 'jump' | 'slide';

export interface HudStats {
  score: number;
  highScore: number;
  distance: number;
  speedKmh: number;
  orbs: number;
  combo: number;
  isNewHighScore: boolean;
  hitReason: string;
}

export const LANE_WIDTH = 2.65;
export const LANE_X: Record<LaneIndex, number> = {
  [-1]: -LANE_WIDTH,
  [0]: 0,
  [1]: LANE_WIDTH,
};

export const ROAD_WIDTH = 9.0;
export const CHUNK_LENGTH = 24;
export const NUM_CHUNKS = 11;
export const BASE_SPEED = 20;
export const MAX_SPEED = 46;
