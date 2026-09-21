import * as THREE from 'three';

export const box = (w, h, d, material, parent, x = 0, y = 0, z = 0) => {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; parent.add(o); return o;
};
export const sphere = (r, material, parent, x = 0, y = 0, z = 0, sw = 16, sh = 12) => {
  const o = new THREE.Mesh(new THREE.SphereGeometry(r, sw, sh), material);
  o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; parent.add(o); return o;
};
export const cyl = (rt, rb, h, material, parent, x = 0, y = 0, z = 0, n = 16) => {
  const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, n), material);
  o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; parent.add(o); return o;
};
export const lineTube = (points, radius, material, parent, segments = 28) => {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  const o = new THREE.Mesh(new THREE.TubeGeometry(curve, segments, radius, 7, false), material);
  o.castShadow = true; o.receiveShadow = true; parent.add(o); return o;
};
export const rod = (a, b, radius, material, parent) => {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
  const o = cyl(radius, radius, start.distanceTo(end), material, parent);
  o.position.copy(start).add(end).multiplyScalar(.5);
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize());
  return o;
};

