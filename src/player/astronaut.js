import * as THREE from 'three';
import { box, sphere, cyl } from '../world/geometry.js';
import { loadRealisticAstronaut } from './model.js';

export function createAstronaut(scene, heightAt, materials, x = 4.7, z = 7) {
  const { mat, pale, white, dark, metal, blue } = materials;
  const root = new THREE.Group(); root.position.set(x, heightAt(x, z), z); scene.add(root);
  const suit = mat(0xc8c9c3, { roughness: .91 });
  const joint = mat(0x9b9f9e, { roughness: .9 });
  const torso = new THREE.Group(); torso.position.y = 1.18; root.add(torso);
  // Keep the procedural rig visible until the detailed model has loaded.
  box(1.1, 1.45, .68, suit, torso, 0, .87, 0);
  box(.77, .7, .72, suit, torso, 0, .07, 0);
  box(1.1, 1.35, .43, white, torso, 0, .95, .54);
  box(.75, .85, .15, pale, torso, 0, .94, .82);
  box(.82, .13, .1, blue, torso, 0, 1.3, .91);
  box(.25, .25, .08, dark, torso, .29, .78, .93);
  cyl(.17, .17, .18, metal, torso, -.28, .9, .93, 12).rotation.x = Math.PI / 2;
  const head = new THREE.Group(); head.position.set(0, 2, -.08); torso.add(head);
  sphere(.55, white, head, 0, 0, 0, 24, 16);
  const visor = sphere(.42, mat(0x1a252d, { metalness: .75, roughness: .16 }), head, 0, 0, -.25, 24, 16);
  visor.scale.set(1.04, .86, .48);
  const glint = sphere(.18, mat(0xb0b5af, { metalness: .8, roughness: .25 }), head, -.15, .17, -.44, 16, 10); glint.scale.set(1.15, .55, .15);
  const arms = [], elbows = [], legs = [], knees = [], feet = [];
  for (const s of [-1, 1]) {
    const shoulder = new THREE.Group(); shoulder.position.set(s * .68, 1.37, 0); torso.add(shoulder);
    sphere(.24, joint, shoulder, 0, 0, 0);
    cyl(.21, .22, .75, suit, shoulder, s * .05, -.38, .02, 12).rotation.z = s * -.1;
    const elbow = new THREE.Group(); elbow.position.set(s * .08, -.75, .03); shoulder.add(elbow);
    sphere(.22, joint, elbow);
    cyl(.2, .18, .62, suit, elbow, s * .04, -.3, .02, 12);
    sphere(.2, white, elbow, s * .08, -.64, .03);
    shoulder.rotation.z = s * .13;
    arms.push(shoulder); elbows.push(elbow);

    const hip = new THREE.Group(); hip.position.set(s * .29, 1.2, 0); root.add(hip);
    sphere(.27, joint, hip);
    cyl(.27, .25, .7, suit, hip, 0, -.34, 0, 12);
    const knee = new THREE.Group(); knee.position.set(0, -.69, 0); hip.add(knee);
    sphere(.25, joint, knee);
    cyl(.22, .23, .46, suit, knee, 0, -.23, 0, 12);
    const foot = new THREE.Group(); foot.position.set(0, -.47, 0); knee.add(foot);
    box(.42, .22, .59, white, foot, 0, 0, -.15);
    legs.push(hip); knees.push(knee); feet.push(foot);
  }
  sphere(.13, mat(0xb66a65), torso, -.47, 1.26, .52, 10, 8);
  root.userData.rig = { torso, head, arms, elbows, legs, knees, feet };
  root.scale.setScalar(1.45);
  root.rotation.y = .18;
  loadRealisticAstronaut(root).catch(error => console.error('No se pudo cargar el astronauta detallado:', error));
  return root;
}
