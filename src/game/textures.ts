import * as THREE from 'three';

export interface ProceduralTextures {
  roadAlbedo: THREE.CanvasTexture;
  roadEmissive: THREE.CanvasTexture;
  buildingWindows: THREE.CanvasTexture[];
  billboards: THREE.CanvasTexture[];
  hazardStripes: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  glowSprite: THREE.CanvasTexture;
  dispose: () => void;
}

function configureTexture(
  canvas: HTMLCanvasElement,
  maxAnisotropy: number,
  repeatX = 1,
  repeatY = 1,
  isColor = true
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

function createRoadAlbedoCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Dark wet cyberpunk asphalt base
  ctx.fillStyle = '#090b18';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle asphalt grain
  for (let i = 0; i < 4500; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const alpha = Math.random() * 0.08;
    ctx.fillStyle = `rgba(120, 145, 220, ${alpha})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Subtle longitudinal tire reflection bands in each of the 3 lanes
  const laneCenters = [106, 256, 406];
  for (const cx of laneCenters) {
    const grad = ctx.createLinearGradient(cx - 56, 0, cx + 56, 0);
    grad.addColorStop(0, 'rgba(0, 240, 255, 0)');
    grad.addColorStop(0.5, 'rgba(30, 50, 110, 0.25)');
    grad.addColorStop(1, 'rgba(0, 240, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(cx - 56, 0, 112, 512);
  }

  // Outer road edge strips
  ctx.fillStyle = '#18244a';
  ctx.fillRect(0, 0, 22, 512);
  ctx.fillRect(490, 0, 22, 512);

  return canvas;
}

function createRoadEmissiveCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, 512, 512);

  // Glowing outer cyan rails
  ctx.fillStyle = '#00f0ff';
  ctx.fillRect(10, 0, 8, 512);
  ctx.fillRect(494, 0, 8, 512);

  // Inner magenta edge accent
  ctx.fillStyle = '#ff2a85';
  ctx.fillRect(24, 0, 3, 512);
  ctx.fillRect(485, 0, 3, 512);

  // Dashed glowing cyan/purple lane dividers (separating 3 lanes)
  const dividers = [178, 334];
  for (const dx of dividers) {
    for (let y = 16; y < 512; y += 64) {
      const grad = ctx.createLinearGradient(dx - 4, y, dx + 4, y + 36);
      grad.addColorStop(0, '#00f0ff');
      grad.addColorStop(1, '#7c3aed');
      ctx.fillStyle = grad;
      ctx.fillRect(dx - 3, y, 6, 36);
    }
  }

  // Subtle holographic chevrons in center lane
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.28)';
  ctx.lineWidth = 3;
  for (let y = 40; y < 512; y += 128) {
    ctx.beginPath();
    ctx.moveTo(232, y + 18);
    ctx.lineTo(256, y);
    ctx.lineTo(280, y + 18);
    ctx.stroke();
  }

  return canvas;
}

function createBuildingWindowCanvas(primary: string, secondary: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#070916';
  ctx.fillRect(0, 0, 256, 512);

  // Structural vertical mullions
  ctx.fillStyle = '#0d1126';
  for (let x = 0; x < 256; x += 32) {
    ctx.fillRect(x, 0, 5, 512);
  }

  // Lit apartment/office cyber windows
  const cols = 8;
  const rows = 24;
  const cellW = 256 / cols;
  const cellH = 512 / rows;

  for (let r = 0; r < rows; r++) {
    const floorLit = Math.random() > 0.25;
    for (let c = 0; c < cols; c++) {
      const rand = Math.random();
      if (floorLit && rand > 0.42) {
        ctx.fillStyle = rand > 0.84 ? secondary : primary;
        ctx.globalAlpha = 0.45 + Math.random() * 0.55;
        ctx.fillRect(c * cellW + 7, r * cellH + 5, cellW - 12, cellH - 9);
      } else {
        ctx.fillStyle = '#111630';
        ctx.globalAlpha = 0.7;
        ctx.fillRect(c * cellW + 7, r * cellH + 5, cellW - 12, cellH - 9);
      }
    }
  }
  ctx.globalAlpha = 1;
  return canvas;
}

function createBillboardCanvas(title: string, subtitle: string, accent: string, bg: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 256);

  // Scanlines
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  for (let y = 0; y < 256; y += 6) {
    ctx.fillRect(0, y, 512, 2);
  }

  // Neon frame
  ctx.strokeStyle = accent;
  ctx.lineWidth = 8;
  ctx.strokeRect(12, 12, 488, 232);

  // Geometric corner bracket accents
  ctx.fillStyle = accent;
  ctx.fillRect(24, 24, 60, 8);
  ctx.fillRect(428, 224, 60, 8);

  // Title text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 58px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = accent;
  ctx.shadowBlur = 18;
  ctx.fillText(title, 256, 112);

  // Subtitle
  ctx.shadowBlur = 8;
  ctx.fillStyle = accent;
  ctx.font = 'bold 24px monospace';
  ctx.fillText(subtitle, 256, 174);

  return canvas;
}

function createHazardStripeCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#190b16';
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = '#ff2a55';
  for (let i = -256; i < 512; i += 48) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 24, 0);
    ctx.lineTo(i + 280, 256);
    ctx.lineTo(i + 256, 256);
    ctx.closePath();
    ctx.fill();
  }

  return canvas;
}

function createRadialSpriteCanvas(innerColor: string, outerColor: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, innerColor);
  grad.addColorStop(0.45, outerColor);
  grad.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  return canvas;
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextures {
  const roadAlbedo = configureTexture(createRoadAlbedoCanvas(), maxAnisotropy, 1, 2, true);
  const roadEmissive = configureTexture(createRoadEmissiveCanvas(), maxAnisotropy, 1, 2, true);

  const buildingWindows = [
    configureTexture(createBuildingWindowCanvas('#00f0ff', '#ff2a85'), maxAnisotropy, 1, 2, true),
    configureTexture(createBuildingWindowCanvas('#9d4edd', '#00f0ff'), maxAnisotropy, 1, 2, true),
    configureTexture(createBuildingWindowCanvas('#ff2a85', '#ffd166'), maxAnisotropy, 1, 2, true),
  ];

  const billboards = [
    configureTexture(createBillboardCanvas('NEO TOKYO', 'SECTOR 09 // TRANSIT', '#00f0ff', '#071426'), maxAnisotropy, 1, 1, true),
    configureTexture(createBillboardCanvas('SYNTHWAVE', 'HYPER DRIVE CORE', '#ff2a85', '#1b071e'), maxAnisotropy, 1, 1, true),
    configureTexture(createBillboardCanvas('CYBER LABS', 'NEURAL GRID 2099', '#a855f7', '#100824'), maxAnisotropy, 1, 1, true),
    configureTexture(createBillboardCanvas('OVERDRIVE', 'HIGH VOLTAGE ZONE', '#38bdf8', '#071124'), maxAnisotropy, 1, 1, true),
  ];

  const hazardStripes = configureTexture(createHazardStripeCanvas(), maxAnisotropy, 2, 1, true);

  const contactShadow = new THREE.CanvasTexture(
    createRadialSpriteCanvas('rgba(0, 0, 0, 0.85)', 'rgba(0, 15, 35, 0.35)')
  );
  contactShadow.colorSpace = THREE.SRGBColorSpace;

  const glowSprite = new THREE.CanvasTexture(
    createRadialSpriteCanvas('rgba(255, 255, 255, 1)', 'rgba(0, 240, 255, 0.45)')
  );
  glowSprite.colorSpace = THREE.SRGBColorSpace;

  return {
    roadAlbedo,
    roadEmissive,
    buildingWindows,
    billboards,
    hazardStripes,
    contactShadow,
    glowSprite,
    dispose: () => {
      roadAlbedo.dispose();
      roadEmissive.dispose();
      buildingWindows.forEach((t) => t.dispose());
      billboards.forEach((t) => t.dispose());
      hazardStripes.dispose();
      contactShadow.dispose();
      glowSprite.dispose();
    },
  };
}
