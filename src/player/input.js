const movementKeys = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'ShiftLeft', 'ShiftRight',
]);

export function createPlayerInput(target = window) {
  const pressed = new Set();
  let jumpQueued = false;

  const onKeyDown = event => {
    const element = event.target;
    if (element?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(element?.tagName)) return;
    if (movementKeys.has(event.code)) {
      pressed.add(event.code);
      event.preventDefault();
    } else if (event.code === 'Space') {
      if (!pressed.has('Space')) jumpQueued = true;
      pressed.add('Space');
      event.preventDefault();
    }
  };
  const onKeyUp = event => pressed.delete(event.code);
  const onBlur = () => {
    pressed.clear();
    jumpQueued = false;
  };

  target.addEventListener('keydown', onKeyDown);
  target.addEventListener('keyup', onKeyUp);
  target.addEventListener('blur', onBlur);

  return {
    sample() {
      const x = Number(pressed.has('KeyD') || pressed.has('ArrowRight')) -
        Number(pressed.has('KeyA') || pressed.has('ArrowLeft'));
      const z = Number(pressed.has('KeyS') || pressed.has('ArrowDown')) -
        Number(pressed.has('KeyW') || pressed.has('ArrowUp'));
      const jump = jumpQueued;
      jumpQueued = false;
      return { x, z, run: pressed.has('ShiftLeft') || pressed.has('ShiftRight'), jump };
    },
    dispose() {
      target.removeEventListener('keydown', onKeyDown);
      target.removeEventListener('keyup', onKeyUp);
      target.removeEventListener('blur', onBlur);
      onBlur();
    },
  };
}
