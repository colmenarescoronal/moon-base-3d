const WALK_STEP_DISTANCE = 1.25;
const RUN_STEP_DISTANCE = 1.65;

export function createFootstepSound(
  audioContextClass = window.AudioContext || window.webkitAudioContext,
  eventTarget = window,
) {
  let context;
  let masterVolume;
  let noiseBuffer;
  let distanceSinceStep = .55;
  let foot = 0;

  const initialize = () => {
    if (context || !audioContextClass) return;
    context = new audioContextClass();
    masterVolume = context.createGain();
    masterVolume.gain.value = .62;
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -15;
    limiter.knee.value = 10;
    limiter.ratio.value = 5;
    limiter.attack.value = .004;
    limiter.release.value = .12;
    masterVolume.connect(limiter).connect(context.destination);

    noiseBuffer = context.createBuffer(1, Math.ceil(context.sampleRate * .13), context.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const envelope = 1 - i / data.length;
      data[i] = (Math.random() * 2 - 1) * envelope;
    }
  };

  const unlock = async () => {
    initialize();
    if (context?.state === 'suspended') await context.resume();
  };
  eventTarget.addEventListener('keydown', unlock);
  eventTarget.addEventListener('pointerdown', unlock);

  const playStep = (running, speed) => {
    if (!context || context.state !== 'running') return;
    const now = context.currentTime;
    const strength = running ? 1 : .76;
    const variation = foot ? 1.06 : .94;
    foot = 1 - foot;

    const crunch = context.createBufferSource();
    crunch.buffer = noiseBuffer;
    crunch.playbackRate.value = variation * (running ? 1.12 : .92);
    const crunchFilter = context.createBiquadFilter();
    crunchFilter.type = 'bandpass';
    crunchFilter.frequency.value = (running ? 520 : 410) * variation;
    crunchFilter.Q.value = .75;
    const crunchVolume = context.createGain();
    crunchVolume.gain.setValueAtTime(.0001, now);
    crunchVolume.gain.exponentialRampToValueAtTime(.22 * strength, now + .008);
    crunchVolume.gain.exponentialRampToValueAtTime(.0001, now + (running ? .105 : .13));
    crunch.connect(crunchFilter).connect(crunchVolume).connect(masterVolume);
    crunch.start(now);
    crunch.stop(now + .14);

    const thump = context.createOscillator();
    thump.type = 'triangle';
    thump.frequency.setValueAtTime((running ? 105 : 88) * variation, now);
    thump.frequency.exponentialRampToValueAtTime(48, now + .085);
    const thumpVolume = context.createGain();
    thumpVolume.gain.setValueAtTime(.0001, now);
    thumpVolume.gain.exponentialRampToValueAtTime((.1 + Math.min(speed, 9) * .009) * strength, now + .006);
    thumpVolume.gain.exponentialRampToValueAtTime(.0001, now + .1);
    thump.connect(thumpVolume).connect(masterVolume);
    thump.start(now);
    thump.stop(now + .11);
  };

  return {
    update({ distance, grounded, running, speed }) {
      if (!context || context.state !== 'running' || !grounded || speed < .15 || distance <= 0) return;
      distanceSinceStep += distance;
      const stride = running ? RUN_STEP_DISTANCE : WALK_STEP_DISTANCE;
      if (distanceSinceStep >= stride) {
        distanceSinceStep %= stride;
        playStep(running, speed);
      }
    },
    dispose() {
      eventTarget.removeEventListener('keydown', unlock);
      eventTarget.removeEventListener('pointerdown', unlock);
      context?.close();
    },
  };
}
