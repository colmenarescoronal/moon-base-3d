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
  const networkStatus = root.querySelector('#network-status');
  const networkLabel = root.querySelector('#network-label');
  const playerCount = root.querySelector('#player-count');
  const chatPanel = root.querySelector('#chat-panel');
  const chatRoom = root.querySelector('#chat-room');
  const chatLog = root.querySelector('#chat-log');
  const chatForm = root.querySelector('#chat-form');
  const chatInput = root.querySelector('#chat-input');
  let toastTimer;
  let chatSender = () => false;

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
    const editable = event.target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target?.tagName);
    if (event.code === 'Enter' && !editable && chatInput) {
      event.preventDefault();
      chatInput.focus();
      return;
    }
    if (event.code === 'Escape' && event.target === chatInput) {
      chatInput.blur();
      return;
    }
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
  const onChatSubmit = event => {
    event.preventDefault();
    const message = chatInput?.value.trim();
    if (!message) return;
    if (chatSender(message)) chatInput.value = '';
    else showToast('CHAT NO DISPONIBLE · RECONECTANDO');
    chatInput?.focus();
  };

  viewButtons.forEach(button => button.addEventListener('click', onViewClick));
  exploreButton.addEventListener('click', onExplore);
  soundButton.addEventListener('click', onSound);
  keyboard.addEventListener('keydown', onKeyDown);
  chatForm?.addEventListener('submit', onChatSubmit);

  return {
    setView,
    setNetworkStatus({ state, label, players = 1, notice }) {
      networkStatus?.setAttribute('data-state', state);
      if (networkLabel) networkLabel.textContent = label;
      if (playerCount) playerCount.textContent = `${players} ${players === 1 ? 'PILOTO' : 'PILOTOS'}`;
      if (chatRoom && label.startsWith('SALA ')) chatRoom.textContent = label.slice(5);
      chatPanel?.classList.toggle('disabled', state !== 'online');
      if (notice) showToast(notice.toUpperCase());
    },
    setChatSender(sender) {
      chatSender = sender;
    },
    addChatMessage({ name, message, color = '#7ee7ff', system = false }) {
      if (!chatLog) return;
      const row = document.createElement('p');
      row.className = `chat-message${system ? ' system' : ''}`;
      if (system) row.textContent = message;
      else {
        row.style.setProperty('--chat-color', color);
        const author = document.createElement('b');
        author.textContent = `${name}: `;
        row.append(author, document.createTextNode(message));
      }
      chatLog.append(row);
      while (chatLog.children.length > 30) chatLog.firstElementChild.remove();
      chatLog.scrollTop = chatLog.scrollHeight;
    },
    playerActive() {
      hero.classList.add('collapsed');
    },
    dispose() {
      clearTimeout(toastTimer);
      viewButtons.forEach(button => button.removeEventListener('click', onViewClick));
      exploreButton.removeEventListener('click', onExplore);
      soundButton.removeEventListener('click', onSound);
      keyboard.removeEventListener('keydown', onKeyDown);
      chatForm?.removeEventListener('submit', onChatSubmit);
    },
  };
}
