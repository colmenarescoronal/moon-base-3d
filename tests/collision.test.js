import test from 'node:test';
import assert from 'node:assert/strict';
import { boxCollider, circleCollider, createCollisionIndex, floorHeight, footprintOverlaps, moveWithCollisions } from '../src/collision.js';

test('a fast character stops at a habitat wall', () => {
  const wall = boxCollider(0, 0, 1, 1, 0, 5);
  const result = moveWithCollisions([wall], 0, 4, 0, -4, 0);
  assert.ok(result.z > 1.55 && result.z < 1.58);
  assert.equal(footprintOverlaps(wall, result.x, result.z), false);
});

test('a character slides along a rotated rover instead of entering it', () => {
  const rover = boxCollider(0, 0, 2, 1, 0, 2.3, Math.PI / 5);
  const result = moveWithCollisions([rover], -3, 2.8, 2.5, .2, 0);
  assert.equal(footprintOverlaps(rover, result.x, result.z), false);
  assert.ok(result.x > -3);
});

test('a narrow pole cannot be crossed at running speed', () => {
  const pole = circleCollider(0, 0, .18, 0, 5);
  const result = moveWithCollisions([pole], -3, 0, 3, 0, 0);
  assert.ok(result.x < -.73);
});

test('low equipment can be stepped onto while tall objects require a jump', () => {
  const low = boxCollider(0, 0, .5, .5, 0, .22);
  const high = boxCollider(3, 0, .5, .5, 0, 2.3);
  const stepped = moveWithCollisions([low], 0, 2, 0, 0, 0);
  assert.ok(Math.abs(stepped.z) < .001);
  assert.equal(floorHeight([low], 0, 0, 0, 0), .22);
  assert.equal(floorHeight([high], 3, 0, 0, 0), 0);
  assert.equal(floorHeight([high], 3, 0, 2.5, 0), 2.3);
  const above = moveWithCollisions([high], 3, 2, 3, 0, 2.5);
  assert.ok(Math.abs(above.z) < .001);
});

test('an overhead object does not block walking beneath it', () => {
  const dish = circleCollider(0, 0, 1, 6, 9);
  const result = moveWithCollisions([dish], 0, 2, 0, 0, 0);
  assert.ok(Math.abs(result.z) < .001);
});

test('spatial index preserves movement and floor results', () => {
  const colliders = [
    boxCollider(0, 0, 1, 1, 0, 5),
    boxCollider(3, 0, .5, .5, 0, .22, Math.PI / 6),
    circleCollider(-4, 1, .8, 0, 4),
  ];
  const index = createCollisionIndex(colliders, 4);
  const fromList = moveWithCollisions(colliders, 0, 4, 0, -4, 0);
  const fromIndex = moveWithCollisions(index, 0, 4, 0, -4, 0);
  assert.deepEqual(fromIndex, fromList);
  assert.equal(floorHeight(index, 3, 0, 0, 0), floorHeight(colliders, 3, 0, 0, 0));
});

test('spatial index reduces nearby candidates and reports query measurements', () => {
  const colliders = Array.from({ length: 100 }, (_, index) =>
    circleCollider((index % 10) * 20, Math.floor(index / 10) * 20, .5, 0, 3));
  const index = createCollisionIndex(colliders, 8);
  const nearby = index.queryRadius(0, 0, 1);
  assert.equal(index.size, 100);
  assert.deepEqual(nearby, [colliders[0]]);
  assert.ok(nearby.length < colliders.length / 10);
  assert.equal(index.stats.queries, 1);
  assert.equal(index.stats.averageCandidates, 1);
  assert.ok(index.stats.cellCount >= index.size);
});

test('spatial index supports adding and removing dynamic colliders', () => {
  const index = createCollisionIndex([], 5);
  const collider = boxCollider(2, 3, 1, 1, 0, 4, Math.PI / 4);
  index.add(collider);
  assert.equal(index.queryRadius(2, 3, .5).includes(collider), true);
  assert.equal(index.remove(collider), true);
  assert.equal(index.queryRadius(2, 3, .5).length, 0);
});
