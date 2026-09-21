import test from 'node:test';
import assert from 'node:assert/strict';
import { createFootstepSound } from '../src/player/footstep-sound.js';

class FakeParam {
  value = 0;
  setValueAtTime(value) { this.value = value; }
  exponentialRampToValueAtTime(value) { this.value = value; }
}

class FakeNode {
  connect(node) { return node; }
}

class FakeAudioContext {
  static latest;
  constructor() {
    FakeAudioContext.latest = this;
    this.sampleRate = 1000;
    this.currentTime = 0;
    this.state = 'suspended';
    this.destination = new FakeNode();
    this.noiseStarts = 0;
    this.oscillatorStarts = 0;
  }
  createGain() { return Object.assign(new FakeNode(), { gain: new FakeParam() }); }
  createDynamicsCompressor() {
    return Object.assign(new FakeNode(), {
      threshold: new FakeParam(), knee: new FakeParam(), ratio: new FakeParam(),
      attack: new FakeParam(), release: new FakeParam(),
    });
  }
  createBuffer(channels, length) {
    const data = new Float32Array(length);
    return { getChannelData: () => data };
  }
  createBufferSource() {
    const context = this;
    return Object.assign(new FakeNode(), {
      playbackRate: new FakeParam(),
      start() { context.noiseStarts++; },
      stop() {},
    });
  }
  createBiquadFilter() {
    return Object.assign(new FakeNode(), { frequency: new FakeParam(), Q: new FakeParam() });
  }
  createOscillator() {
    const context = this;
    return Object.assign(new FakeNode(), {
      frequency: new FakeParam(),
      start() { context.oscillatorStarts++; },
      stop() {},
    });
  }
  async resume() { this.state = 'running'; }
  close() { this.state = 'closed'; }
}

test('footsteps unlock on interaction and sound only during grounded travel', async () => {
  const target = new EventTarget();
  const footsteps = createFootstepSound(FakeAudioContext, target);
  footsteps.update({ distance: 2, grounded: true, running: false, speed: 5 });
  assert.equal(FakeAudioContext.latest, undefined);

  target.dispatchEvent(new Event('keydown'));
  await Promise.resolve();
  const context = FakeAudioContext.latest;
  footsteps.update({ distance: .8, grounded: true, running: false, speed: 5 });
  assert.equal(context.noiseStarts, 1);
  assert.equal(context.oscillatorStarts, 1);

  footsteps.update({ distance: 3, grounded: false, running: true, speed: 9 });
  assert.equal(context.noiseStarts, 1);
  footsteps.update({ distance: 1.7, grounded: true, running: true, speed: 9 });
  assert.equal(context.noiseStarts, 2);

  footsteps.dispose();
  assert.equal(context.state, 'closed');
});
