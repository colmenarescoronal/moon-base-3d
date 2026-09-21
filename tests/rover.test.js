import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { boxCollider, createCollisionIndex } from '../src/collision.js';
import { createRoverController } from '../src/world/rover-controller.js';

const bounds = { minX: -30, maxX: 30, minZ: -30, maxZ: 30 };

function makeRoverController({ obstacles = [], heightAt = () => 0 } = {}) {
  const rover = new THREE.Group();
  rover.rotation.order = 'YXZ';
  rover.position.y = heightAt(0, 0);
  rover.userData.wheels = Array.from({ length: 4 }, () => new THREE.Group());
  const collider = boxCollider(0, 0, 2.45, 1.7, 0, 2.3);
  const collisionIndex = createCollisionIndex([...obstacles, collider]);
  const values = [.9, .5];
  let index = 0;
  const controller = createRoverController({ rover, collider, collisionIndex, heightAt, bounds,
    random: () => values[index++ % values.length] });
  return { rover, collider, collisionIndex, controller };
}

test('rover accelerates toward a random destination and spins every wheel', () => {
  const heightAt = (x) => x * .03;
  const { rover, collider, collisionIndex, controller } = makeRoverController({ heightAt });
  for (let frame = 0; frame < 240; frame++) controller.update(1 / 60);

  assert.ok(rover.position.x > 4);
  assert.ok(controller.speed > 1);
  assert.equal(rover.position.y, heightAt(rover.position.x, rover.position.z));
  assert.ok(rover.userData.wheels.every(wheel => Math.abs(wheel.rotation.z) > 1));
  assert.equal(collider.x, rover.position.x);
  assert.equal(collider.z, rover.position.z);
  assert.equal(collisionIndex.size, 1);
});

test('rover stops before solid equipment and keeps its collider indexed', () => {
  const wall = boxCollider(7, 0, 1, 5, 0, 5);
  const { rover, collider, collisionIndex, controller } = makeRoverController({ obstacles: [wall] });
  for (let frame = 0; frame < 360; frame++) controller.update(1 / 60);

  assert.ok(rover.position.x < 3.8);
  assert.equal(collider.x, rover.position.x);
  assert.equal(collisionIndex.size, 2);
});

test('rover does not drive into the astronaut', () => {
  const { rover, controller } = makeRoverController();
  const astronaut = new THREE.Vector3(2.5, 0, 0);
  for (let frame = 0; frame < 120; frame++) controller.update(1 / 60, astronaut);
  assert.ok(rover.position.x < .1);
});
