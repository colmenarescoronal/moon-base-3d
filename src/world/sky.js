import * as THREE from 'three';
import { sphere } from './geometry.js';

export function createSky(scene, rand) {
  // Star field and a hand-painted Earth that remains distant as the camera moves.
  const starGeo = new THREE.BufferGeometry(), starVertices = [];
  for (let i = 0; i < 900; i++) {
    const theta = rand() * Math.PI * 2, phi = rand() * Math.PI * .62;
    const r = 340;
    starVertices.push(Math.sin(theta) * Math.cos(phi) * r, Math.sin(phi) * r + 18, Math.cos(theta) * Math.cos(phi) * r);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xdfe9fc, size: 1.1, sizeAttenuation: false, transparent: true, opacity: .85 })));

  const earthCanvas = document.createElement('canvas'); earthCanvas.width = 512; earthCanvas.height = 256;
  const ec = earthCanvas.getContext('2d');
  ec.fillStyle = '#245b9d'; ec.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 37; i++) {
    const x = rand() * 512, y = 35 + rand() * 190, rx = 6 + rand() * 44, ry = 5 + rand() * 24;
    ec.fillStyle = i % 3 === 0 ? '#b79e6b' : i % 3 === 1 ? '#659068' : '#587e62';
    ec.beginPath(); ec.ellipse(x, y, rx, ry, rand() * 3, 0, Math.PI * 2); ec.fill();
  }
  for (let i = 0; i < 70; i++) {
    ec.fillStyle = `rgba(244,249,251,${.08 + rand() * .22})`;
    ec.beginPath(); ec.ellipse(rand() * 512, rand() * 256, 4 + rand() * 24, 2 + rand() * 8, rand() * 4, 0, Math.PI * 2); ec.fill();
  }
  const earthTexture = new THREE.CanvasTexture(earthCanvas); earthTexture.colorSpace = THREE.SRGBColorSpace;
  const earth = sphere(4.7, new THREE.MeshStandardMaterial({ map: earthTexture, emissive: 0x203451, emissiveIntensity: .28, roughness: 1 }), scene, 25, 18, -73, 48, 32);
  earth.castShadow = false;
  sphere(4.95, new THREE.MeshBasicMaterial({ color: 0x688cc3, transparent: true, opacity: .11, side: THREE.BackSide }), scene, 25, 18, -73, 32, 24).castShadow = false;

  return earth;
}
