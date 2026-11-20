import * as THREE from 'three';
import { GameMaterials } from './materials';
import { LANE_X, LaneIndex } from './types';

export interface PlayerHitbox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

interface TrailSpark {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  vx: number;
  vy: number;
  vz: number;
}

export class CyberPlayer {
  public readonly root = new THREE.Group();
  public readonly bodyRig = new THREE.Group();

  private readonly pelvis = new THREE.Group();
  private readonly torso = new THREE.Group();
  private readonly head = new THREE.Group();

  private readonly leftArm = new THREE.Group();
  private readonly leftForearm = new THREE.Group();
  private readonly rightArm = new THREE.Group();
  private readonly rightForearm = new THREE.Group();

  private readonly leftLeg = new THREE.Group();
  private readonly leftShin = new THREE.Group();
  private readonly rightLeg = new THREE.Group();
  private readonly rightShin = new THREE.Group();

  private readonly contactShadow: THREE.Mesh;
  private readonly sparks: TrailSpark[] = [];
  private readonly sparkPoolGroup = new THREE.Group();
  private readonly geometriesToDispose: THREE.BufferGeometry[] = [];
  private readonly sparkMat: THREE.MeshBasicMaterial;

  private lane: LaneIndex = 0;
  private x = 0;
  private y = 0;
  private vy = 0;
  private isGrounded = true;

  private slideTimer = 0;
  private slideDuration = 0.66;
  private queuedSlide = false;
  private jumpBufferTimer = 0;

  private runCycle = 0;
  private sparkSpawnAccum = 0;
  private flashTimer = 0;

