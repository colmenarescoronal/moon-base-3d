// Simple horizontal capsule collisions. All heights and coordinates are in scene units.
export const PLAYER_RADIUS = .56;
export const PLAYER_HEIGHT = 4.6;
export const STEP_HEIGHT = .3;

export const boxCollider = (x, z, halfX, halfZ, minY, maxY, rotation = 0) =>
  ({ type: 'box', x, z, halfX, halfZ, minY, maxY, rotation });

export const circleCollider = (x, z, radius, minY, maxY) =>
  ({ type: 'circle', x, z, radius, minY, maxY });

export function colliderBounds(collider) {
  if (collider.type === 'circle') {
    return { minX: collider.x - collider.radius, maxX: collider.x + collider.radius,
      minZ: collider.z - collider.radius, maxZ: collider.z + collider.radius };
  }
  const c = Math.abs(Math.cos(collider.rotation)), s = Math.abs(Math.sin(collider.rotation));
  const extentX = collider.halfX * c + collider.halfZ * s;
  const extentZ = collider.halfX * s + collider.halfZ * c;
  return { minX: collider.x - extentX, maxX: collider.x + extentX,
    minZ: collider.z - extentZ, maxZ: collider.z + extentZ };
}

export function createCollisionIndex(initialColliders = [], cellSize = 8) {
  if (!(cellSize > 0) || !Number.isFinite(cellSize)) throw new RangeError('El tamaño de celda debe ser positivo');
  const cells = new Map();
  const memberships = new Map();
  const insertionOrder = new Map();
  let nextOrder = 0;
  let queries = 0;
  let candidateTotal = 0;
  const cellKey = (x, z) => `${x},${z}`;
  const cellRange = bounds => ({
    minX: Math.floor(bounds.minX / cellSize), maxX: Math.floor(bounds.maxX / cellSize),
    minZ: Math.floor(bounds.minZ / cellSize), maxZ: Math.floor(bounds.maxZ / cellSize),
  });

  const remove = collider => {
    const keys = memberships.get(collider);
    if (!keys) return false;
    for (const key of keys) {
      const bucket = cells.get(key);
      bucket.delete(collider);
      if (bucket.size === 0) cells.delete(key);
    }
    memberships.delete(collider);
    insertionOrder.delete(collider);
    return true;
  };
  const add = collider => {
    remove(collider);
    const range = cellRange(colliderBounds(collider));
    const keys = [];
    for (let x = range.minX; x <= range.maxX; x++) for (let z = range.minZ; z <= range.maxZ; z++) {
      const key = cellKey(x, z);
      if (!cells.has(key)) cells.set(key, new Set());
      cells.get(key).add(collider);
      keys.push(key);
    }
    memberships.set(collider, keys);
    insertionOrder.set(collider, nextOrder++);
    return collider;
  };
  const queryBounds = (minX, minZ, maxX, maxZ) => {
    const requested = { minX: Math.min(minX, maxX), maxX: Math.max(minX, maxX),
      minZ: Math.min(minZ, maxZ), maxZ: Math.max(minZ, maxZ) };
    const range = cellRange(requested);
    const candidates = new Set();
    for (let x = range.minX; x <= range.maxX; x++) for (let z = range.minZ; z <= range.maxZ; z++) {
      for (const collider of cells.get(cellKey(x, z)) ?? []) candidates.add(collider);
    }
    const result = [...candidates].filter(collider => {
      const bounds = colliderBounds(collider);
      return bounds.maxX >= requested.minX && bounds.minX <= requested.maxX &&
        bounds.maxZ >= requested.minZ && bounds.minZ <= requested.maxZ;
    }).sort((a, b) => insertionOrder.get(a) - insertionOrder.get(b));
    queries++;
    candidateTotal += result.length;
    return result;
  };

  initialColliders.forEach(add);
  return {
    add,
    remove,
    queryBounds,
    queryRadius: (x, z, radius) => queryBounds(x - radius, z - radius, x + radius, z + radius),
    get size() { return memberships.size; },
    get stats() {
      return { colliderCount: memberships.size, cellCount: cells.size, queries,
        averageCandidates: queries ? candidateTotal / queries : 0 };
    },
  };
}

