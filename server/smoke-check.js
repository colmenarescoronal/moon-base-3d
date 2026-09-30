'use strict';

const assert = require('node:assert/strict');
const WebSocket = require('ws');

const url = process.env.TEST_WS_URL || 'ws://127.0.0.1:10001/ws';
const clients = [new WebSocket(url), new WebSocket(url)];
const ids = new Set();
let snapshotReceived = false;
let chatSent = false;
const chatReceivers = new Set();
let finished = false;

function finish(error) {
  if (finished) return;
  finished = true;
  clients.forEach(client => client.close());
  if (error) {
    console.error(error);
    process.exitCode = 1;
  } else console.log('OK: dos astronautas compartieron estado y chat en la misma sala.');
}

clients.forEach((client, index) => {
  client.on('open', () => client.send(JSON.stringify({
    type: 'join', room: 'PRUEBA-3D', name: `LUNA-${index + 1}`, color: '#7ee7ff',
  })));
  client.on('message', raw => {
    const message = JSON.parse(raw.toString());
    if (message.type === 'welcome') {
      ids.add(message.id);
      client.send(JSON.stringify({ type: 'state', x: index * 3, y: 1, z: 7, rotationY: .5, speed: 5 }));
    }
    if (message.type === 'snapshot' && message.players.length === 2) {
      snapshotReceived = true;
      if (index === 0 && !chatSent) {
        chatSent = true;
        client.send(JSON.stringify({ type: 'chat', message: 'Hola desde la Luna' }));
      }
    }
    if (message.type === 'chat' && message.message === 'Hola desde la Luna') chatReceivers.add(index);
    if (ids.size === 2 && snapshotReceived && chatReceivers.size === 2) finish();
  });
  client.on('error', finish);
});

setTimeout(() => {
  try {
    assert.equal(ids.size, 2);
    assert.equal(snapshotReceived, true);
    assert.equal(chatReceivers.size, 2);
    finish();
  } catch (error) { finish(error); }
}, 3000);
