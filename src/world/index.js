import { createTerrain, heightAt } from './terrain.js';
import { createSky } from './sky.js';
import { createBase } from './base.js';
import { createCollisionIndex } from '../collision.js';
import { WORLD_BOUNDS } from './terrain-content.js';
import { createRoverController } from './rover-controller.js';

export function createWorld(scene, materials) {
  let seed = 72931;
  const rand = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
  const terrain = createTerrain(scene, { mat: materials.mat, rand });
  const earth = createSky(scene, rand);
  const base = createBase(scene, heightAt, materials);
  const solidColliders = [...terrain.colliders, ...base.colliders];
  const collisionIndex = createCollisionIndex(solidColliders);
  const roverControllers = base.rovers.map(rover => createRoverController({
    rover,
    collider: rover.userData.collider,
    collisionIndex,
    heightAt,
    bounds: WORLD_BOUNDS,
    random: rand,
  }));
  return {
    heightAt, bounds: WORLD_BOUNDS, solidColliders, collisionIndex, earth, terrain, base,
    update(dt, playerPosition) {
      roverControllers.forEach(controller => controller.update(dt, playerPosition));
    },
  };
}
