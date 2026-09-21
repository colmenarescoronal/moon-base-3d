export function createAmbientSound(audioContextClass = window.AudioContext || window.webkitAudioContext) {
  let context;
  let masterVolume;
  let enabled = false;

  const initialize = () => {
    if (context) return;
    context = new audioContextClass();

    masterVolume = context.createGain();
    masterVolume.gain.value = 0;
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -18;
    limiter.knee.value = 12;
    limiter.ratio.value = 5;
    limiter.attack.value = .01;
    limiter.release.value = .3;
    masterVolume.connect(limiter).connect(context.destination);

    // Ruido marrón: textura de ventilación y sistemas internos del traje.
    const noise = context.createBufferSource();
    const buffer = context.createBuffer(1, context.sampleRate * 4, context.sampleRate);
    const data = buffer.getChannelData(0);
    let previous = 0;
    for (let i = 0; i < data.length; i++) {
      previous = previous * .985 + (Math.random() * 2 - 1) * .015;
      data[i] = previous * 3.2;
    }
    noise.buffer = buffer;
    noise.loop = true;
    const highpass = context.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 45;
    const lowpass = context.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 950;
    const noiseVolume = context.createGain();
    noiseVolume.gain.value = .42;
    noise.connect(highpass).connect(lowpass).connect(noiseVolume).connect(masterVolume);

    // Tonos audibles incluso en altavoces pequeños, como vibración transmitida por el traje.
    const rumble = context.createOscillator();
    rumble.type = 'triangle';
    rumble.frequency.value = 82;
    const rumbleVolume = context.createGain();
    rumbleVolume.gain.value = .055;
    rumble.connect(rumbleVolume).connect(masterVolume);

    const systemsHum = context.createOscillator();
    systemsHum.type = 'sine';
    systemsHum.frequency.value = 147;
    const humVolume = context.createGain();
    humVolume.gain.value = .022;
    systemsHum.connect(humVolume).connect(masterVolume);

    const pulse = context.createOscillator();
    pulse.type = 'sine';
    pulse.frequency.value = .08;
    const pulseDepth = context.createGain();
    pulseDepth.gain.value = .012;
    pulse.connect(pulseDepth).connect(rumbleVolume.gain);

    noise.start();
    rumble.start();
    systemsHum.start();
    pulse.start();
  };

  return {
    get enabled() { return enabled; },
    async toggle() {
      initialize();
      if (context.state === 'suspended') await context.resume();
      enabled = !enabled;
      masterVolume.gain.setTargetAtTime(enabled ? .34 : 0, context.currentTime, .12);
      return enabled;
    },
  };
}
