import * as THREE from 'three';
import { PLAYER_MOVEMENT } from './movement-config.js';

export function createPlayerAnimation(astronaut) {
  let stepPhase = 0;
  let walkWeight = 0;
  let airWeight = 0;
  let elapsed = 0;
  let landingCompression = 0;

  return {
    jump() {
      landingCompression = 0;
    },
    land() {
      landingCompression = .1;
    },
    update(dt, speed, grounded) {
      elapsed += dt;
      const runRange = PLAYER_MOVEMENT.runSpeed - PLAYER_MOVEMENT.walkSpeed;
      const runWeight = THREE.MathUtils.clamp((speed - PLAYER_MOVEMENT.walkSpeed) / runRange, 0, 1);
      walkWeight = THREE.MathUtils.damp(walkWeight,
        THREE.MathUtils.clamp(speed / (PLAYER_MOVEMENT.walkSpeed * .78), 0, 1), 9, dt);
      airWeight = THREE.MathUtils.damp(airWeight, grounded ? 0 : 1, 9, dt);
      landingCompression *= Math.exp(-13 * dt);
      if (speed > .04) stepPhase += speed * dt * (1.9 + runWeight * .12);

      // The rig can change after the detailed GLB finishes loading.
      const rig = astronaut.userData.rig;
      const stride = Math.sin(stepPhase) * (.5 + runWeight * .16) * walkWeight;
      const bounce = Math.abs(Math.sin(stepPhase)) * .055 * walkWeight * (1 - airWeight);
      rig.torso.position.y = 1.18 + bounce + Math.sin(elapsed * 1.8) * .008 - landingCompression;
      rig.torso.rotation.x = .04 * walkWeight + .035 * runWeight + .05 * airWeight;
      rig.torso.rotation.y = Math.sin(stepPhase) * .045 * walkWeight;
      rig.torso.rotation.z = Math.cos(stepPhase) * .023 * walkWeight;
      rig.head.rotation.x = -rig.torso.rotation.x * .5 + Math.sin(elapsed * 1.2) * .006;
      rig.head.rotation.y = -rig.torso.rotation.y * .6;
      for (let i = 0; i < 2; i++) {
        const side = i === 0 ? 1 : -1;
        const legSwing = stride * side * (1 - .75 * airWeight);
        rig.legs[i].rotation.x = legSwing + .18 * airWeight;
        rig.legs[i].rotation.z = (i === 0 ? .035 : -.035) * walkWeight;
        rig.knees[i].rotation.x = -(Math.max(0, Math.sin(stepPhase * side - .25)) * (.53 + runWeight * .18) + .055) * walkWeight * (1 - airWeight) - .38 * airWeight;
        rig.feet[i].rotation.x = -rig.legs[i].rotation.x * .4 - rig.knees[i].rotation.x * .65;
        rig.arms[i].rotation.x = -legSwing * .66 + .25 * airWeight;
        rig.arms[i].rotation.z = (i === 0 ? -.13 : .13) - side * (.035 * walkWeight + .12 * airWeight);
        rig.elbows[i].rotation.x = -.18 - Math.max(0, -legSwing) * .4;
      }
    },
  };
}
