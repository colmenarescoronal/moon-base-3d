import * as THREE from 'three';

function createNameSprite(name, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const context = canvas.getContext('2d');
  context.fillStyle = 'rgba(4, 8, 12, .78)';
  context.strokeStyle = color;
  context.lineWidth = 3;
  context.fillRect(5, 5, 502, 76);
  context.strokeRect(5, 5, 502, 76);
  context.fillStyle = color;
  context.font = '500 34px "DM Mono", monospace';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(name.toUpperCase(), 256, 43, 470);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.position.y = 5.55;
  sprite.scale.set(4.8, .9, 1);
  sprite.renderOrder = 20;
  return sprite;
}

function mesh(geometry, material, parent, x, y, z) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(x, y, z);
  object.castShadow = true;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}

export function createRemotePlayer(scene, state, heightAt) {
  const root = new THREE.Group();
  root.name = `remote-player:${state.id}`;
  root.position.set(state.x, Number.isFinite(state.y) ? state.y : heightAt(state.x, state.z), state.z);
  root.rotation.y = state.rotationY || 0;

  const suit = new THREE.MeshStandardMaterial({ color: 0xc8c9c3, roughness: .9 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf0f1ed, roughness: .76 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x17242c, metalness: .5, roughness: .2 });
  const accent = new THREE.MeshStandardMaterial({ color: state.color || '#7ee7ff', emissive: state.color || '#7ee7ff', emissiveIntensity: .18 });

  const torso = mesh(new THREE.BoxGeometry(1.35, 1.75, .82), suit, root, 0, 2.3, 0);
  mesh(new THREE.BoxGeometry(1.08, 1.4, .5), white, root, 0, 2.38, .55);
  mesh(new THREE.BoxGeometry(.95, 1.45, .44), white, root, 0, 2.38, -.59);
  const helmet = mesh(new THREE.SphereGeometry(.72, 20, 14), white, root, 0, 3.73, -.04);
  const visor = mesh(new THREE.SphereGeometry(.57, 20, 14), dark, helmet, 0, -.02, -.42);
  visor.scale.set(1.05, .82, .43);
  mesh(new THREE.BoxGeometry(.82, .13, .1), accent, root, 0, 2.72, .83);

  const arms = [];
  const legs = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * .86, 2.75, 0);
    root.add(arm);
    mesh(new THREE.CapsuleGeometry(.23, 1.02, 5, 10), suit, arm, 0, -.53, 0);
    arms.push(arm);
    const leg = new THREE.Group();
    leg.position.set(side * .38, 1.45, 0);
    root.add(leg);
    mesh(new THREE.CapsuleGeometry(.3, 1.05, 5, 10), suit, leg, 0, -.57, 0);
    mesh(new THREE.BoxGeometry(.57, .28, .8), white, leg, 0, -1.25, -.13);
    legs.push(leg);
  }

  root.add(createNameSprite(state.name, state.color || '#7ee7ff'));
  root.scale.setScalar(.92);
  scene.add(root);

  const target = {
    x: state.x, y: root.position.y, z: state.z,
    rotationY: state.rotationY || 0, speed: state.speed || 0, grounded: state.grounded !== false,
  };
  let walkPhase = 0;

  return {
    root,
    setTarget(next) {
      target.x = next.x;
      target.z = next.z;
      target.y = Number.isFinite(next.y) ? next.y : heightAt(next.x, next.z);
      target.rotationY = next.rotationY || 0;
      target.speed = next.speed || 0;
      target.grounded = next.grounded !== false;
    },
    update(dt) {
      const positionBlend = 1 - Math.exp(-12 * dt);
      root.position.x = THREE.MathUtils.lerp(root.position.x, target.x, positionBlend);
      root.position.y = THREE.MathUtils.lerp(root.position.y, target.y, positionBlend);
      root.position.z = THREE.MathUtils.lerp(root.position.z, target.z, positionBlend);
      const turn = Math.atan2(Math.sin(target.rotationY - root.rotation.y), Math.cos(target.rotationY - root.rotation.y));
      root.rotation.y += turn * (1 - Math.exp(-14 * dt));
      const motion = THREE.MathUtils.clamp(target.speed / 5.2, 0, 1.5) * Number(target.grounded);
      walkPhase += target.speed * dt * 1.9;
      const stride = Math.sin(walkPhase) * .52 * motion;
      legs[0].rotation.x = stride;
      legs[1].rotation.x = -stride;
      arms[0].rotation.x = -stride * .65;
      arms[1].rotation.x = stride * .65;
      torso.position.y = 2.3 + Math.abs(Math.sin(walkPhase)) * .045 * motion;
    },
    dispose() {
      scene.remove(root);
      root.traverse(object => {
        object.geometry?.dispose();
        if (object.material?.map) object.material.map.dispose();
        object.material?.dispose();
      });
    },
  };
}
