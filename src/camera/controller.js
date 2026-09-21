import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const viewDefinitions = {
  explore: { position: [17, 10, 25], target: [0, 2.4, -7] },
  overview: { position: [4, 23, 36], target: [0, 1, -12] },
  rover: { position: [26, 6.5, 13], target: [14, 2, -4] },
};

export const CAMERA_VIEW_NAMES = Object.freeze(Object.keys(viewDefinitions));

export function isCameraView(value) {
  return Object.hasOwn(viewDefinitions, value);
}

export function createCameraController(canvas, width = innerWidth, height = innerHeight) {
  const camera = new THREE.PerspectiveCamera(55, width / height, .1, 750);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = .06;
  controls.minDistance = 4;
  controls.maxDistance = 65;
  controls.maxPolarAngle = Math.PI * .48;
  controls.enablePan = false;
  let activeView = 'explore';
  const trackedViews = new Map();

  const applyTrackedOffset = viewName => {
    const tracked = trackedViews.get(viewName);
    if (!tracked) return;
    const dx = tracked.object.position.x - tracked.anchorX;
    const dz = tracked.object.position.z - tracked.anchorZ;
    camera.position.x += dx;
    camera.position.z += dz;
    controls.target.x += dx;
    controls.target.z += dz;
    tracked.lastX = tracked.object.position.x;
    tracked.lastZ = tracked.object.position.z;
  };

  const setView = next => {
    if (!isCameraView(next)) throw new Error(`Vista de cámara desconocida: ${next}`);
    activeView = next;
    const view = viewDefinitions[next];
    camera.position.fromArray(view.position);
    controls.target.fromArray(view.target);
    applyTrackedOffset(next);
    controls.update();
  };

  setView(activeView);
  return {
    camera,
    get activeView() { return activeView; },
    setView,
    track(viewName, object) {
      if (!isCameraView(viewName)) throw new Error(`Vista de cámara desconocida: ${viewName}`);
      trackedViews.set(viewName, {
        object,
        anchorX: object.position.x,
        anchorZ: object.position.z,
        lastX: object.position.x,
        lastZ: object.position.z,
      });
    },
    follow(dx, dz) {
      if (trackedViews.has(activeView)) return;
      camera.position.x += dx;
      camera.position.z += dz;
      controls.target.x += dx;
      controls.target.z += dz;
    },
    update() {
      const tracked = trackedViews.get(activeView);
      if (tracked) {
        const dx = tracked.object.position.x - tracked.lastX;
        const dz = tracked.object.position.z - tracked.lastZ;
        camera.position.x += dx;
        camera.position.z += dz;
        controls.target.x += dx;
        controls.target.z += dz;
        tracked.lastX = tracked.object.position.x;
        tracked.lastZ = tracked.object.position.z;
      }
      controls.update();
    },
    resize(nextWidth, nextHeight) {
      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
    },
    dispose() {
      controls.dispose();
    },
  };
}
