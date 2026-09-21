import test from 'node:test';
import assert from 'node:assert/strict';
import { CRATER_CONTENT, MOUNTAIN_CONTENT, TERRAIN_SIZE, WORLD_BOUNDS,
  validateCraterContent, validateMountainContent } from '../src/world/terrain-content.js';
import { craterProfile, heightAt, mountainProfile } from '../src/world/terrain.js';

test('crater configuration has valid unique definitions', () => {
  assert.equal(validateCraterContent(CRATER_CONTENT), true);
  assert.equal(new Set(CRATER_CONTENT.map(crater => crater.id)).size, CRATER_CONTENT.length);
});

test('every crater has a depressed floor, raised rim, and finite terrain height', () => {
  for (const crater of CRATER_CONTENT) {
    const center = craterProfile(crater, crater.x, crater.z);
    const rimRadius = crater.radius * (1 + .045 * Math.sin(crater.phase) + .025 * Math.sin(-crater.phase * .7));
    const rim = craterProfile(crater, crater.x + rimRadius, crater.z);
    const outside = craterProfile(crater, crater.x + crater.radius * 2, crater.z);
    assert.ok(center.height < -crater.depth * .95, `${crater.id} necesita un fondo profundo`);
    assert.ok(rim.height > crater.rimHeight * .95, `${crater.id} necesita un borde elevado`);
    assert.equal(outside.height, 0);
    assert.ok(Number.isFinite(heightAt(crater.x, crater.z)));
  }
});

test('invalid crater radius is rejected', () => {
  const invalid = structuredClone(CRATER_CONTENT);
  invalid[0].radius = 0;
  assert.throws(() => validateCraterContent(invalid), /radio y profundidad/);
});

test('mountains are valid physical terrain inside the expanded map', () => {
  assert.equal(validateMountainContent(MOUNTAIN_CONTENT), true);
  for (const mountain of MOUNTAIN_CONTENT) {
    const summit = mountainProfile(mountain, mountain.x, mountain.z);
    const outside = mountainProfile(mountain, mountain.x + mountain.radiusX * 1.1, mountain.z);
    assert.ok(summit.height > mountain.height * .8, `${mountain.id} necesita una cima elevada`);
    assert.equal(outside.height, 0);
    assert.ok(heightAt(mountain.x, mountain.z) > mountain.height * .65);
  }
  const halfTerrain = TERRAIN_SIZE / 2;
  assert.ok(WORLD_BOUNDS.minX > -halfTerrain && WORLD_BOUNDS.maxX < halfTerrain);
  assert.ok(WORLD_BOUNDS.minZ > -halfTerrain && WORLD_BOUNDS.maxZ < halfTerrain);
});
