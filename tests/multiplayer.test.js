import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_MULTIPLAYER_URL, normalizeChatMessage, normalizeRoomCode, reconnectDelay } from '../src/network/multiplayer.js';

test('room codes are normalized and limited before joining', () => {
  assert.equal(normalizeRoomCode('  luna amigos!! '), 'LUNAAMIGOS');
  assert.equal(normalizeRoomCode(''), 'ECHO-01');
  assert.equal(normalizeRoomCode('abcdefghijklmnop'), 'ABCDEFGHIJKL');
});

test('reconnection uses bounded exponential backoff', () => {
  assert.equal(reconnectDelay(0), 1000);
  assert.equal(reconnectDelay(3), 8000);
  assert.equal(reconnectDelay(20), 15000);
});

test('manual production builds retain the public multiplayer endpoint', () => {
  assert.equal(DEFAULT_MULTIPLAYER_URL, 'wss://moon-base-3d-realtime.onrender.com/ws');
});

test('chat messages are normalized and capped before transmission', () => {
  assert.equal(normalizeChatMessage('  hola    luna  '), 'hola luna');
  assert.equal(normalizeChatMessage('x'.repeat(140)).length, 120);
  assert.equal(normalizeChatMessage('   '), '');
});
