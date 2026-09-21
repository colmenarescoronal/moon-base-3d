import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { boxCollider } from '../src/collision.js';
import { createPlayerInput } from '../src/player/input.js';
import { createPlayerController } from '../src/player/controller.js';
import { PLAYER_MOVEMENT } from '../src/player/movement-config.js';

function dispatch(target, type, code) {
  const event = new Event(type, { cancelable: true });
  Object.defineProperty(event, 'code', { value: code });
  target.dispatchEvent(event);
  return event;
}

function makeRig() {
  const group = () => new THREE.Group();
  return {
    torso: group(), head: group(),
    arms: [group(), group()], elbows: [group(), group()],
    legs: [group(), group()], knees: [group(), group()], feet: [group(), group()],
  };
}

function makeController(input, colliders = [], bounds, footstepSound) {
  const astronaut = new THREE.Group();
  astronaut.userData.rig = makeRig();
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(0, 5, 10);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const world = { heightAt: () => 0, solidColliders: colliders, ...(bounds ? { bounds } : {}) };
  return { astronaut, controller: createPlayerController({ astronaut, camera, input, world, footstepSound }) };
}

test('movement keys, running, and jump press are sampled independently', () => {
  const target = new EventTarget();
  const input = createPlayerInput(target);
  assert.equal(dispatch(target, 'keydown', 'KeyW').defaultPrevented, true);
  dispatch(target, 'keydown', 'ShiftLeft');
  dispatch(target, 'keydown', 'Space');
  assert.deepEqual(input.sample(), { x: 0, z: -1, run: true, jump: true });
  assert.deepEqual(input.sample(), { x: 0, z: -1, run: true, jump: false });
  dispatch(target, 'keydown', 'Space');
  assert.equal(input.sample().jump, false);
  dispatch(target, 'keyup', 'Space');
  dispatch(target, 'keydown', 'Space');
  assert.equal(input.sample().jump, true);
  target.dispatchEvent(new Event('blur'));
  assert.deepEqual(input.sample(), { x: 0, z: 0, run: false, jump: false });
  input.dispose();
});

test('typing the astronaut name does not move the player', () => {
  const textField = new EventTarget();
  textField.tagName = 'INPUT';
  const input = createPlayerInput(textField);
  const event = dispatch(textField, 'keydown', 'KeyW');
  assert.equal(event.defaultPrevented, false);
  assert.deepEqual(input.sample(), { x: 0, z: 0, run: false, jump: false });
  input.dispose();
});

test('running covers more ground while a solid wall still blocks movement', () => {
  const walkInput = { sample: () => ({ x: 0, z: -1, run: false, jump: false }) };
  const runInput = { sample: () => ({ x: 0, z: -1, run: true, jump: false }) };
  const walker = makeController(walkInput);
  const runner = makeController(runInput);
  for (let i = 0; i < 60; i++) {
    walker.controller.update(1 / 60);
    runner.controller.update(1 / 60);
  }
  assert.ok(-walker.astronaut.position.z > 4.3);
  assert.ok(-runner.astronaut.position.z > 7.5);
  assert.ok(-runner.astronaut.position.z > -walker.astronaut.position.z * 1.5);
  assert.ok(PLAYER_MOVEMENT.walkSpeed > 4.1);
  assert.ok(PLAYER_MOVEMENT.runSpeed > PLAYER_MOVEMENT.walkSpeed * 1.7);

  const blocked = makeController(runInput, [boxCollider(0, -3, 2, .5, 0, 5)]);
  for (let i = 0; i < 90; i++) blocked.controller.update(1 / 60);
  assert.ok(blocked.astronaut.position.z > -1.95);
  assert.ok(blocked.astronaut.position.z < -1.9);
});

test('grounded movement reports real distance to the footstep sound', () => {
  const samples = [];
  const input = { sample: () => ({ x: 0, z: -1, run: false, jump: false }) };
  const footsteps = { update: sample => samples.push(sample) };
  const { controller } = makeController(input, [], undefined, footsteps);
  for (let frame = 0; frame < 60; frame++) controller.update(1 / 60);

  assert.equal(samples.length, 60);
  assert.ok(samples.reduce((total, sample) => total + sample.distance, 0) > 4.3);
  assert.ok(samples.every(sample => sample.grounded && !sample.running));
});

test('a requested jump rises and lands on the terrain', () => {
  let firstFrame = true;
  const input = { sample: () => {
    const jump = firstFrame;
    firstFrame = false;
    return { x: 0, z: 0, run: false, jump };
  } };
  const { astronaut, controller } = makeController(input);
  let maxHeight = 0;
  let state;
  for (let i = 0; i < 180; i++) {
    state = controller.update(1 / 60);
    maxHeight = Math.max(maxHeight, astronaut.position.y);
  }
  assert.ok(maxHeight > 1);
  assert.equal(astronaut.position.y, 0);
  assert.equal(state.grounded, true);
});

test('world bounds allow exploration beyond the former limits', () => {
  const input = { sample: () => ({ x: 0, z: -1, run: true, jump: false }) };
  const bounds = { minX: -112, maxX: 112, minZ: -112, maxZ: 100 };
  const { astronaut, controller } = makeController(input, [], bounds);
  for (let i = 0; i < 600; i++) controller.update(1 / 60);
  assert.ok(astronaut.position.z < -45);
  assert.ok(astronaut.position.z >= bounds.minZ);
});
