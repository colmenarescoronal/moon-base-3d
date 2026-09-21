import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { isCameraView, CAMERA_VIEW_NAMES } from '../src/camera/controller.js';
import { createUserInterface } from '../src/ui/interface.js';
import { ASTRONAUT_COLORS, createAstronautIdentity } from '../src/ui/astronaut-identity.js';

class FakeClassList {
  values = new Set();
  add(value) { this.values.add(value); }
  remove(value) { this.values.delete(value); }
  contains(value) { return this.values.has(value); }
  toggle(value, force) {
    if (force ?? !this.contains(value)) this.add(value);
    else this.remove(value);
  }
}

class FakeElement extends EventTarget {
  constructor(dataset = {}) {
    super();
    this.dataset = dataset;
    this.classList = new FakeClassList();
    this.attributes = new Map();
    this.textContent = '';
    this.focused = false;
    this.hidden = false;
    this.disabled = false;
    this.value = '';
    this.style = { values: new Map(), setProperty: (name, value) => this.style.values.set(name, value) };
  }
  focus() { this.focused = true; }
  setAttribute(name, value) { this.attributes.set(name, value); }
}

function createFixture() {
  const elements = {
    hero: new FakeElement(), toast: new FakeElement(), explore: new FakeElement(),
    soundButton: new FakeElement(), soundIcon: new FakeElement(), soundLabel: new FakeElement(),
    views: ['explore', 'overview', 'rover'].map(view => new FakeElement({ view })),
  };
  const root = {
    querySelector(selector) {
      return ({ '.hero-copy': elements.hero, '#toast': elements.toast, '#explore-button': elements.explore,
        '#sound-button': elements.soundButton, '#sound-icon': elements.soundIcon,
        '.sound-label': elements.soundLabel })[selector];
    },
    querySelectorAll: selector => selector === '[data-view]' ? elements.views : [],
  };
  return { elements, root };
}

test('camera view names reject unknown values', () => {
  assert.deepEqual(CAMERA_VIEW_NAMES, ['explore', 'overview', 'rover']);
  assert.equal(isCameraView('overview'), true);
  assert.equal(isCameraView('unknown'), false);
});

test('interface coordinates view buttons, keyboard, activity, and sound state', async () => {
  const { elements, root } = createFixture();
  const keyboard = new EventTarget();
  const selected = [];
  const cameraController = { setView: view => selected.push(view) };
  let soundEnabled = false;
  const ambientSound = { toggle: async () => (soundEnabled = !soundEnabled) };
  const ui = createUserInterface({ cameraController, canvas: elements.explore, root, keyboard, ambientSound });

  elements.views[1].dispatchEvent(new Event('click'));
  assert.equal(selected.at(-1), 'overview');
  assert.equal(elements.views[1].classList.contains('active'), true);
  assert.equal(elements.hero.classList.contains('collapsed'), true);

  const digit = new Event('keydown');
  Object.defineProperty(digit, 'code', { value: 'Digit1' });
  keyboard.dispatchEvent(digit);
  assert.equal(selected.at(-1), 'explore');
  assert.equal(elements.hero.classList.contains('collapsed'), false);

  ui.playerActive();
  assert.equal(elements.hero.classList.contains('collapsed'), true);
  elements.soundButton.dispatchEvent(new Event('click'));
  await Promise.resolve();
  assert.equal(elements.soundLabel.textContent, 'AMBIENTE ON');
  assert.equal(elements.soundButton.attributes.get('aria-label'), 'Desactivar sonido');
  ui.dispose();
});

test('astronaut identity normalizes the name, chooses a color, and follows the player', async () => {
  const screen = new FakeElement();
  const form = new FakeElement();
  const input = new FakeElement();
  const tag = new FakeElement();
  const root = { querySelector: selector => ({
    '#identity-screen': screen,
    '#identity-form': form,
    '#astronaut-name': input,
    '#astronaut-name-tag': tag,
  })[selector] };
  const astronaut = new THREE.Group();
  const camera = new THREE.PerspectiveCamera(55, 800 / 600, .1, 100);
  camera.position.set(0, 3, 10);
  camera.lookAt(0, 2, 0);
  camera.updateMatrixWorld();
  const identity = createAstronautIdentity({ astronaut, camera, root, random: () => 0,
    viewport: () => ({ width: 800, height: 600 }) });
  await Promise.resolve();

  input.value = '  Luna   Rivera  ';
  form.dispatchEvent(new Event('submit', { cancelable: true }));
  identity.update();

  assert.equal(identity.name, 'Luna Rivera');
  assert.equal(identity.color, ASTRONAUT_COLORS[0]);
  assert.equal(tag.textContent, 'Luna Rivera');
  assert.equal(tag.style.values.get('--name-color'), ASTRONAUT_COLORS[0]);
  assert.equal(tag.hidden, false);
  assert.match(tag.style.transform, /translate\(/);
  assert.equal(screen.classList.contains('closed'), true);
  assert.equal(input.disabled, true);
  identity.dispose();
});
