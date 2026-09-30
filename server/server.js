'use strict';

const http = require('node:http');
const { randomUUID } = require('node:crypto');
const { WebSocketServer, WebSocket } = require('ws');

const PORT = Number(process.env.PORT) || 10001;
const MAX_PLAYERS_PER_ROOM = 24;
const rooms = new Map();
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',').map(value => value.trim()).filter(Boolean);

const cleanText = (value, limit) => String(value || '')
  .replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, limit);
const roomCode = value => cleanText(value, 12).toUpperCase()
  .replace(/[^A-Z0-9_-]/g, '') || 'ECHO-01';
const clamp = (value, min, max, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
};
const playerColor = value => /^#[0-9a-f]{6}$/i.test(value) ? value : '#7ee7ff';

function getRoom(code) {
  if (!rooms.has(code)) rooms.set(code, { clients: new Set(), players: new Map() });
  return rooms.get(code);
}

function send(socket, message) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
}

function broadcast(room, message, except = null) {
  const encoded = JSON.stringify(message);
  room.clients.forEach(client => {
    if (client !== except && client.readyState === WebSocket.OPEN) client.send(encoded);
  });
}

function leave(socket) {
  const room = rooms.get(socket.room);
  const player = room?.players.get(socket.playerId);
  if (!room || !player) return;
  room.clients.delete(socket);
  room.players.delete(socket.playerId);
  broadcast(room, { type: 'presence', event: 'leave', id: player.id, name: player.name });
  if (!room.clients.size) rooms.delete(socket.room);
  socket.room = null;
  socket.playerId = null;
}

const server = http.createServer((request, response) => {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (request.url === '/' || request.url === '/health') {
    response.writeHead(200);
    response.end(JSON.stringify({
      ok: true,
      rooms: rooms.size,
      players: [...rooms.values()].reduce((sum, room) => sum + room.players.size, 0),
    }));
    return;
  }
  response.writeHead(404);
  response.end(JSON.stringify({ error: 'Not found' }));
});

const wss = new WebSocketServer({
  server,
  path: '/ws',
  verifyClient({ origin }, done) {
    const allowed = !allowedOrigins.length || !origin || allowedOrigins.includes(origin);
    done(allowed, allowed ? 200 : 403, allowed ? undefined : 'Origin not allowed');
  },
});

wss.on('connection', socket => {
  socket.isAlive = true;
  socket.playerId = null;
  socket.room = null;
  socket.rateWindow = Date.now();
  socket.messageCount = 0;
  socket.on('pong', () => { socket.isAlive = true; });

  socket.on('message', raw => {
    if (raw.length > 2048) return socket.close(1009, 'Message too large');
    const now = Date.now();
    if (now - socket.rateWindow >= 1000) {
      socket.rateWindow = now;
      socket.messageCount = 0;
    }
    if (++socket.messageCount > 45) return;

    let message;
    try { message = JSON.parse(raw.toString()); } catch { return; }

    if (message.type === 'join' && !socket.playerId) {
      const code = roomCode(message.room);
      const room = getRoom(code);
      if (room.clients.size >= MAX_PLAYERS_PER_ROOM) {
        send(socket, { type: 'error', message: 'La sala está llena.' });
        return socket.close(1008, 'Room full');
      }
      const id = randomUUID();
      const player = {
        id,
        name: cleanText(message.name, 18) || 'PILOTO',
        color: playerColor(message.color),
        x: 4.7 + (room.players.size % 6) * 1.7,
        y: 0,
        z: 7 + Math.floor(room.players.size / 6) * 1.7,
        rotationY: 0,
        speed: 0,
        grounded: true,
      };
      socket.playerId = id;
      socket.room = code;
      room.clients.add(socket);
      room.players.set(id, player);
      send(socket, { type: 'welcome', id, room: code, players: [...room.players.values()] });
      broadcast(room, { type: 'presence', event: 'join', id, name: player.name }, socket);
      return;
    }

    const room = rooms.get(socket.room);
    const player = room?.players.get(socket.playerId);
    if (!player) return;
    if (message.type === 'state') {
      player.x = clamp(message.x, -112, 112, player.x);
      player.y = clamp(message.y, -30, 100, player.y);
      player.z = clamp(message.z, -106, 106, player.z);
      player.rotationY = clamp(message.rotationY, -Math.PI * 4, Math.PI * 4, player.rotationY);
      player.speed = clamp(message.speed, 0, 14, 0);
      player.grounded = message.grounded !== false;
    }
  });

  socket.on('close', () => leave(socket));
  socket.on('error', () => leave(socket));
});

const snapshotTimer = setInterval(() => {
  rooms.forEach(room => broadcast(room, { type: 'snapshot', players: [...room.players.values()] }));
}, 1000 / 15);

const heartbeatTimer = setInterval(() => {
  wss.clients.forEach(socket => {
    if (!socket.isAlive) {
      leave(socket);
      socket.terminate();
      return;
    }
    socket.isAlive = false;
    socket.ping();
  });
}, 30000);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Moon Base 3D realtime server listening on http://0.0.0.0:${PORT}`);
});

function shutdown() {
  clearInterval(snapshotTimer);
  clearInterval(heartbeatTimer);
  wss.clients.forEach(socket => socket.close(1012, 'Server restarting'));
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