  constructor(scene: THREE.Scene, materials: GameMaterials) {
    this.root.position.set(0, 0, 0);
    this.root.add(this.bodyRig);

    // Contact shadow grounded at y = 0.02
    const shadowGeo = new THREE.PlaneGeometry(1.35, 1.35);
    this.geometriesToDispose.push(shadowGeo);
    this.contactShadow = new THREE.Mesh(shadowGeo, materials.shadowMat);
    this.contactShadow.rotation.x = -Math.PI / 2;
    this.contactShadow.position.y = 0.02;
    scene.add(this.contactShadow);

    this.buildCharacterMesh(materials);
    scene.add(this.root);

    // Pooled neon foot/slide sparks
    const sparkGeo = new THREE.BoxGeometry(0.08, 0.08, 0.24);
    this.geometriesToDispose.push(sparkGeo);
    this.sparkMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.85,
    });
    for (let i = 0; i < 24; i++) {
      const m = new THREE.Mesh(sparkGeo, this.sparkMat);
      m.visible = false;
      this.sparkPoolGroup.add(m);
      this.sparks.push({ mesh: m, life: 0, maxLife: 0.3, vx: 0, vy: 0, vz: 0 });
    }
    scene.add(this.sparkPoolGroup);
  }

  private addGeo<T extends THREE.BufferGeometry>(g: T): T {
    this.geometriesToDispose.push(g);
    return g;
  }

  private buildCharacterMesh(materials: GameMaterials): void {
    // Pelvis pivot at ~0.92m
    this.pelvis.position.set(0, 0.92, 0);
    this.bodyRig.add(this.pelvis);

    const pelvisMesh = new THREE.Mesh(
      this.addGeo(new THREE.BoxGeometry(0.42, 0.2, 0.26)),
      materials.suitFabric
    );
    pelvisMesh.castShadow = true;
    this.pelvis.add(pelvisMesh);

    const beltAccent = new THREE.Mesh(
      this.addGeo(new THREE.BoxGeometry(0.45, 0.055, 0.28)),
      materials.neonPink
    );
    beltAccent.position.y = 0.06;
    this.pelvis.add(beltAccent);

    // Torso
    this.torso.position.set(0, 0.1, 0);
    this.pelvis.add(this.torso);

    const chestBase = new THREE.Mesh(
      this.addGeo(new THREE.BoxGeometry(0.48, 0.52, 0.28)),
      materials.suitFabric
    );
    chestBase.position.y = 0.28;
    chestBase.castShadow = true;
    this.torso.add(chestBase);

    const chestArmor = new THREE.Mesh(
      this.addGeo(new THREE.BoxGeometry(0.52, 0.34, 0.31)),
      materials.armorPlate
    );
    chestArmor.position.set(0, 0.36, 0.01);
    chestArmor.castShadow = true;
    this.torso.add(chestArmor);

    // Glowing spine core on the back (prominent for third-person camera!)
    const spineCore = new THREE.Mesh(
      this.addGeo(new THREE.BoxGeometry(0.11, 0.42, 0.06)),
      materials.neonCyan
    );
    spineCore.position.set(0, 0.32, 0.16);
    this.torso.add(spineCore);

    // Shoulder jacket flares
    const collar = new THREE.Mesh(
      this.addGeo(new THREE.CylinderGeometry(0.19, 0.24, 0.12, 8)),
      materials.armorPlate
    );
    collar.position.set(0, 0.56, 0);
    this.torso.add(collar);

    const collarRim = new THREE.Mesh(
      this.addGeo(new THREE.TorusGeometry(0.19, 0.02, 6, 16)),
      materials.neonPink
    );
    collarRim.rotation.x = Math.PI / 2;
    collarRim.position.set(0, 0.61, 0);
    this.torso.add(collarRim);

    // Head / Cyber Helmet
    this.head.position.set(0, 0.68, 0);
    this.torso.add(this.head);

    const helmet = new THREE.Mesh(
      this.addGeo(new THREE.BoxGeometry(0.28, 0.29, 0.3)),
      materials.armorPlate
    );
    helmet.position.y = 0.12;
    helmet.castShadow = true;
    this.head.add(helmet);

    const visor = new THREE.Mesh(
      this.addGeo(new THREE.BoxGeometry(0.29, 0.09, 0.24)),
      materials.neonCyan
    );
    visor.position.set(0, 0.13, -0.05);
    this.head.add(visor);

    const crest = new THREE.Mesh(
      this.addGeo(new THREE.BoxGeometry(0.06, 0.08, 0.28)),
      materials.neonPink
    );
    crest.position.set(0, 0.28, 0.02);
    this.head.add(crest);

    // Arms (Left & Right)
    this.buildArm(this.leftArm, this.leftForearm, -0.34, materials);
    this.buildArm(this.rightArm, this.rightForearm, 0.34, materials);

    // Legs (Left & Right)
    this.buildLeg(this.leftLeg, this.leftShin, -0.14, materials);
    this.buildLeg(this.rightLeg, this.rightShin, 0.14, materials);
  }

  private buildArm(
    armPivot: THREE.Group,
    forearmPivot: THREE.Group,
    offsetX: number,
    materials: GameMaterials
  ): void {
    armPivot.position.set(offsetX, 0.5, 0);
    this.torso.add(armPivot);

    const pauldron = new THREE.Mesh(
      this.addGeo(new THREE.BoxGeometry(0.16, 0.15, 0.18)),
      materials.armorPlate
    );
    pauldron.castShadow = true;
    armPivot.add(pauldron);

    const upperArm = new THREE.Mesh(
      this.addGeo(new THREE.BoxGeometry(0.11, 0.28, 0.12)),
      materials.suitFabric
    );
    upperArm.position.y = -0.16;
    upperArm.castShadow = true;
    armPivot.add(upperArm);

    forearmPivot.position.set(0, -0.3, 0);
    armPivot.add(forearmPivot);

    const forearm = new THREE.Mesh(
      this.addGeo(new THREE.BoxGeometry(0.1, 0.26, 0.11)),
      materials.armorPlate
    );
    forearm.position.y = -0.13;
    forearm.castShadow = true;
    forearmPivot.add(forearm);

    const wristGlow = new THREE.Mesh(
      this.addGeo(new THREE.BoxGeometry(0.115, 0.05, 0.125)),
      materials.neonCyan
    );
    wristGlow.position.y = -0.22;
    forearmPivot.add(wristGlow);
  }

  private buildLeg(
    legPivot: THREE.Group,
    shinPivot: THREE.Group,
    offsetX: number,
    materials: GameMaterials
  ): void {
    legPivot.position.set(offsetX, -0.04, 0);
    this.pelvis.add(legPivot);

    const thigh = new THREE.Mesh(
      this.addGeo(new THREE.BoxGeometry(0.16, 0.42, 0.18)),
      materials.suitFabric
    );
    thigh.position.y = -0.21;
    thigh.castShadow = true;
    legPivot.add(thigh);

    const kneePad = new THREE.Mesh(
      this.addGeo(new THREE.BoxGeometry(0.17, 0.11, 0.19)),
      materials.armorPlate
    );
    kneePad.position.set(0, -0.42, -0.02);
    legPivot.add(kneePad);

    shinPivot.position.set(0, -0.44, 0);
    legPivot.add(shinPivot);

    const shin = new THREE.Mesh(
      this.addGeo(new THREE.BoxGeometry(0.14, 0.4, 0.16)),
      materials.armorPlate
    );
    shin.position.y = -0.2;
    shin.castShadow = true;
    shinPivot.add(shin);

    const shinStrip = new THREE.Mesh(
      this.addGeo(new THREE.BoxGeometry(0.04, 0.3, 0.04)),
      materials.neonCyan
    );
    shinStrip.position.set(offsetX < 0 ? -0.07 : 0.07, -0.18, 0.04);
    shinPivot.add(shinStrip);

    const boot = new THREE.Mesh(
      this.addGeo(new THREE.BoxGeometry(0.16, 0.12, 0.28)),
      materials.darkMetal
    );
    boot.position.set(0, -0.4, -0.05);
    boot.castShadow = true;
    shinPivot.add(boot);

    const bootSole = new THREE.Mesh(
      this.addGeo(new THREE.BoxGeometry(0.165, 0.035, 0.29)),
      materials.neonPink
    );
    bootSole.position.set(0, -0.45, -0.05);
    shinPivot.add(bootSole);
  }

  public reset(): void {
    this.lane = 0;
    this.x = 0;
    this.y = 0;
    this.vy = 0;
    this.isGrounded = true;
    this.slideTimer = 0;
    this.queuedSlide = false;
    this.jumpBufferTimer = 0;
    this.runCycle = 0;
    this.flashTimer = 0;
    this.root.position.set(0, 0, 0);
    this.bodyRig.rotation.set(0, 0, 0);
    this.bodyRig.visible = true;
    this.contactShadow.position.set(0, 0.02, 0);
    this.contactShadow.scale.setScalar(1);
    this.sparks.forEach((s) => {
      s.life = 0;
      s.mesh.visible = false;
    });
  }

  public moveLeft(): boolean {
    if (this.lane > -1) {
      this.lane = (this.lane - 1) as LaneIndex;
      return true;
    }
    return false;
  }

  public moveRight(): boolean {
    if (this.lane < 1) {
      this.lane = (this.lane + 1) as LaneIndex;
      return true;
    }
    return false;
  }

  public jump(): boolean {
    if (this.isGrounded) {
      this.vy = 13.8;
      this.isGrounded = false;
      this.slideTimer = 0;
      this.queuedSlide = false;
      this.jumpBufferTimer = 0;
      return true;
    }
    // Buffer jump if pressed just before touchdown
    this.jumpBufferTimer = 0.14;
    return false;
  }

  public slide(): boolean {
    if (!this.isGrounded) {
      // Fast-fall slam into slide
      this.vy = Math.min(this.vy, -24);
      this.queuedSlide = true;
      return true;
    }
    if (this.slideTimer <= 0.12) {
      this.slideTimer = this.slideDuration;
      return true;
    }
    return false;
  }

  public isSliding(): boolean {
    return this.slideTimer > 0 && this.isGrounded;
  }

  public getX(): number {
    return this.x;
  }

  public getY(): number {
    return this.y;
  }

  public getLane(): LaneIndex {
    return this.lane;
  }

  public triggerCrashFlash(): void {
    this.flashTimer = 0.8;
  }

  public getHitbox(): PlayerHitbox {
    const sliding = this.isSliding();
    const halfW = 0.34;
    const height = sliding ? 0.78 : 1.72;
    return {
      minX: this.x - halfW,
      maxX: this.x + halfW,
      minY: this.y + 0.05,
      maxY: this.y + height,
      minZ: -0.26,
      maxZ: 0.26,
    };
  }

  private spawnSpark(speed: number, isSlide: boolean): void {
    const slot = this.sparks.find((s) => s.life <= 0);
    if (!slot) return;

    slot.maxLife = isSlide ? 0.26 : 0.22;
    slot.life = slot.maxLife;
    slot.vx = (Math.random() - 0.5) * 2.4;
    slot.vy = isSlide ? 1.5 + Math.random() * 2.5 : 0.6 + Math.random() * 1.2;
    slot.vz = speed * 0.45 + Math.random() * 2;
    slot.mesh.position.set(
      this.x + (Math.random() - 0.5) * 0.36,
      this.y + 0.08,
      0.22 + Math.random() * 0.15
    );
    slot.mesh.scale.setScalar(isSlide ? 1.3 : 0.9);
    slot.mesh.visible = true;
  }

  public update(dt: number, speed: number, isPlaying: boolean): void {
    // Lane smoothing
    const targetX = LANE_X[this.lane];
    const prevX = this.x;
    this.x = THREE.MathUtils.damp(this.x, targetX, 16, dt);
    const vx = (this.x - prevX) / Math.max(dt, 0.001);

    // Jump buffer countdown
    if (this.jumpBufferTimer > 0) {
      this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
    }

    // Vertical physics
    if (!this.isGrounded) {
      this.vy -= 38 * dt;
      this.y += this.vy * dt;
      if (this.y <= 0) {
        this.y = 0;
        this.vy = 0;
        this.isGrounded = true;
        if (this.queuedSlide) {
          this.queuedSlide = false;
          this.slideTimer = this.slideDuration;
        } else if (this.jumpBufferTimer > 0) {
          this.jump();
        }
      }
    }

    // Slide timer
    if (this.slideTimer > 0) {
      this.slideTimer = Math.max(0, this.slideTimer - dt);
    }

    this.root.position.set(this.x, this.y, 0);

    // Contact shadow follows X and scales/fades with height
    this.contactShadow.position.set(this.x, 0.02, 0);
    const shadowScale = Math.max(0.35, 1 - this.y * 0.24);
    this.contactShadow.scale.setScalar(shadowScale);

    // Bank into lane switch
    const targetBank = THREE.MathUtils.clamp(-vx * 0.032, -0.34, 0.34);
    const targetYaw = THREE.MathUtils.clamp(-vx * 0.022, -0.22, 0.22);
    this.bodyRig.rotation.z = THREE.MathUtils.damp(this.bodyRig.rotation.z, targetBank, 14, dt);
    this.bodyRig.rotation.y = THREE.MathUtils.damp(this.bodyRig.rotation.y, targetYaw, 14, dt);

    // Pose animation
    if (isPlaying) {
      this.runCycle += dt * (speed * 0.62);
    } else {
      // Gentle idle run preview on title screen
      this.runCycle += dt * 11;
    }

    const sliding = this.isSliding();

    if (sliding) {
      // Sleek low slide pose
      this.pelvis.position.y = THREE.MathUtils.damp(this.pelvis.position.y, 0.34, 18, dt);
      this.pelvis.rotation.x = THREE.MathUtils.damp(this.pelvis.rotation.x, 0.92, 18, dt);
      this.torso.rotation.x = THREE.MathUtils.damp(this.torso.rotation.x, 0.28, 18, dt);
      this.head.rotation.x = THREE.MathUtils.damp(this.head.rotation.x, -0.75, 18, dt);

      this.rightLeg.rotation.x = THREE.MathUtils.damp(this.rightLeg.rotation.x, 0.65, 18, dt);
      this.rightShin.rotation.x = THREE.MathUtils.damp(this.rightShin.rotation.x, -0.1, 18, dt);
      this.leftLeg.rotation.x = THREE.MathUtils.damp(this.leftLeg.rotation.x, -0.25, 18, dt);
      this.leftShin.rotation.x = THREE.MathUtils.damp(this.leftShin.rotation.x, -1.35, 18, dt);

      this.leftArm.rotation.x = THREE.MathUtils.damp(this.leftArm.rotation.x, -0.85, 16, dt);
      this.leftArm.rotation.z = THREE.MathUtils.damp(this.leftArm.rotation.z, -0.35, 16, dt);
      this.rightArm.rotation.x = THREE.MathUtils.damp(this.rightArm.rotation.x, 0.75, 16, dt);
      this.rightArm.rotation.z = THREE.MathUtils.damp(this.rightArm.rotation.z, 0.25, 16, dt);
    } else if (!this.isGrounded) {
      // Dynamic mid-air jump tuck pose
      const airPitch = THREE.MathUtils.clamp(this.vy * 0.025, -0.28, 0.25);
      this.pelvis.position.y = THREE.MathUtils.damp(this.pelvis.position.y, 0.96, 15, dt);
      this.pelvis.rotation.x = THREE.MathUtils.damp(this.pelvis.rotation.x, -0.15 + airPitch, 14, dt);
      this.torso.rotation.x = THREE.MathUtils.damp(this.torso.rotation.x, -0.18, 14, dt);
      this.head.rotation.x = THREE.MathUtils.damp(this.head.rotation.x, 0.1, 14, dt);

      this.leftLeg.rotation.x = THREE.MathUtils.damp(this.leftLeg.rotation.x, 0.85, 14, dt);
      this.leftShin.rotation.x = THREE.MathUtils.damp(this.leftShin.rotation.x, -1.25, 14, dt);
      this.rightLeg.rotation.x = THREE.MathUtils.damp(this.rightLeg.rotation.x, -0.45, 14, dt);
      this.rightShin.rotation.x = THREE.MathUtils.damp(this.rightShin.rotation.x, -0.65, 14, dt);

      this.leftArm.rotation.x = THREE.MathUtils.damp(this.leftArm.rotation.x, 1.05, 14, dt);
      this.leftArm.rotation.z = THREE.MathUtils.damp(this.leftArm.rotation.z, -0.25, 14, dt);
      this.rightArm.rotation.x = THREE.MathUtils.damp(this.rightArm.rotation.x, -0.55, 14, dt);
      this.rightArm.rotation.z = THREE.MathUtils.damp(this.rightArm.rotation.z, 0.25, 14, dt);
    } else {
      // Energetic forward sprint cycle
      const s = Math.sin(this.runCycle);
      const c = Math.cos(this.runCycle);
      const bob = Math.abs(c) * 0.075;

      this.pelvis.position.y = THREE.MathUtils.damp(this.pelvis.position.y, 0.9 + bob, 20, dt);
      this.pelvis.rotation.x = THREE.MathUtils.damp(this.pelvis.rotation.x, -0.14, 16, dt);
      this.torso.rotation.x = THREE.MathUtils.damp(this.torso.rotation.x, -0.12, 16, dt);
      this.torso.rotation.y = s * 0.12;
      this.head.rotation.x = THREE.MathUtils.damp(this.head.rotation.x, 0.16, 16, dt);

      // Legs stride
      this.leftLeg.rotation.x = s * 0.95;
      this.leftShin.rotation.x = s > 0 ? -0.25 - s * 0.45 : -0.9 + s * 0.35;

      this.rightLeg.rotation.x = -s * 0.95;
      this.rightShin.rotation.x = -s > 0 ? -0.25 + s * 0.45 : -0.9 - s * 0.35;

      // Counter-swinging arms
      this.leftArm.rotation.x = -s * 0.85;
      this.leftArm.rotation.z = THREE.MathUtils.damp(this.leftArm.rotation.z, -0.12, 16, dt);
      this.leftForearm.rotation.x = 0.85 + Math.max(0, -s) * 0.45;

      this.rightArm.rotation.x = s * 0.85;
      this.rightArm.rotation.z = THREE.MathUtils.damp(this.rightArm.rotation.z, 0.12, 16, dt);
      this.rightForearm.rotation.x = 0.85 + Math.max(0, s) * 0.45;
    }

    // Crash blink feedback
    if (this.flashTimer > 0) {
      this.flashTimer = Math.max(0, this.flashTimer - dt);
      this.bodyRig.visible = Math.floor(this.flashTimer * 18) % 2 === 0;
    } else {
      this.bodyRig.visible = true;
    }

    // Spawn & update trail sparks
    if (this.isGrounded) {
      this.sparkSpawnAccum += dt * (sliding ? 48 : 16);
      while (this.sparkSpawnAccum >= 1) {
        this.sparkSpawnAccum -= 1;
        this.spawnSpark(speed, sliding);
      }
    }

    for (const sp of this.sparks) {
      if (sp.life > 0) {
        sp.life -= dt;
        if (sp.life <= 0) {
          sp.mesh.visible = false;
        } else {
          sp.mesh.position.x += sp.vx * dt;
          sp.mesh.position.y += sp.vy * dt;
          sp.mesh.position.z += sp.vz * dt;
          const ratio = sp.life / sp.maxLife;
          sp.mesh.scale.set(ratio, ratio, ratio * 1.4);
        }
      }
    }
  }

  public dispose(): void {
    this.geometriesToDispose.forEach((g) => g.dispose());
    this.sparkMat.dispose();
  }
}
