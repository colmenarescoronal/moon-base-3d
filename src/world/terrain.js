import * as THREE from 'three';
import { circleCollider } from '../collision.js';
import { CRATER_CONTENT, MOUNTAIN_CONTENT, TERRAIN_SIZE,
  validateCraterContent, validateMountainContent } from './terrain-content.js';

const smoothstep = (edge0, edge1, value) => {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

export function craterProfile(crater, x, z) {
  const dx = x - crater.x, dz = z - crater.z;
  const angle = Math.atan2(dz, dx);
  const irregularity = 1 + .045 * Math.sin(angle * 5 + crater.phase) + .025 * Math.sin(angle * 9 - crater.phase * .7);
  const distance = Math.hypot(dx, dz) / (crater.radius * irregularity);
  if (distance >= 1.75) return { height: 0, tone: 0, distance };
  const bowl = distance < 1 ? -crater.depth * (1 - smoothstep(.12, .94, distance)) : 0;
  const rim = crater.rimHeight * Math.exp(-Math.pow((distance - 1) / .105, 2));
  const ejecta = distance > 1 && distance < 1.7
    ? crater.rimHeight * .09 * (1 - (distance - 1) / .7) * (.55 + .45 * Math.sin(angle * 7 + crater.phase) ** 2)
    : 0;
  const floorTone = distance < .82 ? -.3 * (1 - smoothstep(.18, .82, distance)) : 0;
  const wallTone = distance >= .58 && distance < 1 ? -.1 * smoothstep(.58, .92, distance) : 0;
  const rimTone = .18 * Math.exp(-Math.pow((distance - 1) / .14, 2));
  const ejectaTone = distance > 1 ? .035 * (1 - smoothstep(1, 1.7, distance)) : 0;
  return { height: bowl + rim + ejecta, tone: floorTone + wallTone + rimTone + ejectaTone, distance };
}

const craterSurfaceAt = (x, z) => {
  let height = 0, tone = 0;
  for (const crater of CRATER_CONTENT) {
    const profile = craterProfile(crater, x, z);
    height += profile.height;
    tone += profile.tone;
  }
  return { height, tone };
};

export function mountainProfile(mountain, x, z) {
  const dx = (x - mountain.x) / mountain.radiusX;
  const dz = (z - mountain.z) / mountain.radiusZ;
  const distance = Math.hypot(dx, dz);
  if (distance >= 1) return { height: 0, tone: 0, distance };
  const angle = Math.atan2(dz, dx);
  const base = Math.pow(1 - smoothstep(0, 1, distance), .82);
  const radialRidges = Math.sin(angle * 6 + mountain.phase) * smoothstep(.12, .9, distance);
  const brokenSurface = Math.sin(x * .19 + z * .13 + mountain.phase) * base;
  const ruggedness = 1 + radialRidges * .13 + brokenSurface * .065;
  const height = mountain.height * base * ruggedness;
  const tone = -.055 * base + .045 * Math.abs(radialRidges);
  return { height, tone, distance };
}

const mountainSurfaceAt = (x, z) => {
  let height = 0, tone = 0;
  for (const mountain of MOUNTAIN_CONTENT) {
    const profile = mountainProfile(mountain, x, z);
    height += profile.height;
    tone += profile.tone;
  }
  return { height, tone };
};

export const heightAt = (x, z) => {
  let h = .13 * Math.sin(x * .39 + z * .11) + .11 * Math.sin(z * .62 - x * .18) + .07 * Math.sin(x * 1.3) * Math.cos(z * 1.11);
  h += craterSurfaceAt(x, z).height;
  h += mountainSurfaceAt(x, z).height;
  const edgeRise = Math.max(0, (Math.abs(x) - 118) / 16, (-z - 122) / 12, (z - 112) / 15);
  h += edgeRise * edgeRise * 8;
  return h;
};
export function createTerrain(scene, { mat, rand }) {
  validateCraterContent(CRATER_CONTENT);
  validateMountainContent(MOUNTAIN_CONTENT);
  const colliders = [];
  const terrainGeo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, 252, 252);
  terrainGeo.rotateX(-Math.PI / 2);
  const tpos = terrainGeo.attributes.position;
  const colors = [];
  const color = new THREE.Color();
  for (let i = 0; i < tpos.count; i++) {
    const x = tpos.getX(i), z = tpos.getZ(i), craterSurface = craterSurfaceAt(x, z),
      mountainSurface = mountainSurfaceAt(x, z), y = heightAt(x, z);
    tpos.setY(i, y);
    const shade = .76 + .14 * Math.sin(x * .6 + z * .4) + .08 * Math.sin(x * 2.1 - z * 1.8) + .09 * rand() + craterSurface.tone + mountainSurface.tone;
    color.setRGB(shade * .58, shade * .6, shade * .62);
    colors.push(color.r, color.g, color.b);
  }
  terrainGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  terrainGeo.computeVertexNormals();
  const terrain = new THREE.Mesh(terrainGeo, mat(0xffffff, { vertexColors: true, roughness: 1 }));
  terrain.receiveShadow = true; scene.add(terrain);

  // Pebbles and shards make the otherwise smooth terrain read as lunar dust.
  const rockGeo = new THREE.IcosahedronGeometry(1, 0);
  const rockMat = mat(0x888984, { roughness: 1, flatShading: true });
  const rocks = new THREE.InstancedMesh(rockGeo, rockMat, 2600);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 2600; i++) {
    const x = (rand() - .5) * 260, z = (rand() - .5) * 260;
    const s = .04 + Math.pow(rand(), 3) * .6;
    dummy.position.set(x, heightAt(x, z) + s * .25, z);
    dummy.rotation.set(rand() * 3, rand() * 6, rand() * 3);
    dummy.scale.set(s * (1 + rand()), s * .45, s * (1 + rand()));
    dummy.updateMatrix(); rocks.setMatrixAt(i, dummy.matrix);
    const radius = Math.max(dummy.scale.x, dummy.scale.z) * .75;
    if (radius > .65) colliders.push(circleCollider(x, z, radius, heightAt(x, z) - .1, dummy.position.y + radius * .65));
  }
  rocks.castShadow = true; rocks.receiveShadow = true; scene.add(rocks);

  // Distant broken rim silhouettes.
  function makeRidge(z, depth, base, amp, tint) {
    const g = new THREE.BufferGeometry(), v = [], idx = [];
    const count = 74;
    for (let i = 0; i <= count; i++) {
      const x = (i / count - .5) * 245;
      const y = base + amp * (Math.sin(i * .48) * .36 + Math.sin(i * .19 + 1) * .34 + rand() * .42);
      v.push(x, -9, z - depth, x, y, z + Math.sin(i * .4) * 5);
      if (i < count) { const a = 2 * i; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat(tint, { side: THREE.DoubleSide, roughness: 1, flatShading: true }));
    m.receiveShadow = true; scene.add(m);
  }
  makeRidge(-142, 4, 7, 11, 0x55585a);
  makeRidge(-166, 4, 10, 14, 0x34393d);

  return { terrain, rocks, colliders };
}
