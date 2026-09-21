import * as THREE from 'three';
import { footprintOverlaps, moveWithCollisions, PLAYER_RADIUS } from '../collision.js';

const BODY_RADIUS = 2.25;
const BODY_CLEARANCE = 0;
const BODY_HEIGHT = 2.3;
const WHEEL_RADIUS = .56;
const MAX_SPEED = 2.8;
const MAX_SLOPE = .48;
const ARRIVAL_RADIUS = 3;

const angleDifference = (target, current) =>
  Math.atan2(Math.sin(target - current), Math.cos(target - current));

export function createRoverController({ rover, collider, collisionIndex, heightAt, bounds, random = Math.random }) {
  if (!rover || !collider) throw new TypeError('El controlador necesita un rover y su colisionador');
  const wheels = rover.userData.wheels ?? [];
  let target;
  let speed = 0;
  let blockedTime = 0;

  const terrainSlopeAt = (x, z) => {
    const sample = 1.5;
    const dx = heightAt(x + sample, z) - heightAt(x - sample, z);
    const dz = heightAt(x, z + sample) - heightAt(x, z - sample);
    return Math.hypot(dx, dz) / (sample * 2);
  };

  const targetIsClear = (x, z) => {
    if (terrainSlopeAt(x, z) > MAX_SLOPE) return false;
    return !(collisionIndex.queryRadius(x, z, BODY_RADIUS + .5)
      .some(candidate => candidate !== collider && footprintOverlaps(candidate, x, z, BODY_RADIUS)));
  };

  const chooseTarget = () => {
    const inset = BODY_RADIUS + 4;
    for (let attempt = 0; attempt < 12; attempt++) {
      const x = THREE.MathUtils.lerp(bounds.minX + inset, bounds.maxX - inset, random());
      const z = THREE.MathUtils.lerp(bounds.minZ + inset, bounds.maxZ - inset, random());
      if (Math.hypot(x - rover.position.x, z - rover.position.z) > 14 && targetIsClear(x, z)) {
        target = { x, z };
        return;
      }
    }
    target = { x: rover.position.x, z: rover.position.z };
  };

  const updateCollider = () => {
    const groundY = heightAt(rover.position.x, rover.position.z);
    collider.x = rover.position.x;
    collider.z = rover.position.z;
    collider.rotation = rover.rotation.y;
    collider.minY = groundY;
    collider.maxY = groundY + BODY_HEIGHT;
  };

  return {
    get target() { return target && { ...target }; },
    get speed() { return speed; },
    update(dt, playerPosition) {
      dt = Math.min(Math.max(dt, 0), .05);
      if (!target || Math.hypot(target.x - rover.position.x, target.z - rover.position.z) < ARRIVAL_RADIUS) {
        chooseTarget();
      }

      const toTargetX = target.x - rover.position.x;
      const toTargetZ = target.z - rover.position.z;
      const targetDistance = Math.hypot(toTargetX, toTargetZ);
      const desiredHeading = Math.atan2(-toTargetZ, toTargetX);
      const turn = angleDifference(desiredHeading, rover.rotation.y);
      const maxTurn = (.45 + Math.min(speed / MAX_SPEED, 1) * .45) * dt;
      rover.rotation.y += THREE.MathUtils.clamp(turn, -maxTurn, maxTurn);

      const cornering = THREE.MathUtils.clamp(1 - Math.abs(turn) / Math.PI, .25, 1);
      const arrival = THREE.MathUtils.clamp(targetDistance / 10, .2, 1);
      const desiredSpeed = MAX_SPEED * cornering * arrival;
      speed = THREE.MathUtils.damp(speed, desiredSpeed, desiredSpeed < speed ? 3.8 : 1.2, dt);

      const forwardX = Math.cos(rover.rotation.y);
      const forwardZ = -Math.sin(rover.rotation.y);
      const proposedX = THREE.MathUtils.clamp(rover.position.x + forwardX * speed * dt,
        bounds.minX + BODY_RADIUS, bounds.maxX - BODY_RADIUS);
      const proposedZ = THREE.MathUtils.clamp(rover.position.z + forwardZ * speed * dt,
        bounds.minZ + BODY_RADIUS, bounds.maxZ - BODY_RADIUS);
      const intendedDistance = Math.hypot(proposedX - rover.position.x, proposedZ - rover.position.z);
      const groundY = heightAt(rover.position.x, rover.position.z);
      const nextGroundY = heightAt(proposedX, proposedZ);
      const grade = intendedDistance > 0 ? Math.abs(nextGroundY - groundY) / intendedDistance : 0;
      const playerBlocks = playerPosition && Math.hypot(proposedX - playerPosition.x,
        proposedZ - playerPosition.z) < BODY_RADIUS + PLAYER_RADIUS + .4;

      let nextX = rover.position.x;
      let nextZ = rover.position.z;
      let travelled = 0;
      collisionIndex.remove(collider);
      try {
        if (grade <= MAX_SLOPE && !playerBlocks) {
          const resolved = moveWithCollisions(collisionIndex, rover.position.x, rover.position.z,
            proposedX, proposedZ, groundY, BODY_RADIUS, BODY_HEIGHT, .24);
          nextX = resolved.x;
          nextZ = resolved.z;
        }

        travelled = Math.hypot(nextX - rover.position.x, nextZ - rover.position.z);
        const expected = Math.max(intendedDistance, .0001);
        if (travelled < expected * .35 || grade > MAX_SLOPE || playerBlocks) {
          speed = THREE.MathUtils.damp(speed, 0, 7, dt);
          blockedTime += dt;
          if (blockedTime > 1.1) {
            chooseTarget();
            blockedTime = 0;
          }
        } else {
          blockedTime = 0;
        }

        rover.position.x = nextX;
        rover.position.z = nextZ;
        rover.position.y = heightAt(nextX, nextZ) + BODY_CLEARANCE;
        const localZx = Math.sin(rover.rotation.y);
        const localZz = Math.cos(rover.rotation.y);
        const frontHeight = heightAt(nextX + forwardX * 1.55, nextZ + forwardZ * 1.55);
        const rearHeight = heightAt(nextX - forwardX * 1.55, nextZ - forwardZ * 1.55);
        const leftHeight = heightAt(nextX + localZx * 1.15, nextZ + localZz * 1.15);
        const rightHeight = heightAt(nextX - localZx * 1.15, nextZ - localZz * 1.15);
        rover.rotation.z = THREE.MathUtils.damp(rover.rotation.z,
          Math.atan2(frontHeight - rearHeight, 3.1), 7, dt);
        rover.rotation.x = THREE.MathUtils.damp(rover.rotation.x,
          -Math.atan2(leftHeight - rightHeight, 2.3), 7, dt);

        const signedDistance = travelled * Math.sign((nextX - collider.x) * forwardX + (nextZ - collider.z) * forwardZ || 1);
        for (const wheel of wheels) wheel.rotation.z -= signedDistance / WHEEL_RADIUS;
        updateCollider();
      } finally {
        collisionIndex.add(collider);
      }

      return { distance: travelled, speed, target: { ...target } };
    },
  };
}
