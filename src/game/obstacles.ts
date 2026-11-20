import * as THREE from 'three';
import { GameMaterials } from './materials';
import { PlayerHitbox } from './player';
import { LANE_X, LaneIndex, ObstacleKind } from './types';

interface PooledObstacle {
  kind: ObstacleKind;
  group: THREE.Group;
  active: boolean;
  lane: LaneIndex;
  z: number;
  halfW: number;
  halfD: number;
  minY: number;
  maxY: number;
  beacon?: THREE.Mesh;
}

interface PooledOrb {
  group: THREE.Group;
  core: THREE.Mesh;
  ring: THREE.Mesh;
  active: boolean;
  lane: LaneIndex;
  x: number;
  y: number;
  z: number;
}

export interface CollisionResult {
  hitObstacle: ObstacleKind | null;
  orbsCollected: number;
}

const OBSTACLE_LABELS: Record<ObstacleKind, string> = {
  barrier: 'Red Energy Barrier',
  laser: 'Low Plasma Laser Beam',
  roadblock: 'Armored Cyber Roadblock',
};

export function getObstacleLabel(kind: ObstacleKind): string {
  return OBSTACLE_LABELS[kind];
}

export class ObstacleManager {
  private readonly obstacles: PooledObstacle[] = [];
  private readonly orbs: PooledOrb[] = [];
  private readonly geometries: THREE.BufferGeometry[] = [];
  private spawnCooldownDist = 36;
  private elapsed = 0;

  constructor(scene: THREE.Scene, materials: GameMaterials) {
    // Pool 12 of each obstacle type (36 total, zero runtime allocation)
    for (let i = 0; i < 10; i++) {
      this.obstacles.push(this.createBarrier(scene, materials));
      this.obstacles.push(this.createLaser(scene, materials));
      this.obstacles.push(this.createRoadblock(scene, materials));
    }

    // Pool 36 energy orbs
    const orbCoreGeo = this.trackGeo(new THREE.OctahedronGeometry(0.32, 0));
    const orbRingGeo = this.trackGeo(new THREE.TorusGeometry(0.46, 0.035, 8, 24));
    for (let i = 0; i < 36; i++) {
      const group = new THREE.Group();
      const core = new THREE.Mesh(orbCoreGeo, materials.orbMat);
      const ring = new THREE.Mesh(orbRingGeo, materials.orbRingMat);
      group.add(core);
      group.add(ring);
      group.visible = false;
      scene.add(group);
      this.orbs.push({
        group,
        core,
        ring,
        active: false,
        lane: 0,
        x: 0,
        y: 0.9,
        z: 0,
      });
    }
  }

  private trackGeo<T extends THREE.BufferGeometry>(g: T): T {
    this.geometries.push(g);
    return g;
  }

  private createBarrier(scene: THREE.Scene, materials: GameMaterials): PooledObstacle {
    // Red barrier: must jump over (height 1.05m)
    const group = new THREE.Group();

    const footGeo = this.trackGeo(new THREE.BoxGeometry(0.24, 1.02, 0.36));
    const leftFoot = new THREE.Mesh(footGeo, materials.darkMetal);
    leftFoot.position.set(-1.02, 0.51, 0);
    leftFoot.castShadow = true;
    group.add(leftFoot);

    const rightFoot = new THREE.Mesh(footGeo, materials.darkMetal);
    rightFoot.position.set(1.02, 0.51, 0);
    rightFoot.castShadow = true;
    group.add(rightFoot);

    const topBar = new THREE.Mesh(
      this.trackGeo(new THREE.BoxGeometry(2.26, 0.2, 0.28)),
      materials.hazardMat
    );
    topBar.position.set(0, 0.96, 0);
    topBar.castShadow = true;
    group.add(topBar);

    const redField = new THREE.Mesh(
      this.trackGeo(new THREE.BoxGeometry(1.92, 0.6, 0.1)),
      materials.neonRed
    );
    redField.position.set(0, 0.56, 0);
    group.add(redField);

    group.visible = false;
    scene.add(group);

    return {
      kind: 'barrier',
      group,
      active: false,
      lane: 0,
      z: 0,
      halfW: 0.98,
      halfD: 0.25,
      minY: 0,
      maxY: 1.04,
      beacon: redField,
    };
  }

