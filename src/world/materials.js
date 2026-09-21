import * as THREE from 'three';

export const mat = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: .85, metalness: .05, ...opts });

export function createMaterials() {
  return {
    mat,
    pale: mat(0xd5d5cf, { roughness: .88 }),
    white: mat(0xe9e8e0, { roughness: .64 }),
    dark: mat(0x252d32, { roughness: .72, metalness: .38 }),
    metal: mat(0x7f898a, { metalness: .7, roughness: .4 }),
    black: mat(0x101820, { metalness: .45, roughness: .42 }),
    gold: mat(0xb89654, { metalness: .72, roughness: .38 }),
    blue: mat(0x506fa4, { metalness: .23, roughness: .5 }),
    glow: new THREE.MeshBasicMaterial({ color: 0x86d8de }),
  };
}
