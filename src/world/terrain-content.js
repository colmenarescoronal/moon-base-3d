export const CRATER_CONTENT = Object.freeze([
  { id: 'crater-exploration-west', x: -9, z: 4, radius: 5.5, depth: 2.25, rimHeight: .72, phase: 2.8 },
  { id: 'crater-exploration-east', x: 24, z: 13, radius: 6.5, depth: 2.4, rimHeight: .78, phase: 4.7 },
  { id: 'crater-northwest', x: -29, z: 16, radius: 9, depth: 2.2, rimHeight: .62, phase: .4 },
  { id: 'crater-north', x: -3, z: 31, radius: 14, depth: 3.1, rimHeight: .9, phase: 1.7 },
  { id: 'crater-northeast', x: 46, z: 26, radius: 13, depth: 2.8, rimHeight: .82, phase: 2.5 },
  { id: 'crater-east', x: 30, z: -3, radius: 11, depth: 2.35, rimHeight: .7, phase: 3.1 },
  { id: 'crater-southeast', x: 31, z: -38, radius: 17, depth: 4.1, rimHeight: 1.12, phase: .9 },
  { id: 'crater-south', x: 9, z: -57, radius: 11, depth: 2.5, rimHeight: .75, phase: 2.1 },
  { id: 'crater-southwest', x: -15, z: -46, radius: 12, depth: 2.7, rimHeight: .8, phase: 4.2 },
  { id: 'crater-west', x: -44, z: -24, radius: 15, depth: 3.5, rimHeight: 1, phase: 5.1 },
  { id: 'crater-far-west', x: -57, z: 23, radius: 10, depth: 2.1, rimHeight: .66, phase: 3.8 },
  { id: 'crater-far-east', x: 62, z: -12, radius: 8, depth: 1.8, rimHeight: .55, phase: 1.2 },
]);

export const TERRAIN_SIZE = 280;

export const WORLD_BOUNDS = Object.freeze({
  minX: -112,
  maxX: 112,
  minZ: -112,
  maxZ: 100,
});

export const MOUNTAIN_CONTENT = Object.freeze([
  { id: 'mountain-rear-west', x: -72, z: -94, radiusX: 42, radiusZ: 32, height: 18, phase: .7 },
  { id: 'mountain-rear-center', x: -18, z: -101, radiusX: 44, radiusZ: 34, height: 23, phase: 2.2 },
  { id: 'mountain-rear-east', x: 43, z: -95, radiusX: 42, radiusZ: 32, height: 20, phase: 4.1 },
  { id: 'mountain-west', x: -105, z: -30, radiusX: 32, radiusZ: 55, height: 17, phase: 1.5 },
  { id: 'mountain-east', x: 105, z: -24, radiusX: 32, radiusZ: 54, height: 16, phase: 3.4 },
]);

const finite = value => typeof value === 'number' && Number.isFinite(value);

export function validateCraterContent(craters) {
  if (!Array.isArray(craters)) throw new TypeError('Los cráteres deben definirse en una lista');
  const ids = new Set();
  for (const crater of craters) {
    if (typeof crater.id !== 'string' || !crater.id.trim()) throw new TypeError('Cada cráter necesita un id');
    if (ids.has(crater.id)) throw new Error(`Id de cráter duplicado: ${crater.id}`);
    ids.add(crater.id);
    for (const property of ['x', 'z', 'radius', 'depth', 'rimHeight', 'phase']) {
      if (!finite(crater[property])) throw new TypeError(`${crater.id} necesita ${property} finito`);
    }
    if (crater.radius <= 0 || crater.depth <= 0 || crater.rimHeight < 0) {
      throw new RangeError(`${crater.id} necesita radio y profundidad positivos`);
    }
  }
  return true;
}

export function validateMountainContent(mountains) {
  if (!Array.isArray(mountains)) throw new TypeError('Las montañas deben definirse en una lista');
  const ids = new Set();
  for (const mountain of mountains) {
    if (typeof mountain.id !== 'string' || !mountain.id.trim()) throw new TypeError('Cada montaña necesita un id');
    if (ids.has(mountain.id)) throw new Error(`Id de montaña duplicado: ${mountain.id}`);
    ids.add(mountain.id);
    for (const property of ['x', 'z', 'radiusX', 'radiusZ', 'height', 'phase']) {
      if (!finite(mountain[property])) throw new TypeError(`${mountain.id} necesita ${property} finito`);
    }
    if (mountain.radiusX <= 0 || mountain.radiusZ <= 0 || mountain.height <= 0) {
      throw new RangeError(`${mountain.id} necesita radios y altura positivos`);
    }
  }
  return true;
}