  private createLaser(scene: THREE.Scene, materials: GameMaterials): PooledObstacle {
    // Low laser beam: must slide underneath (bottom at y = 1.05m)
    const group = new THREE.Group();

    const pylonGeo = this.trackGeo(new THREE.BoxGeometry(0.26, 2.45, 0.34));
    const leftPylon = new THREE.Mesh(pylonGeo, materials.darkMetal);
    leftPylon.position.set(-1.12, 1.225, 0);
    leftPylon.castShadow = true;
    group.add(leftPylon);

    const rightPylon = new THREE.Mesh(pylonGeo, materials.darkMetal);
    rightPylon.position.set(1.12, 1.225, 0);
    rightPylon.castShadow = true;
    group.add(rightPylon);

    // Upper warning bridge
    const bridge = new THREE.Mesh(
      this.trackGeo(new THREE.BoxGeometry(2.5, 0.28, 0.36)),
      materials.hazardMat
    );
    bridge.position.set(0, 2.3, 0);
    group.add(bridge);

    // Lower laser beam (clearly visible glowing bar at head/chest height)
    const beamOuterGeo = this.trackGeo(new THREE.CylinderGeometry(0.11, 0.11, 2.18, 12));
    beamOuterGeo.rotateZ(Math.PI / 2);
    const beam1 = new THREE.Mesh(beamOuterGeo, materials.neonRed);
    beam1.position.set(0, 1.22, 0);
    group.add(beam1);

    const beamCoreGeo = this.trackGeo(new THREE.CylinderGeometry(0.045, 0.045, 2.2, 8));
    beamCoreGeo.rotateZ(Math.PI / 2);
    const core1 = new THREE.Mesh(beamCoreGeo, materials.laserCore);
    core1.position.set(0, 1.22, 0);
    group.add(core1);

    // Second upper laser bar
    const beam2 = new THREE.Mesh(beamOuterGeo, materials.neonPink);
    beam2.position.set(0, 1.72, 0);
    group.add(beam2);

    const core2 = new THREE.Mesh(beamCoreGeo, materials.laserCore);
    core2.position.set(0, 1.72, 0);
    group.add(core2);

    group.visible = false;
    scene.add(group);

    return {
      kind: 'laser',
      group,
      active: false,
      lane: 0,
      z: 0,
      halfW: 1.0,
      halfD: 0.26,
      minY: 1.06,
      maxY: 2.4,
      beacon: beam1,
    };
  }