const nearbyColliders = (source, x, z, radius) =>
  typeof source.queryRadius === 'function' ? source.queryRadius(x, z, radius) : source;

export function footprintOverlaps(collider, x, z, radius = PLAYER_RADIUS) {
  const dx = x - collider.x, dz = z - collider.z;
  if (collider.type === 'circle') return dx * dx + dz * dz < (collider.radius + radius) ** 2;
  const c = Math.cos(collider.rotation), s = Math.sin(collider.rotation);
  const localX = dx * c - dz * s, localZ = dx * s + dz * c;
  const edgeX = Math.max(Math.abs(localX) - collider.halfX, 0);
  const edgeZ = Math.max(Math.abs(localZ) - collider.halfZ, 0);
  return edgeX * edgeX + edgeZ * edgeZ < radius * radius;
}

export function floorHeight(colliders, x, z, previousFootY, terrainY,
  radius = PLAYER_RADIUS, stepHeight = STEP_HEIGHT) {
  let floor = terrainY;
  for (const collider of nearbyColliders(colliders, x, z, radius)) {
    const top = collider.maxY;
    if (top > floor && top <= previousFootY + stepHeight + .0001 &&
      footprintOverlaps(collider, x, z, radius)) floor = top;
  }
  return floor;
}

function pushOut(collider, x, z, radius) {
  const dx = x - collider.x, dz = z - collider.z;
  if (collider.type === 'circle') {
    const distance = Math.hypot(dx, dz);
    const limit = collider.radius + radius;
    if (distance >= limit) return null;
    const directionX = distance > .00001 ? dx / distance : 1;
    const directionZ = distance > .00001 ? dz / distance : 0;
    return { x: collider.x + directionX * (limit + .0001), z: collider.z + directionZ * (limit + .0001) };
  }
  const c = Math.cos(collider.rotation), s = Math.sin(collider.rotation);
  let localX = dx * c - dz * s, localZ = dx * s + dz * c;
  const nearX = Math.max(-collider.halfX, Math.min(collider.halfX, localX));
  const nearZ = Math.max(-collider.halfZ, Math.min(collider.halfZ, localZ));
  const awayX = localX - nearX, awayZ = localZ - nearZ;
  const distance = Math.hypot(awayX, awayZ);
  if (distance >= radius) return null;
  if (distance > .00001) {
    localX += awayX / distance * (radius - distance + .0001);
    localZ += awayZ / distance * (radius - distance + .0001);
  } else {
    const toX = collider.halfX - Math.abs(localX);
    const toZ = collider.halfZ - Math.abs(localZ);
    if (toX < toZ) localX = Math.sign(localX || 1) * (collider.halfX + radius + .0001);
    else localZ = Math.sign(localZ || 1) * (collider.halfZ + radius + .0001);
  }
  return { x: collider.x + localX * c + localZ * s, z: collider.z - localX * s + localZ * c };
}

export function moveWithCollisions(colliders, startX, startZ, targetX, targetZ, footY,
  radius = PLAYER_RADIUS, height = PLAYER_HEIGHT, stepHeight = STEP_HEIGHT) {
  const distance = Math.hypot(targetX - startX, targetZ - startZ);
  const steps = Math.max(1, Math.ceil(distance / (radius * .45)));
  const stepX = (targetX - startX) / steps, stepZ = (targetZ - startZ) / steps;
  let x = startX, z = startZ;
  for (let step = 0; step < steps; step++) {
    x += stepX; z += stepZ;
    for (let pass = 0; pass < 3; pass++) {
      let corrected = false;
      for (const collider of nearbyColliders(colliders, x, z, radius)) {
        if (footY + height <= collider.minY || footY + stepHeight >= collider.maxY) continue;
        const pushed = pushOut(collider, x, z, radius);
        if (pushed) { x = pushed.x; z = pushed.z; corrected = true; }
      }
      if (!corrected) break;
    }
  }
  return { x, z };
}
