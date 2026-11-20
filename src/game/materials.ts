import * as THREE from 'three';
import { ProceduralTextures } from './textures';

export interface GameMaterials {
  road: THREE.MeshStandardMaterial;
  curb: THREE.MeshStandardMaterial;
  sidewalk: THREE.MeshStandardMaterial;
  neonCyan: THREE.MeshStandardMaterial;
  neonPink: THREE.MeshStandardMaterial;
  neonPurple: THREE.MeshStandardMaterial;
  neonRed: THREE.MeshStandardMaterial;
  laserCore: THREE.MeshBasicMaterial;
  darkMetal: THREE.MeshStandardMaterial;
  suitFabric: THREE.MeshStandardMaterial;
  armorPlate: THREE.MeshPhysicalMaterial;
  hazardMat: THREE.MeshStandardMaterial;
  buildingBases: THREE.MeshStandardMaterial[];
  billboardMats: THREE.MeshBasicMaterial[];
  orbMat: THREE.MeshStandardMaterial;
  orbRingMat: THREE.MeshBasicMaterial;
  shadowMat: THREE.MeshBasicMaterial;
  dispose: () => void;
}

export function createGameMaterials(textures: ProceduralTextures): GameMaterials {
  const road = new THREE.MeshStandardMaterial({
    map: textures.roadAlbedo,
    emissiveMap: textures.roadEmissive,
    emissive: new THREE.Color('#ffffff'),
    emissiveIntensity: 1.15,
    roughness: 0.28,
    metalness: 0.35,
  });

  const curb = new THREE.MeshStandardMaterial({
    color: 0x10162d,
    roughness: 0.45,
    metalness: 0.65,
  });

  const sidewalk = new THREE.MeshStandardMaterial({
    color: 0x090c1c,
    roughness: 0.82,
    metalness: 0.15,
  });

  const neonCyan = new THREE.MeshStandardMaterial({
    color: 0x00f0ff,
    emissive: 0x00f0ff,
    emissiveIntensity: 2.2,
    roughness: 0.2,
    metalness: 0.1,
  });

  const neonPink = new THREE.MeshStandardMaterial({
    color: 0xff2a85,
    emissive: 0xff2a85,
    emissiveIntensity: 2.2,
    roughness: 0.2,
    metalness: 0.1,
  });

  const neonPurple = new THREE.MeshStandardMaterial({
    color: 0x9d4edd,
    emissive: 0x9d4edd,
    emissiveIntensity: 1.9,
    roughness: 0.25,
    metalness: 0.1,
  });

  const neonRed = new THREE.MeshStandardMaterial({
    color: 0xff1e42,
    emissive: 0xff1e42,
    emissiveIntensity: 2.4,
    roughness: 0.2,
    metalness: 0.1,
  });

  const laserCore = new THREE.MeshBasicMaterial({
    color: 0xff99aa,
  });

  const darkMetal = new THREE.MeshStandardMaterial({
    color: 0x171d36,
    roughness: 0.32,
    metalness: 0.82,
  });

  const suitFabric = new THREE.MeshStandardMaterial({
    color: 0x111526,
    roughness: 0.78,
    metalness: 0.12,
  });

  const armorPlate = new THREE.MeshPhysicalMaterial({
    color: 0x222c4a,
    roughness: 0.24,
    metalness: 0.85,
    clearcoat: 0.85,
    clearcoatRoughness: 0.15,
  });

  const hazardMat = new THREE.MeshStandardMaterial({
    map: textures.hazardStripes,
    emissive: new THREE.Color('#ff1e42'),
    emissiveMap: textures.hazardStripes,
    emissiveIntensity: 0.65,
    roughness: 0.4,
    metalness: 0.5,
  });

  const buildingBases = textures.buildingWindows.map(
    (tex) =>
      new THREE.MeshStandardMaterial({
        color: 0x0b0f22,
        map: tex,
        emissiveMap: tex,
        emissive: new THREE.Color('#ffffff'),
        emissiveIntensity: 0.95,
        roughness: 0.55,
        metalness: 0.45,
      })
  );

  const billboardMats = textures.billboards.map(
    (tex) =>
      new THREE.MeshBasicMaterial({
        map: tex,
      })
  );

  const orbMat = new THREE.MeshStandardMaterial({
    color: 0x00ffd5,
    emissive: 0x00f0ff,
    emissiveIntensity: 2.0,
    roughness: 0.15,
    metalness: 0.9,
  });

  const orbRingMat = new THREE.MeshBasicMaterial({
    color: 0xff2a85,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
  });

  const shadowMat = new THREE.MeshBasicMaterial({
    map: textures.contactShadow,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
  });

  return {
    road,
    curb,
    sidewalk,
    neonCyan,
    neonPink,
    neonPurple,
    neonRed,
    laserCore,
    darkMetal,
    suitFabric,
    armorPlate,
    hazardMat,
    buildingBases,
    billboardMats,
    orbMat,
    orbRingMat,
    shadowMat,
    dispose: () => {
      road.dispose();
      curb.dispose();
      sidewalk.dispose();
      neonCyan.dispose();
      neonPink.dispose();
      neonPurple.dispose();
      neonRed.dispose();
      laserCore.dispose();
      darkMetal.dispose();
      suitFabric.dispose();
      armorPlate.dispose();
      hazardMat.dispose();
      buildingBases.forEach((m) => m.dispose());
      billboardMats.forEach((m) => m.dispose());
      orbMat.dispose();
      orbRingMat.dispose();
      shadowMat.dispose();
    },
  };
}
