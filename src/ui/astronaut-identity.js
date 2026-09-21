import * as THREE from 'three';

export const ASTRONAUT_COLORS = Object.freeze([
  '#7ee7ff', '#ffcf70', '#9eff9e', '#ff8fd8', '#b9a5ff', '#ff9a76',
]);

const normalizeName = value => value.trim().replace(/\s+/g, ' ').slice(0, 18);

export function createAstronautIdentity({
  astronaut,
  camera,
  root = document,
  random = Math.random,
  viewport = () => ({ width: innerWidth, height: innerHeight }),
}) {
  const screen = root.querySelector('#identity-screen');
  const form = root.querySelector('#identity-form');
  const input = root.querySelector('#astronaut-name');
  const tag = root.querySelector('#astronaut-name-tag');
  const worldPosition = new THREE.Vector3();
  let name = '';
  let color = '';

  const onSubmit = event => {
    event.preventDefault();
    const nextName = normalizeName(input.value);
    if (!nextName) {
      input.focus();
      return;
    }
    name = nextName;
    color = ASTRONAUT_COLORS[Math.floor(random() * ASTRONAUT_COLORS.length) % ASTRONAUT_COLORS.length];
    tag.textContent = name;
    tag.style.setProperty('--name-color', color);
    tag.hidden = false;
    screen.classList.add('closed');
    screen.setAttribute('aria-hidden', 'true');
    input.disabled = true;
  };

  form.addEventListener('submit', onSubmit);
  queueMicrotask(() => input.focus());

  return {
    get name() { return name; },
    get color() { return color; },
    get ready() { return Boolean(name); },
    update() {
      if (!name) return;
      astronaut.getWorldPosition(worldPosition);
      worldPosition.y += 4.85;
      worldPosition.project(camera);
      const visible = worldPosition.z > -1 && worldPosition.z < 1 &&
        worldPosition.x > -1.15 && worldPosition.x < 1.15 &&
        worldPosition.y > -1.15 && worldPosition.y < 1.15;
      tag.hidden = !visible;
      if (!visible) return;
      const { width, height } = viewport();
      const x = (worldPosition.x * .5 + .5) * width;
      const y = (-worldPosition.y * .5 + .5) * height;
      tag.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
    },
    dispose() {
      form.removeEventListener('submit', onSubmit);
    },
  };
}
