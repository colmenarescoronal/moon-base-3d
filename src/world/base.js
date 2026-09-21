import * as THREE from 'three';
import { boxCollider, circleCollider } from '../collision.js';
import { box, sphere, cyl, lineTube, rod } from './geometry.js';
import { BASE_CONTENT, validateBaseContent } from './content.js';

export function createBase(scene, heightAt, materials, content = BASE_CONTENT) {
  validateBaseContent(content);
  const { mat, pale, white, dark, metal, black, gold, blue, glow } = materials;
  const colliders = [];
  const objectsById = new Map();
  const collidersById = new Map();
  const register = (definition, object, objectColliders = []) => {
    if (definition.solid && objectColliders.length === 0) {
      throw new Error(`El objeto sólido ${definition.id} no generó colisionadores`);
    }
    object.userData.contentId = definition.id;
    objectsById.set(definition.id, object);
    collidersById.set(definition.id, objectColliders);
    colliders.push(...objectColliders);
    return object;
  };

  function addHabitat(definition) {
    const { x, z, scale = 1 } = definition;
    const root = new THREE.Group(); root.position.set(x, heightAt(x, z) + .06, z); root.scale.setScalar(scale); scene.add(root);
    // Main pressure cabin: curved white shell wrapped in gold insulation and external framing.
    const drum = cyl(2.6, 2.6, 6.2, gold, root, 0, 2.95, 0, 18); drum.rotation.z = Math.PI / 2;
    const end1 = cyl(2.65, 2.65, .18, metal, root, -3.18, 2.95, 0, 20); end1.rotation.z = Math.PI / 2;
    const end2 = cyl(2.65, 2.65, .18, pale, root, 3.18, 2.95, 0, 20); end2.rotation.z = Math.PI / 2;
    for (let u = -2.75; u <= 2.76; u += 1.38) {
      const hoop = new THREE.Mesh(new THREE.TorusGeometry(2.73, .075, 7, 20), metal);
      hoop.position.set(u, 2.95, 0); hoop.rotation.y = Math.PI / 2; root.add(hoop);
    }
    for (const zz of [-2.42, 2.42]) for (const xx of [-2.7, 2.7]) {
      rod([xx, .15, zz], [xx, 5.5, zz], .055, metal, root);
    }
    for (const yy of [.3, 5.5]) for (const zz of [-2.42, 2.42]) rod([-3.4, yy, zz], [3.4, yy, zz], .05, metal, root);
    for (const zz of [-2.42, 2.42]) for (const sign of [-1, 1]) rod([sign * 3.35, .3, zz], [0, 5.5, zz], .042, metal, root);
    box(7.2, .2, 5.8, dark, root, 0, .16, 0);
    for (const xx of [-2.4, 2.4]) for (const zz of [-1.8, 1.8]) box(.3, .65, .3, metal, root, xx, -.23, zz);
    // Airlock and illuminated status lamps face the visitor.
    const air = cyl(1.13, 1.13, .66, pale, root, 0, 2.75, 2.65, 16); air.rotation.x = Math.PI / 2;
    const hatch = cyl(.78, .78, .72, dark, root, 0, 2.75, 3.03, 16); hatch.rotation.x = Math.PI / 2;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.82, .07, 8, 24), white); ring.position.set(0, 2.75, 3.39); root.add(ring);
    box(.2, .2, .08, glow, root, -1, 2.5, 3.06);
    for (const xx of [-1.55, 1.55]) box(.32, .12, .08, blue, root, xx, 2.75, 2.75);
    // Small communications mast on each module.
    rod([2.45, 5.45, -.2], [2.45, 8.2, -.2], .045, metal, root);
    sphere(.12, glow, root, 2.45, 8.2, -.2, 10, 8);
    const groundY = heightAt(x, z);
    return register(definition, root, [
      boxCollider(x, z, 3.6 * scale, 2.95 * scale, groundY - .3, groundY + 5.7 * scale),
      boxCollider(x, z + 3.05 * scale, 1.12 * scale, .5 * scale, groundY + 1.4 * scale, groundY + 3.9 * scale),
    ]);
  }
  const habitats = content.habitats.map(addHabitat);

  function addDish(definition) {
    const { x, z, scale: size = 1 } = definition;
    const g = new THREE.Group(); g.position.set(x, heightAt(x, z), z); g.scale.setScalar(size); scene.add(g);
    box(1.2, .28, 1.2, metal, g, 0, .15, 0);
    rod([0, .25, 0], [0, 8.1, 0], .095, metal, g);
    for (const a of [0, 2.09, 4.18]) rod([0, 5.3, 0], [Math.cos(a) * 1.35, .3, Math.sin(a) * 1.35], .025, metal, g);
    const dish = new THREE.Group(); dish.position.set(0, 8.35, 0); dish.rotation.set(-.43, .4, -.2); g.add(dish);
    const geometry = new THREE.SphereGeometry(2.65, 32, 12, 0, Math.PI * 2, 0, .55);
    const bowl = new THREE.Mesh(geometry, mat(0x899396, { metalness: .6, roughness: .45, side: THREE.DoubleSide, wireframe: false }));
    bowl.scale.y = .55; bowl.rotation.x = Math.PI; bowl.castShadow = true; dish.add(bowl);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(2.65 * Math.sin(.55), .055, 7, 36), pale);
    rim.rotation.x = Math.PI / 2; rim.position.y = -.55 * 2.65 * Math.cos(.55); dish.add(rim);
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
      rod([0, -1.45, 0], [Math.cos(a) * 1.38, -.55 * 2.65 * Math.cos(.55), Math.sin(a) * 1.38], .018, pale, dish);
    }
    rod([0, -.3, 0], [0, 1.1, 0], .04, metal, dish);
    sphere(.13, glow, dish, 0, 1.1, 0, 10, 8);
    const groundY = heightAt(x, z);
    return register(definition, g, [
      circleCollider(x, z, 1.15 * size, groundY, groundY + 5.4 * size),
      circleCollider(x, z, 1.45 * size, groundY + 5.3 * size, groundY + 8.5 * size),
    ]);
  }
  const dishes = content.dishes.map(addDish);

  // Hoses sweep across the foreground, visually connecting all three modules.
  function addHose(definition) {
    const { points, radius = .17 } = definition;
    const hose = new THREE.Group(); scene.add(hose);
    lineTube(points.map(([x, z, lift = .14]) => [x, heightAt(x, z) + lift, z]), radius, pale, hose, 48);
    for (let i = 1; i < points.length - 1; i++) {
      const [x, z] = points[i]; cyl(radius * 1.3, radius * 1.3, .08, metal, hose, x, heightAt(x, z) + .13, z);
    }
    return register(definition, hose);
  }
  content.hoses.forEach(addHose);
  for (const definition of content.supplyCrates) {
    const { x, z } = definition;
    const crate = box(.45, .22, .34, materials[definition.material], scene, x, heightAt(x, z) + .11, z);
    register(definition, crate, [boxCollider(x, z, .24, .18, heightAt(x, z), heightAt(x, z) + .22)]);
  }

  function addRover(definition) {
    const { x, z, rotation = 0 } = definition;
    const root = new THREE.Group(); root.position.set(x, heightAt(x, z), z); root.rotation.order = 'YXZ'; root.rotation.y = rotation; scene.add(root);
    const wheels = [];
    box(4, .23, 2.05, metal, root, 0, 1.1, 0);
    box(1.3, .55, 1.55, pale, root, -1.05, 1.5, 0);
    box(.95, .5, 1.2, dark, root, .7, 1.56, 0);
    box(.18, .88, 1.1, metal, root, 1.25, 1.78, 0);
    box(.68, .2, 1.3, white, root, -1.25, 1.92, 0);
    for (const xx of [-1.55, 1.5]) for (const zz of [-1.25, 1.25]) {
      rod([xx, 1.08, zz * .63], [xx, .63, zz], .07, metal, root);
      const wheelAssembly = new THREE.Group(); wheelAssembly.position.set(xx, .56, zz); root.add(wheelAssembly);
      const wheel = cyl(.56, .56, .29, black, wheelAssembly, 0, 0, 0, 18);
      wheel.rotation.x = Math.PI / 2;
      const hub = cyl(.26, .26, .31, metal, wheelAssembly, 0, 0, Math.sign(zz) * .015, 14); hub.rotation.x = Math.PI / 2;
      wheels.push(wheelAssembly);
    }
    rod([-1.9, 1.25, 0], [-2.25, 2.28, 0], .055, metal, root);
    const dish = cyl(.7, .7, .04, gold, root, -2.25, 2.35, 0, 20); dish.rotation.x = -.18;
    rod([2, 1.15, 0], [2.35, 2.22, 0], .04, metal, root);
    sphere(.12, glow, root, 2.35, 2.22, 0, 10, 8);
    const groundY = heightAt(x, z);
    const collider = boxCollider(x, z, 2.45, 1.7, groundY, groundY + 2.3, root.rotation.y);
    root.userData.wheels = wheels;
    root.userData.collider = collider;
    return register(definition, root, [collider]);
  }
  const rovers = content.rovers.map(addRover);
  const rover = rovers[0];

  // Landing equipment and beacons establish the scale of the camp.
  for (const definition of content.beacons) {
    const { x, z } = definition;
    const y = heightAt(x, z);
    const beacon = new THREE.Group(); scene.add(beacon);
    box(.8, .55, .65, metal, beacon, x, y + .27, z);
    rod([x, y + .55, z], [x, y + 1.5, z], .035, metal, scene);
    sphere(.1, glow, scene, x, y + 1.5, z, 10, 8);
    register(definition, beacon, [boxCollider(x, z, .42, .36, y, y + 1.5)]);
  }
  for (const definition of content.surfaceMarkers) {
    const { x, z, rotation = 0 } = definition;
    const marker = box(.13, .04, .52, pale, scene, x, heightAt(x, z) + .05, z);
    marker.rotation.y = rotation;
    register(definition, marker);
  }

  return { habitats, dishes, rovers, rover, colliders, objectsById, collidersById };
}