  private createRoadblock(scene: THREE.Scene, materials: GameMaterials): PooledObstacle {
    // Large roadblock: tall monolith barrier, must change lanes
    const group = new THREE.Group();

    const body = new THREE.Mesh(
      this.trackGeo(new THREE.BoxGeometry(2.15, 2.55, 1.25)),
      materials.armorPlate
    );
    body.position.set(0, 1.275, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const frontHazard = new THREE.Mesh(
      this.trackGeo(new THREE.BoxGeometry(2.02, 1.5, 0.08)),
      materials.hazardMat
    );
    frontHazard.position.set(0, 1.15, 0.63);
    group.add(frontHazard);

    const topCap = new THREE.Mesh(
      this.trackGeo(new THREE.BoxGeometry(2.26, 0.22, 1.35)),
      materials.darkMetal
    );
    topCap.position.set(0, 2.58, 0);
    group.add(topCap);

    const beacon = new THREE.Mesh(
      this.trackGeo(new THREE.BoxGeometry(1.6, 0.18, 0.24)),
      materials.neonRed
    );
    beacon.position.set(0, 2.75, 0.45);
    group.add(beacon);

    const sideStripGeo = this.trackGeo(new THREE.BoxGeometry(0.1, 2.2, 0.14));
    const leftStrip = new THREE.Mesh(sideStripGeo, materials.neonPink);
    leftStrip.position.set(-1.08, 1.25, 0.56);
    group.add(leftStrip);

    const rightStrip = new THREE.Mesh(sideStripGeo, materials.neonPink);
    rightStrip.position.set(1.08, 1.25, 0.56);
    group.add(rightStrip);

    group.visible = false;
    scene.add(group);

    return {
      kind: 'roadblock',
      group,
      active: false,
      lane: 0,
      z: 0,
      halfW: 0.96,
      halfD: 0.62,
      minY: 0,
      maxY: 2.75,
      beacon,
    };
  }

  public reset(): void {
    for (const obs of this.obstacles) {
      obs.active = false;
      obs.group.visible = false;
    }
    for (const orb of this.orbs) {
      orb.active = false;
      orb.group.visible = false;
    }
    this.spawnCooldownDist = 30;
  }

  private spawnObstacle(kind: ObstacleKind, lane: LaneIndex, z: number): void {
    const slot = this.obstacles.find((o) => !o.active && o.kind === kind);
    if (!slot) return;
    slot.active = true;
    slot.lane = lane;
    slot.z = z;
    slot.group.position.set(LANE_X[lane], 0, z);
    slot.group.visible = true;
  }

  private spawnOrb(lane: LaneIndex, y: number, z: number): void {
    const slot = this.orbs.find((o) => !o.active);
    if (!slot) return;
    slot.active = true;
    slot.lane = lane;
    slot.x = LANE_X[lane];
    slot.y = y;
    slot.z = z;
    slot.group.position.set(slot.x, y, z);
    slot.group.visible = true;
  }

  private spawnWave(speed: number): void {
    const spawnZ = -195;
    const lanes: LaneIndex[] = [-1, 0, 1];

    // Shuffle lanes helper
    const shuffled = [...lanes].sort(() => Math.random() - 0.5);
    const patternRoll = Math.random();

    if (patternRoll < 0.25) {
      // Pattern A: 1 roadblock + 1 barrier or laser, leaving 1 completely free lane + orb trail
      const openLane = shuffled[0];
      this.spawnObstacle('roadblock', shuffled[1], spawnZ);
      this.spawnObstacle(Math.random() < 0.5 ? 'barrier' : 'laser', shuffled[2], spawnZ);

      for (let i = 0; i < 3; i++) {
        this.spawnOrb(openLane, 0.85, spawnZ - 4 + i * 4);
      }
    } else if (patternRoll < 0.5) {
      // Pattern B: Two tall roadblocks forcing a clear lane switch
      this.spawnObstacle('roadblock', shuffled[0], spawnZ);
      this.spawnObstacle('roadblock', shuffled[1], spawnZ);
      const safeLane = shuffled[2];
      for (let i = 0; i < 3; i++) {
        this.spawnOrb(safeLane, 0.85, spawnZ - 3 + i * 3.5);
      }
    } else if (patternRoll < 0.72) {
      // Pattern C: Red barrier with jump-arc orbs over it + obstacle in another lane
      const jumpLane = shuffled[0];
      this.spawnObstacle('barrier', jumpLane, spawnZ);
      this.spawnOrb(jumpLane, 1.5, spawnZ + 3.2);
      this.spawnOrb(jumpLane, 2.25, spawnZ);
      this.spawnOrb(jumpLane, 1.5, spawnZ - 3.2);

      if (speed > 23) {
        this.spawnObstacle('roadblock', shuffled[1], spawnZ);
      }
    } else if (patternRoll < 0.9) {
      // Pattern D: Low laser beam with low slide orbs underneath + roadblock on flank
      const slideLane = shuffled[0];
      this.spawnObstacle('laser', slideLane, spawnZ);
      this.spawnOrb(slideLane, 0.55, spawnZ + 2.8);
      this.spawnOrb(slideLane, 0.55, spawnZ);
      this.spawnOrb(slideLane, 0.55, spawnZ - 2.8);

      if (speed > 22) {
        this.spawnObstacle(Math.random() < 0.5 ? 'barrier' : 'roadblock', shuffled[1], spawnZ);
      }
    } else {
      // Pattern E: Triple-lane rhythm challenge (2 barriers + 1 laser across all 3 lanes - all passable!)
      this.spawnObstacle('barrier', shuffled[0], spawnZ);
      this.spawnObstacle('laser', shuffled[1], spawnZ);
      this.spawnObstacle('barrier', shuffled[2], spawnZ);
      this.spawnOrb(shuffled[1], 0.55, spawnZ);
    }
  }

  public update(dt: number, speed: number, playerBox: PlayerHitbox, isPlaying: boolean): CollisionResult {
    this.elapsed += dt;
    let hitObstacle: ObstacleKind | null = null;
    let orbsCollected = 0;

    if (isPlaying) {
      this.spawnCooldownDist -= speed * dt;
      if (this.spawnCooldownDist <= 0) {
        this.spawnWave(speed);
        // Fair spacing that scales smoothly with velocity
        this.spawnCooldownDist = 20 + speed * 0.52 + Math.random() * 8;
      }
    }

    // Move & check active obstacles
    for (const obs of this.obstacles) {
      if (!obs.active) continue;

      obs.z += speed * dt;
      obs.group.position.z = obs.z;

      if (obs.beacon) {
        const pulse = 0.92 + Math.sin(this.elapsed * 12) * 0.08;
        obs.beacon.scale.y = pulse;
      }

      if (isPlaying) {
        const minX = LANE_X[obs.lane] - obs.halfW;
        const maxX = LANE_X[obs.lane] + obs.halfW;
        const minZ = obs.z - obs.halfD;
        const maxZ = obs.z + obs.halfD;

        const overlapX = playerBox.maxX > minX && playerBox.minX < maxX;
        const overlapY = playerBox.maxY > obs.minY && playerBox.minY < obs.maxY;
        const overlapZ = playerBox.maxZ > minZ && playerBox.minZ < maxZ;

        if (overlapX && overlapY && overlapZ) {
          hitObstacle = obs.kind;
        }
      }

      if (obs.z > 14) {
        obs.active = false;
        obs.group.visible = false;
      }
    }

    // Move, animate & collect energy orbs
    for (const orb of this.orbs) {
      if (!orb.active) continue;

      orb.z += speed * dt;
      const floatY = orb.y + Math.sin(this.elapsed * 5 + orb.z * 0.2) * 0.1;
      orb.group.position.set(orb.x, floatY, orb.z);
      orb.core.rotation.y += dt * 3.2;
      orb.core.rotation.x += dt * 1.4;
      orb.ring.rotation.z -= dt * 2.6;
      orb.ring.rotation.x = Math.PI / 3;

      if (isPlaying) {
        const dx = (playerBox.minX + playerBox.maxX) * 0.5 - orb.x;
        const dy = (playerBox.minY + playerBox.maxY) * 0.5 - floatY;
        const dz = (playerBox.minZ + playerBox.maxZ) * 0.5 - orb.z;
        if (dx * dx + dy * dy + dz * dz < 1.15 * 1.15) {
          orb.active = false;
          orb.group.visible = false;
          orbsCollected++;
          continue;
        }
      }

      if (orb.z > 12) {
        orb.active = false;
        orb.group.visible = false;
      }
    }

    return { hitObstacle, orbsCollected };
  }

  public dispose(): void {
    this.geometries.forEach((g) => g.dispose());
  }
}
