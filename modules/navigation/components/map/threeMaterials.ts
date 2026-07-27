import * as THREE from 'three';

export function createWallMaterial(isHighlighted: boolean = false): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: isHighlighted ? '#bfdbfe' : '#ffffff',
    roughness: 0.35,
    metalness: 0.05,
  });
}

export function createDoorMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: '#475569',
    roughness: 0.5,
    metalness: 0.1,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
}

export function createFloorMaterial(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.7,
    side: THREE.DoubleSide,
  });
}

export function createSlabMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: '#ffffff',
    transparent: true,
    opacity: 0.9,
    roughness: 0.5,
    metalness: 0.05,
  });
}
