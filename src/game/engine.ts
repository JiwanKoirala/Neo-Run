import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { soundEngine } from './audio';
import { createGameMaterials, GameMaterials } from './materials';
import { getObstacleLabel, ObstacleManager } from './obstacles';
import { CyberPlayer } from './player';
import { createProceduralTextures, ProceduralTextures } from './textures';
import { BASE_SPEED, GameStatus, HudStats, InputAction, MAX_SPEED } from './types';
import { CyberpunkWorld } from './world';

const _lookTarget = new THREE.Vector3();
const HIGH_SCORE_STORAGE_KEY = 'neon_runner_high_score_v1';

function detectSoftwareGl(): boolean {
  const probeCanvas = document.createElement('canvas');
  const gl = probeCanvas.getContext('webgl2');
  if (!gl) return true;
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
  const gpu = String(gl.getParameter(param));
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
}

function loadHighScore(): number {
  try {
    const raw = window.localStorage.getItem(HIGH_SCORE_STORAGE_KEY);
    const parsed = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

function saveHighScore(score: number): void {
  try {
    window.localStorage.setItem(HIGH_SCORE_STORAGE_KEY, String(Math.floor(score)));
  } catch {
    // Ignore storage errors
  }
}

export interface EngineCallbacks {
  onHudUpdate: (stats: HudStats) => void;
  onStatusChange: (status: GameStatus) => void;
  onContextLost: (lost: boolean) => void;
}

export class NeonRunnerEngine {
  private readonly container: HTMLElement;
  private readonly callbacks: EngineCallbacks;
  private readonly isSoftwareGl: boolean;

  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly envRT: THREE.WebGLRenderTarget;

  private readonly textures: ProceduralTextures;
  private readonly materials: GameMaterials;
  private readonly world: CyberpunkWorld;
  private readonly player: CyberPlayer;
  private readonly obstacles: ObstacleManager;
  private readonly playerLight: THREE.PointLight;

  private status: GameStatus = 'title';
  private speed = BASE_SPEED;
  private distance = 0;
  private score = 0;
  private highScore = loadHighScore();
  private orbs = 0;
  private combo = 1;
  private comboTimer = 0;
  private isNewHighScore = false;
  private hitReason = '';

  private camX = 0;
  private camY = 3.8;
  private shakeTimer = 0;
  private hudEmitAccum = 0;

  private frameId = 0;
  private disposed = false;
  private lastTime = performance.now();

  constructor(container: HTMLElement, callbacks: EngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.isSoftwareGl = detectSoftwareGl();

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    // Scene & Atmosphere
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060714);
    this.scene.fog = new THREE.FogExp2(0x060714, 0.0085);

    this.camera = new THREE.PerspectiveCamera(64, width / height, 0.1, 280);
    this.camera.position.set(0, 3.8, 6.6);

    // Studio RoomEnvironment reflection map
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.envRT = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = this.envRT.texture;
    pmremGenerator.dispose();

    // Three-point + cyberpunk neon lighting rig
    const hemi = new THREE.HemisphereLight(0x38bdf8, 0x2e1065, 0.75);
    this.scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff1e6, 1.45);
    keyLight.position.set(8, 16, 10);
    keyLight.castShadow = !this.isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 45;
    keyLight.shadow.camera.left = -12;
    keyLight.shadow.camera.right = 12;
    keyLight.shadow.camera.top = 12;
    keyLight.shadow.camera.bottom = -12;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xff2a85, 1.35);
    rimLight.position.set(-10, 8, -14);
    this.scene.add(rimLight);

    this.playerLight = new THREE.PointLight(0x00f0ff, 2.2, 12, 1.8);
    this.playerLight.position.set(0, 2.2, 1.5);
    this.scene.add(this.playerLight);

    // Procedural assets & game entities
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.textures = createProceduralTextures(maxAniso);
    this.materials = createGameMaterials(this.textures);
    this.world = new CyberpunkWorld(this.scene, this.materials);
    this.player = new CyberPlayer(this.scene, this.materials);
    this.obstacles = new ObstacleManager(this.scene, this.materials);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    // Event bindings
    window.addEventListener('resize', this.handleResize);
    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.handleContextRestored);

    this.emitHud();
    this.scheduleNextFrame();
  }

  private handleResize = (): void => {
    if (this.disposed) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    if (width <= 0 || height <= 0) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
  };

  private handleContextLost = (e: Event): void => {
    e.preventDefault();
    this.callbacks.onContextLost(true);
    if (this.status === 'playing') {
      this.setStatus('paused');
    }
  };

  private handleContextRestored = (): void => {
    this.callbacks.onContextLost(false);
  };

  private setStatus(next: GameStatus): void {
    this.status = next;
    this.callbacks.onStatusChange(next);
  }

  public startNewRun(): void {
    soundEngine.unlock();
    this.player.reset();
    this.obstacles.reset();

    this.speed = BASE_SPEED;
    this.distance = 0;
    this.score = 0;
    this.orbs = 0;
    this.combo = 1;
    this.comboTimer = 0;
    this.isNewHighScore = false;
    this.hitReason = '';
    this.camX = 0;
    this.camY = 3.8;
    this.shakeTimer = 0;

    this.setStatus('playing');
    this.emitHud();
  }

  public togglePause(): void {
    if (this.status === 'playing') {
      this.setStatus('paused');
    } else if (this.status === 'paused') {
      this.lastTime = performance.now();
      this.setStatus('playing');
    }
  }

  public returnToTitle(): void {
    this.player.reset();
    this.obstacles.reset();
    this.speed = BASE_SPEED;
    this.setStatus('title');
    this.emitHud();
  }

  public handleAction(action: InputAction): void {
    if (this.status !== 'playing') return;
    soundEngine.unlock();

    if (action === 'left') {
      if (this.player.moveLeft()) {
        soundEngine.playLaneSwitch();
      }
    } else if (action === 'right') {
      if (this.player.moveRight()) {
        soundEngine.playLaneSwitch();
      }
    } else if (action === 'jump') {
      if (this.player.jump()) {
        soundEngine.playJump();
      }
    } else if (action === 'slide') {
      if (this.player.slide()) {
        soundEngine.playSlide();
      }
    }
  }

  public getStatus(): GameStatus {
    return this.status;
  }

  private emitHud(): void {
    this.callbacks.onHudUpdate({
      score: Math.floor(this.score),
      highScore: Math.floor(this.highScore),
      distance: Math.floor(this.distance),
      speedKmh: Math.round(this.speed * 3.8),
      orbs: this.orbs,
      combo: this.combo,
      isNewHighScore: this.isNewHighScore,
      hitReason: this.hitReason,
    });
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private scheduleNextFrame(): void {
    if (this.disposed) return;
    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  }

  private tick = (): void => {
    if (this.disposed) return;

    const now = performance.now();
    const rawDt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    const dt = Math.min(rawDt, 0.05);

    if (this.status === 'playing') {
      // Progressive speed acceleration
      this.speed = Math.min(MAX_SPEED, BASE_SPEED + this.distance * 0.015);
      this.distance += this.speed * dt;
      this.score += this.speed * dt * 1.4;

      if (this.comboTimer > 0) {
        this.comboTimer -= dt;
        if (this.comboTimer <= 0) {
          this.combo = 1;
        }
      }

      this.world.update(dt, this.speed);
      this.player.update(dt, this.speed, true);

      const playerBox = this.player.getHitbox();
      const result = this.obstacles.update(dt, this.speed, playerBox, true);

      if (result.orbsCollected > 0) {
        for (let i = 0; i < result.orbsCollected; i++) {
          this.orbs += 1;
          this.combo = Math.min(8, this.combo + 1);
          this.comboTimer = 3.2;
          this.score += 50 * this.combo;
          soundEngine.playOrb(this.combo);
        }
      }

      if (this.score > this.highScore) {
        this.highScore = this.score;
        this.isNewHighScore = true;
      }

      if (result.hitObstacle) {
        soundEngine.playCrash();
        this.player.triggerCrashFlash();
        this.shakeTimer = 0.45;
        this.hitReason = getObstacleLabel(result.hitObstacle);
        if (this.isNewHighScore) {
          saveHighScore(this.highScore);
        } else {
          saveHighScore(Math.max(this.highScore, this.score));
        }
        this.setStatus('gameover');
        this.emitHud();
      } else {
        this.hudEmitAccum += dt;
        if (this.hudEmitAccum >= 0.05) {
          this.hudEmitAccum = 0;
          this.emitHud();
        }
      }
    } else if (this.status === 'title') {
      // Live animated city & preview sprint on title screen
      this.world.update(dt, 16);
      this.player.update(dt, 16, false);
    } else if (this.status === 'gameover') {
      // Slow-motion aftermath & flash animation
      this.player.update(dt, 0, false);
    }

    // Update dynamic player accent light
    this.playerLight.position.set(this.player.getX(), this.player.getY() + 2.1, 1.4);

    // Smooth third-person chase camera
    const targetCamX = this.player.getX() * 0.68;
    const targetCamY = 3.7 + this.player.getY() * 0.45;
    this.camX = THREE.MathUtils.damp(this.camX, targetCamX, 8, dt);
    this.camY = THREE.MathUtils.damp(this.camY, targetCamY, 7, dt);

    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeTimer > 0) {
      this.shakeTimer = Math.max(0, this.shakeTimer - dt);
      const amp = this.shakeTimer * 0.65;
      shakeX = (Math.random() - 0.5) * amp;
      shakeY = (Math.random() - 0.5) * amp;
    }

    this.camera.position.set(this.camX + shakeX, this.camY + shakeY, 6.6);
    _lookTarget.set(this.player.getX() * 0.42, 1.45 + this.player.getY() * 0.3, -14);
    this.camera.lookAt(_lookTarget);

    // Subtle speed FOV widening
    const targetFov =
      this.status === 'playing'
        ? 64 + ((this.speed - BASE_SPEED) / (MAX_SPEED - BASE_SPEED)) * 11
        : 62;
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 4, dt);
      this.camera.updateProjectionMatrix();
    }

    this.renderer.render(this.scene, this.camera);
    this.scheduleNextFrame();
  };

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('resize', this.handleResize);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.handleContextRestored);

    this.player.dispose();
    this.world.dispose();
    this.obstacles.dispose();
    this.materials.dispose();
    this.textures.dispose();
    this.envRT.dispose();
    this.renderer.dispose();

    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
