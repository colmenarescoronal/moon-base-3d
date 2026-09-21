import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

// The source model includes loose rectangular display props alongside the suit.
const displayProps = new Set([
  'EMU:emusuit21_jetpack2SG',
  'EMU:initialShadingGroup',
  'EMU:emusuit21_lambert5SG',
  'EMU:emusuit21_emusuit5_jetpack2SG',
  'EMU:emusuit21_emusuit5_lambert5SG',
]);

const smooth = (a, b, value) => {
  const t = THREE.MathUtils.clamp((value - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

function createSkeleton(astronaut) {
  const base = new THREE.Bone(); base.name = 'hipsRoot'; astronaut.add(base);
  const torso = new THREE.Bone(); torso.name = 'torso'; torso.position.y = 1.18; base.add(torso);
  const head = new THREE.Bone(); head.name = 'head'; head.position.set(0, 1.88, -.08); torso.add(head);
  const arms = [], elbows = [], legs = [], knees = [], feet = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Bone(); arm.name = side < 0 ? 'leftShoulder' : 'rightShoulder';
    arm.position.set(side * .68, 1.4, 0); torso.add(arm); arms.push(arm);
    const elbow = new THREE.Bone(); elbow.name = side < 0 ? 'leftElbow' : 'rightElbow';
    elbow.position.set(side * .13, -.55, -.02); arm.add(elbow); elbows.push(elbow);
    const leg = new THREE.Bone(); leg.name = side < 0 ? 'leftHip' : 'rightHip';
    leg.position.set(side * .29, 1.52, 0); base.add(leg); legs.push(leg);
    const knee = new THREE.Bone(); knee.name = side < 0 ? 'leftKnee' : 'rightKnee';
    knee.position.y = -.73; leg.add(knee); knees.push(knee);
    const foot = new THREE.Bone(); foot.name = side < 0 ? 'leftFoot' : 'rightFoot';
    foot.position.set(0, -.59, -.04); knee.add(foot); feet.push(foot);
  }
  const bones = [base, torso, head, arms[0], elbows[0], arms[1], elbows[1],
    legs[0], knees[0], feet[0], legs[1], knees[1], feet[1]];
  astronaut.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(bones);
  skeleton.calculateInverses();
  return { skeleton, rig: { torso, head, arms, elbows, legs, knees, feet } };
}

function skinGeometry(geometry, materialName) {
  const position = geometry.getAttribute('position');
  const indices = new Uint16Array(position.count * 4);
  const weights = new Float32Array(position.count * 4);
  const backpack = /jetpack/i.test(materialName);
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
    const left = x < 0;
    const influence = [];
    if (!backpack && y < 1.68 && z < .65) {
      const legBlend = 1 - smooth(1.35, 1.68, y);
      const thigh = left ? 7 : 10, shin = left ? 8 : 11, foot = left ? 9 : 12;
      const kneeBlend = 1 - smooth(.73, .96, y);
      const footBlend = 1 - smooth(.24, .43, y);
      influence.push([1, 1 - legBlend], [thigh, legBlend * (1 - kneeBlend)],
        [shin, legBlend * kneeBlend * (1 - footBlend)], [foot, legBlend * kneeBlend * footBlend]);
    } else {
      const headBlend = !backpack ? smooth(2.66, 2.98, y) *
        (1 - smooth(.5, .76, Math.abs(x))) * (1 - smooth(.25, .72, z)) : 0;
      const armBlend = !backpack ? smooth(.42, .65, Math.abs(x)) *
        smooth(1.4, 1.65, y) * (1 - smooth(2.75, 3.04, y)) *
        (1 - smooth(.3, .75, z)) : 0;
      const lowerArm = 1 - smooth(1.92, 2.17, y);
      const arm = left ? 3 : 5, elbow = left ? 4 : 6;
      const headWeight = headBlend;
      const armWeight = (1 - headWeight) * armBlend;
      influence.push([1, 1 - headWeight - armWeight], [2, headWeight],
        [arm, armWeight * (1 - lowerArm)], [elbow, armWeight * lowerArm]);
    }
    const total = influence.reduce((sum, [, value]) => sum + value, 0) || 1;
    for (let slot = 0; slot < 4; slot++) {
      indices[i * 4 + slot] = influence[slot]?.[0] ?? 0;
      weights[i * 4 + slot] = (influence[slot]?.[1] ?? 0) / total;
    }
  }
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(indices, 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
}

export async function loadRealisticAstronaut(astronaut) {
  const draco = new DRACOLoader();
  draco.setDecoderPath('/draco/');
  const loader = new GLTFLoader();
  loader.setDRACOLoader(draco);
  try {
    const gltf = await loader.loadAsync('/models/astronaut-emu.glb');
    gltf.scene.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(gltf.scene);
    const scale = 3.55 / bounds.getSize(new THREE.Vector3()).y;
    const center = bounds.getCenter(new THREE.Vector3());
    const originalRig = astronaut.userData.rig;
    const { skeleton, rig } = createSkeleton(astronaut);
    const meshes = [];
    gltf.scene.traverse(node => {
      if (!node.isMesh || displayProps.has(node.material.name)) return;
      const geometry = node.geometry.clone();
      geometry.applyMatrix4(node.matrixWorld);
      geometry.translate(-center.x, -bounds.min.y, -center.z);
      geometry.scale(scale, scale, scale);
      skinGeometry(geometry, node.material.name || '');
      const material = node.material.clone();
      material.transmission = 0;
      material.opacity = 1;
      material.transparent = false;
      material.depthWrite = true;
      const visual = new THREE.SkinnedMesh(geometry, material);
      visual.castShadow = true;
      visual.receiveShadow = true;
      visual.frustumCulled = false;
      astronaut.add(visual);
      meshes.push(visual);
    });
    astronaut.updateMatrixWorld(true);
    skeleton.calculateInverses();
    for (const mesh of meshes) mesh.bind(skeleton);
    originalRig.torso.visible = false;
    for (const leg of originalRig.legs) leg.visible = false;
    astronaut.userData.rig = rig;
    astronaut.userData.detailedModel = true;
  } finally {
    draco.dispose();
  }
}
