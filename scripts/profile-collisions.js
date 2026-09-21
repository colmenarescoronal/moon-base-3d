import * as THREE from 'three';
import { PLAYER_RADIUS, createCollisionIndex } from '../src/collision.js';
import { createBase } from '../src/world/base.js';
import { createMaterials } from '../src/world/materials.js';
import { createTerrain } from '../src/world/terrain.js';
import { WORLD_BOUNDS } from '../src/world/terrain-content.js';

let seed = 72931;
const rand = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
const scene = new THREE.Scene();
const materials = createMaterials();
const terrain = createTerrain(scene, { mat: materials.mat, rand });
const base = createBase(scene, () => 0, materials);
const colliders = [...terrain.colliders, ...base.colliders];
const index = createCollisionIndex(colliders);
let maximumCandidates = 0;
let samples = 0;

for (let x = WORLD_BOUNDS.minX; x <= WORLD_BOUNDS.maxX; x += 3) for (let z = WORLD_BOUNDS.minZ; z <= WORLD_BOUNDS.maxZ; z += 3) {
  maximumCandidates = Math.max(maximumCandidates, index.queryRadius(x, z, PLAYER_RADIUS).length);
  samples++;
}

const { cellCount, averageCandidates } = index.stats;
const reductionPercent = colliders.length === 0 ? 0 : (1 - averageCandidates / colliders.length) * 100;
console.log(JSON.stringify({
  colliders: colliders.length,
  cellSize: 8,
  occupiedCells: cellCount,
  samples,
  averageCandidates: Number(averageCandidates.toFixed(2)),
  maximumCandidates,
  reductionPercent: Number(reductionPercent.toFixed(1)),
}, null, 2));
