import * as THREE from 'three';
import { floorHeight, moveWithCollisions, STEP_HEIGHT } from '../collision.js';
import { createPlayerAnimation } from './animation.js';
import { PLAYER_MOVEMENT } from './movement-config.js';

export function createPlayerController({ astronaut, camera, input, world, footstepSound }) {
  const velocity = new THREE.Vector3();
  const desiredVelocity = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const animation = createPlayerAnimation(astronaut);
  const collisionSource = world.collisionIndex ?? world.solidColliders;
  const bounds = world.bounds ?? { minX: -45, maxX: 45, minZ: -40, maxZ: 36 };
  let verticalVelocity = 0;
  let grounded = true;

  return {
    update(dt) {
      const { x, z, run, jump } = input.sample();
      desiredVelocity.set(0, 0, 0);
      if (x || z) {
        camera.getWorldDirection(forward); forward.y = 0; forward.normalize();
        right.crossVectors(forward, THREE.Object3D.DEFAULT_UP).normalize();
        desiredVelocity.copy(forward).multiplyScalar(-z).addScaledVector(right, x).normalize();
        desiredVelocity.multiplyScalar(run ? PLAYER_MOVEMENT.runSpeed : PLAYER_MOVEMENT.walkSpeed);
      }

      velocity.lerp(desiredVelocity, 1 - Math.exp(-(x || z ? PLAYER_MOVEMENT.acceleration : PLAYER_MOVEMENT.braking) * dt));
      if (velocity.lengthSq() < .0004) velocity.set(0, 0, 0);
      const jumpStarted = jump && grounded;
      if (jumpStarted) {
        grounded = false;
        verticalVelocity = PLAYER_MOVEMENT.jumpSpeed;
        animation.jump();
      }

      const targetX = THREE.MathUtils.clamp(astronaut.position.x + velocity.x * dt, bounds.minX, bounds.maxX);
      const targetZ = THREE.MathUtils.clamp(astronaut.position.z + velocity.z * dt, bounds.minZ, bounds.maxZ);
      const collisionFootY = astronaut.position.y + Math.max(verticalVelocity, 0) * dt;
      const resolved = moveWithCollisions(collisionSource, astronaut.position.x, astronaut.position.z,
        targetX, targetZ, collisionFootY);
      const nx = resolved.x, nz = resolved.z;
      const dx = nx - astronaut.position.x, dz = nz - astronaut.position.z;
      const supportY = floorHeight(collisionSource, nx, nz, astronaut.position.y, world.heightAt(nx, nz));
      let nextY = astronaut.position.y;
      if (grounded) {
        if (supportY < nextY - STEP_HEIGHT - .02) {
          grounded = false;
          verticalVelocity = 0;
        } else {
          nextY = supportY;
        }
      }
      if (!grounded) {
        nextY += verticalVelocity * dt;
        verticalVelocity -= PLAYER_MOVEMENT.gravity * dt;
        if (verticalVelocity <= 0 && nextY <= supportY) {
          nextY = supportY;
          verticalVelocity = 0;
          grounded = true;
          animation.land();
        }
      }
      astronaut.position.set(nx, nextY, nz);

      const speed = dt > 0 ? Math.hypot(dx, dz) / dt : 0;
      if (speed > .04) {
        const targetAngle = Math.atan2(-velocity.x, -velocity.z);
        const turn = Math.atan2(Math.sin(targetAngle - astronaut.rotation.y), Math.cos(targetAngle - astronaut.rotation.y));
        astronaut.rotation.y += turn * (1 - Math.exp(-PLAYER_MOVEMENT.turnSpeed * dt));
      }
      animation.update(dt, speed, grounded);
      footstepSound?.update({ distance: Math.hypot(dx, dz), grounded, running: run, speed });
      return { dx, dz, active: Boolean(x || z || jumpStarted), grounded };
    },
  };
}
