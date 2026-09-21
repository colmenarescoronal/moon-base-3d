import { isCameraView } from '../camera/controller.js';
import { createAmbientSound } from './ambient-sound.js';

const viewMessages = {
  explore: 'MODO EXPLORACIÓN ACTIVADO',
  overview: 'VISTA GENERAL ACTIVADA',
  rover: 'EXPLORANDO EL ROVER',
};

export function createUserInterface({
  cameraController,
  canvas,
  root = document,
  keyboard = window,
  ambientSound = createAmbientSound(),
}) {
  const hero = root.querySelector('.hero-copy');
  const toastElement = root.querySelector('#toast');
  const exploreButton = root.querySelector('#explore-button');
  const soundButton = root.querySelector('#sound-button');
  const soundIcon = root.querySelector('#sound-icon');
  const soundLabel = root.querySelector('.sound-label');
  const viewButtons = [...root.querySelectorAll('[data-view]')];
  let toastTimer;

  const showToast = message => {
    toastElement.textContent = message;
    toastElement.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastElement.classList.remove('visible'), 2700);
  };
  const setView = next => {
    if (!isCameraView(next)) return;
    cameraController.setView(next);
    viewButtons.forEach(button => button.classList.toggle('active', button.dataset.view === next));
    hero.classList.toggle('collapsed', next !== 'explore');
    showToast(viewMessages[next]);
  };
  const onViewClick = event => setView(event.currentTarget.dataset.view);
  const onExplore = () => {
    hero.classList.add('collapsed');
    showToast('USA W A S D PARA RECORRER LA SUPERFICIE');
    canvas.focus();
  };
  const onKeyDown = event => {
    if (event.code === 'Digit1') setView('explore');
    if (event.code === 'Digit2') setView('overview');
    if (event.code === 'Digit3') setView('rover');
  };
  const onSound = async () => {
    const enabled = await ambientSound.toggle();
    soundLabel.textContent = enabled ? 'AMBIENTE ON' : 'AMBIENTE OFF';
    soundIcon.textContent = enabled ? '◖))' : '◌';
    soundButton.setAttribute('aria-label', enabled ? 'Desactivar sonido' : 'Activar sonido');
    soundButton.title = enabled ? 'Desactivar sonido' : 'Activar sonido';
  };

  viewButtons.forEach(button => button.addEventListener('click', onViewClick));
  exploreButton.addEventListener('click', onExplore);
  soundButton.addEventListener('click', onSound);
  keyboard.addEventListener('keydown', onKeyDown);

  return {
    setView,
    playerActive() {
      hero.classList.add('collapsed');
    },
    dispose() {
      clearTimeout(toastTimer);
      viewButtons.forEach(button => button.removeEventListener('click', onViewClick));
      exploreButton.removeEventListener('click', onExplore);
      soundButton.removeEventListener('click', onSound);
      keyboard.removeEventListener('keydown', onKeyDown);
    },
  };
}
