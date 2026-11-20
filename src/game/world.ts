import * as THREE from 'three';
import { GameMaterials } from './materials';
import { CHUNK_LENGTH, NUM_CHUNKS, ROAD_WIDTH } from './types';

interface WorldChunk {
  group: THREE.Group;
  billboards: THREE.Mesh[];
  neonAccents: THREE.Mesh[];
  z: number;
}

export class CyberpunkWorld {
  private readonly chunks: WorldChunk[] = [];
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly dynamicMaterials: THREE.Material[] = [];
  private readonly speedParticles: THREE.Points;
  private readonly particlePositions: Float32Array;
  private readonly particleCount = 180;
  private readonly horizonBackdrop: THREE.Group;
  private elapsed = 0;

  constructor(scene: THREE.Scene, materials: GameMaterials) {
    // Shared geometries for pooled city chunks
    const roadGeo = this.trackGeo(new THREE.PlaneGeometry(ROAD_WIDTH, CHUNK_LENGTH));
    const sidewalkGeo = this.trackGeo(new THREE.BoxGeometry(24, 0.25, CHUNK_LENGTH));
    const curbGeo = this.trackGeo(new THREE.BoxGeometry(0.35, 0.35, CHUNK_LENGTH));
    const curbStripGeo = this.trackGeo(new THREE.BoxGeometry(0.12, 0.1, CHUNK_LENGTH));
    const pillarGeo = this.trackGeo(new THREE.BoxGeometry(0.45, 5.8, 0.45));
    const archBeamGeo = this.trackGeo(new THREE.BoxGeometry(ROAD_WIDTH + 2.4, 0.42, 0.55));
    const archLightGeo = this.trackGeo(new THREE.BoxGeometry(ROAD_WIDTH + 1.4, 0.12, 0.18));

    const bldgUnitGeo = this.trackGeo(new THREE.BoxGeometry(1, 1, 1));
    const stripGeo = this.trackGeo(new THREE.BoxGeometry(0.18, 1, 0.18));
    const billboardGeo = this.trackGeo(new THREE.PlaneGeometry(6.4, 3.2));
    const groundVoidGeo = this.trackGeo(new THREE.PlaneGeometry(240, 320));

    // Deep night city ground plane underneath everything
    const voidGroundMat = new THREE.MeshBasicMaterial({ color: 0x04050e });
    this.dynamicMaterials.push(voidGroundMat);
    const voidGround = new THREE.Mesh(groundVoidGeo, voidGroundMat);
    voidGround.rotation.x = -Math.PI / 2;
    voidGround.position.set(0, -0.18, -95);
    scene.add(voidGround);

    // Build recycled chunks
    for (let i = 0; i < NUM_CHUNKS; i++) {
      const group = new THREE.Group();
      const zPos = 12 - i * CHUNK_LENGTH;
      group.position.z = zPos;

      // Main 3-lane road
      const roadMesh = new THREE.Mesh(roadGeo, materials.road);
      roadMesh.rotation.x = -Math.PI / 2;
      roadMesh.receiveShadow = true;
      group.add(roadMesh);

      // Left & Right curbs + sidewalks
      for (const side of [-1, 1]) {
        const sw = new THREE.Mesh(sidewalkGeo, materials.sidewalk);
        sw.position.set(side * (ROAD_WIDTH / 2 + 12), -0.02, 0);
        sw.receiveShadow = true;
        group.add(sw);

        const curb = new THREE.Mesh(curbGeo, materials.curb);
        curb.position.set(side * (ROAD_WIDTH / 2 + 0.18), 0.16, 0);
        group.add(curb);

        const stripMat = side < 0 ? materials.neonCyan : materials.neonPink;
        const strip = new THREE.Mesh(curbStripGeo, stripMat);
        strip.position.set(side * (ROAD_WIDTH / 2 + 0.18), 0.36, 0);
        group.add(strip);
      }

      const billboards: THREE.Mesh[] = [];
      const neonAccents: THREE.Mesh[] = [];

      // Overhead neon cyber arch every 2nd chunk
      if (i % 2 === 0) {
        const leftPillar = new THREE.Mesh(pillarGeo, materials.darkMetal);
        leftPillar.position.set(-(ROAD_WIDTH / 2 + 0.9), 2.9, 0);
        group.add(leftPillar);

        const rightPillar = new THREE.Mesh(pillarGeo, materials.darkMetal);
        rightPillar.position.set(ROAD_WIDTH / 2 + 0.9, 2.9, 0);
        group.add(rightPillar);

        const beam = new THREE.Mesh(archBeamGeo, materials.darkMetal);
        beam.position.set(0, 5.8, 0);
        group.add(beam);

        const lightMat = i % 4 === 0 ? materials.neonCyan : materials.neonPurple;
        const archLight = new THREE.Mesh(archLightGeo, lightMat);
        archLight.position.set(0, 5.56, 0);
        group.add(archLight);
        neonAccents.push(archLight);
      }

      // Composite skyscrapers on both sides (3 buildings per side per chunk)
      for (const side of [-1, 1]) {
        for (let b = 0; b < 2; b++) {
          const w = 5.2 + ((i * 7 + b * 3 + (side > 0 ? 2 : 0)) % 4) * 1.1;
          const d = 8.5 + ((i + b) % 3) * 1.3;
          const h = 18 + ((i * 11 + b * 5 + (side > 0 ? 4 : 1)) % 7) * 4.5;
          const bx = side * (ROAD_WIDTH / 2 + 4.4 + w / 2 + (b % 2) * 1.4);
          const bz = -6 + b * 12;

          const bMat = materials.buildingBases[(i + b + (side > 0 ? 1 : 0)) % materials.buildingBases.length];

          // Main tower
          const tower = new THREE.Mesh(bldgUnitGeo, bMat);
          tower.scale.set(w, h, d);
          tower.position.set(bx, h / 2 - 0.1, bz);
          group.add(tower);

          // Stepped upper crown
          const crownH = 3.2 + (i % 3);
          const crown = new THREE.Mesh(bldgUnitGeo, materials.darkMetal);
          crown.scale.set(w * 0.65, crownH, d * 0.65);
          crown.position.set(bx, h + crownH / 2 - 0.1, bz);
          group.add(crown);

          // Rooftop spire
          const spireH = 4 + ((i + b) % 3) * 1.5;
          const spire = new THREE.Mesh(stripGeo, side < 0 ? materials.neonCyan : materials.neonPink);
          spire.scale.set(0.9, spireH, 0.9);
          spire.position.set(bx, h + crownH + spireH / 2 - 0.1, bz);
          group.add(spire);

          // Vertical neon edge strip facing the road
          const accentMat =
            (i + b) % 3 === 0
              ? materials.neonCyan
              : (i + b) % 3 === 1
                ? materials.neonPink
                : materials.neonPurple;
          const vStrip = new THREE.Mesh(stripGeo, accentMat);
          vStrip.scale.set(1, h * 0.88, 1);
          vStrip.position.set(
            bx - side * (w / 2 + 0.06),
            h * 0.44,
            bz + d * 0.35
          );
          group.add(vStrip);
          neonAccents.push(vStrip);

          // Holographic billboard on selected towers
          if ((i + b) % 2 === 1) {
            const bbMat =
              materials.billboardMats[(i + b + (side > 0 ? 2 : 0)) % materials.billboardMats.length];
            const bb = new THREE.Mesh(billboardGeo, bbMat);
            bb.position.set(
              bx - side * (w / 2 + 0.25),
              7.5 + (b % 2) * 3.2,
              bz
            );
            bb.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
            group.add(bb);
            billboards.push(bb);
          }
        }
      }

      scene.add(group);
      this.chunks.push({ group, billboards, neonAccents, z: zPos });
    }

    // Distant skyline glow horizon backdrop (fixed far down -Z)
    this.horizonBackdrop = new THREE.Group();
    const sunGeo = this.trackGeo(new THREE.CircleGeometry(28, 32));
    const sunMat = new THREE.MeshBasicMaterial({
      color: 0xff2a85,
      transparent: true,
      opacity: 0.22,
      fog: false,
    });
    this.dynamicMaterials.push(sunMat);
    const cyberSun = new THREE.Mesh(sunGeo, sunMat);
    cyberSun.position.set(0, 22, -230);
    this.horizonBackdrop.add(cyberSun);

    const ringGeo = this.trackGeo(new THREE.RingGeometry(31, 32.5, 48));
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      fog: false,
    });
    this.dynamicMaterials.push(ringMat);
    const halo = new THREE.Mesh(ringGeo, ringMat);
    halo.position.set(0, 22, -229);
    this.horizonBackdrop.add(halo);
    scene.add(this.horizonBackdrop);

    // High-speed atmospheric neon dust / rain streaks
    this.particlePositions = new Float32Array(this.particleCount * 3);
    for (let i = 0; i < this.particleCount; i++) {
      this.particlePositions[i * 3] = (Math.random() - 0.5) * 34;
      this.particlePositions[i * 3 + 1] = 0.5 + Math.random() * 14;
      this.particlePositions[i * 3 + 2] = 10 - Math.random() * 140;
    }
    const pGeo = this.trackGeo(new THREE.BufferGeometry());
    pGeo.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0x7dd3fc,
      size: 0.16,
      transparent: true,
      opacity: 0.7,
    });
    this.dynamicMaterials.push(pMat);
    this.speedParticles = new THREE.Points(pGeo, pMat);
    this.speedParticles.frustumCulled = false;
    scene.add(this.speedParticles);
  }

  private trackGeo<T extends THREE.BufferGeometry>(g: T): T {
    this.geometries.push(g);
    return g;
  }

  public update(dt: number, speed: number): void {
    this.elapsed += dt;
    const totalLength = NUM_CHUNKS * CHUNK_LENGTH;

    for (const chunk of this.chunks) {
      chunk.z += speed * dt;
      if (chunk.z > CHUNK_LENGTH * 1.25) {
        chunk.z -= totalLength;
      }
      chunk.group.position.z = chunk.z;

      // Subtle holographic shimmer on billboards
      for (let i = 0; i < chunk.billboards.length; i++) {
        const bb = chunk.billboards[i];
        const pulse = 0.96 + Math.sin(this.elapsed * 3.5 + i * 1.7 + chunk.z * 0.05) * 0.04;
        bb.scale.set(pulse, pulse, 1);
      }
    }

    // Stream atmospheric speed particles past camera
    const posAttr = this.speedParticles.geometry.attributes.position as THREE.BufferAttribute;
    const pSpeed = speed * 1.35;
    for (let i = 0; i < this.particleCount; i++) {
      let pz = this.particlePositions[i * 3 + 2] + pSpeed * dt;
      if (pz > 14) {
        pz -= 150;
        this.particlePositions[i * 3] = (Math.random() - 0.5) * 34;
        this.particlePositions[i * 3 + 1] = 0.5 + Math.random() * 14;
      }
      this.particlePositions[i * 3 + 2] = pz;
    }
    posAttr.needsUpdate = true;
  }

  public dispose(): void {
    this.geometries.forEach((g) => g.dispose());
    this.dynamicMaterials.forEach((m) => m.dispose());
  }
}
