import { createRemotePlayer } from './remote-player.js';

export const DEFAULT_MULTIPLAYER_URL = 'wss://moon-base-3d-realtime.onrender.com/ws';

export const normalizeRoomCode = value => String(value || '')
  .trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 12) || 'ECHO-01';

export const reconnectDelay = attempt => Math.min(1000 * 2 ** Math.max(0, attempt), 15000);
export const normalizeChatMessage = value => String(value || '').trim().replace(/\s+/g, ' ').slice(0, 120);

export function createMultiplayer({
  scene,
  astronaut,
  heightAt,
  identity,
  onStatus = () => {},
  onChat = () => {},
  socketFactory = url => new WebSocket(url),
  serverUrl = (location.hostname === '127.0.0.1' || location.hostname === 'localhost')
    ? `ws://${location.hostname}:10001/ws`
    : (import.meta.env.VITE_MULTIPLAYER_URL || DEFAULT_MULTIPLAYER_URL),
  schedule = setTimeout,
  cancelSchedule = clearTimeout,
}) {
  const remotes = new Map();
  let socket = null;
  let playerId = null;
  let credentials = null;
  let reconnectTimer = null;
  let reconnectAttempt = 0;
  let sendAccumulator = 0;
  let lastX = astronaut.position.x;
  let lastZ = astronaut.position.z;
  let disposed = false;

  const report = (state, label) => onStatus({ state, label, players: remotes.size + 1 });
  const send = payload => {
    if (socket?.readyState === 1) socket.send(JSON.stringify(payload));
  };
  const clearRemotes = () => {
    remotes.forEach(remote => remote.dispose());
    remotes.clear();
  };
  const applySnapshot = players => {
    const seen = new Set();
    for (const state of players) {
      if (!state?.id || state.id === playerId) continue;
      seen.add(state.id);
      let remote = remotes.get(state.id);
      if (!remote) {
        remote = createRemotePlayer(scene, state, heightAt);
        remotes.set(state.id, remote);
      } else remote.setTarget(state);
    }
    for (const [id, remote] of remotes) {
      if (!seen.has(id)) {
        remote.dispose();
        remotes.delete(id);
      }
    }
    report('online', `SALA ${credentials.room}`);
  };
  const retry = () => {
    if (disposed || !credentials || !serverUrl) return;
    cancelSchedule(reconnectTimer);
    reconnectTimer = schedule(connect, reconnectDelay(reconnectAttempt++));
  };
  const connect = () => {
    if (disposed || !credentials) return;
    if (!serverUrl) {
      report('offline', 'SERVIDOR SIN CONFIGURAR');
      return;
    }
    report('connecting', 'CONECTANDO');
    const current = socketFactory(serverUrl);
    socket = current;
    current.addEventListener('open', () => {
      if (socket !== current) return;
      reconnectAttempt = 0;
      send({ type: 'join', ...credentials });
    });
    current.addEventListener('message', event => {
      if (socket !== current) return;
      let message;
      try { message = JSON.parse(event.data); } catch { return; }
      if (message.type === 'welcome') {
        playerId = message.id;
        applySnapshot(message.players || []);
        onChat({ system: true, message: `Conectado a ${credentials.room}` });
      } else if (message.type === 'snapshot') {
        applySnapshot(message.players || []);
      } else if (message.type === 'presence') {
        const notice = message.event === 'join' ? `${message.name} llegó a la base` : `${message.name} salió de la base`;
        onStatus({ state: 'online', label: `SALA ${credentials.room}`, players: remotes.size + 1, notice });
        onChat({ system: true, message: notice });
      } else if (message.type === 'chat') {
        onChat({ name: message.name, color: message.color, message: message.message, own: message.id === playerId });
      } else if (message.type === 'error') {
        onStatus({ state: 'offline', label: 'ERROR DE SALA', players: 1, notice: message.message });
      }
    });
    current.addEventListener('close', () => {
      if (socket !== current || disposed) return;
      playerId = null;
      clearRemotes();
      report('offline', 'RECONECTANDO');
      retry();
    });
    current.addEventListener('error', () => {
      if (socket === current) current.close();
    });
  };

  const unsubscribe = identity.onReady(({ name, color, room }) => {
    credentials = { name, color, room: normalizeRoomCode(room) };
    connect();
  });

  report(serverUrl ? 'connecting' : 'offline', serverUrl ? 'ESPERANDO PILOTO' : 'SERVIDOR SIN CONFIGURAR');

  return {
    sendChat(value) {
      const message = normalizeChatMessage(value);
      if (!message || !playerId || socket?.readyState !== 1) return false;
      send({ type: 'chat', message });
      return true;
    },
    update(dt, movement = {}) {
      remotes.forEach(remote => remote.update(dt));
      if (!playerId || socket?.readyState !== 1) return;
      sendAccumulator += dt;
      if (sendAccumulator < 1 / 15) return;
      const distance = Math.hypot(astronaut.position.x - lastX, astronaut.position.z - lastZ);
      const speed = distance / sendAccumulator;
      lastX = astronaut.position.x;
      lastZ = astronaut.position.z;
      sendAccumulator = 0;
      send({
        type: 'state',
        x: astronaut.position.x,
        y: astronaut.position.y,
        z: astronaut.position.z,
        rotationY: astronaut.rotation.y,
        speed,
        grounded: movement.grounded !== false,
      });
    },
    dispose() {
      disposed = true;
      unsubscribe();
      cancelSchedule(reconnectTimer);
      clearRemotes();
      socket?.close();
      socket = null;
    },
  };
}
