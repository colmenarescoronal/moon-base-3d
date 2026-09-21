import * as THREE from 'three';
import { createMaterials } from './world/materials.js';
import { createAstronaut } from './player/astronaut.js';
import { createPlayerInput } from './player/input.js';
import { createPlayerController } from './player/controller.js';
import { createFootstepSound } from './player/footstep-sound.js';
import { createWorld } from './world/index.js';
import { createCameraController } from './camera/controller.js';
import { createUserInterface } from './ui/interface.js';
import { createAstronautIdentity } from './ui/astronaut-identity.js';
import './style.css';

const mount = document.querySelector('#scene');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070a11);
scene.fog = new THREE.FogExp2(0x161820, 0.0045);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.42;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
mount.appendChild(renderer.domElement);
const cameraController = createCameraController(renderer.domElement);
const { camera } = cameraController;

scene.add(new THREE.HemisphereLight(0xb5c7e5, 0x62584c, 1.8));
const sunlight = new THREE.DirectionalLight(0xffedd4, 3.8);
sunlight.position.set(-35, 60, 24);
sunlight.castShadow = true;
sunlight.shadow.mapSize.set(2048, 2048);
sunlight.shadow.camera.left = -75; sunlight.shadow.camera.right = 75;
sunlight.shadow.camera.top = 75; sunlight.shadow.camera.bottom = -75;
sunlight.shadow.normalBias = .035;
scene.add(sunlight);

const materials = createMaterials();
const world = createWorld(scene, materials);
const { earth } = world;
cameraController.track('rover', world.base.rover);
const astronaut = createAstronaut(scene, world.heightAt, materials);
const input = createPlayerInput(window);
const footstepSound = createFootstepSound();
const player = createPlayerController({ astronaut, camera, input, world, footstepSound });
const astronautIdentity = createAstronautIdentity({ astronaut, camera });

const ui = createUserInterface({ cameraController, canvas: renderer.domElement });

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), .05);
  earth.rotation.y += dt * .013;
  world.update(dt, astronaut.position);
  const { dx, dz, active } = player.update(dt);
  if (active) ui.playerActive();
  cameraController.follow(dx, dz);
  cameraController.update();
  astronautIdentity.update();
  renderer.render(scene, camera);
}
animate();

addEventListener('resize', () => {
  cameraController.resize(innerWidth, innerHeight);
  renderer.setSize(innerWidth, innerHeight); renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
});
