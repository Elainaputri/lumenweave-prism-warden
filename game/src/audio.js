// audio.js — every sound is synthesised live with the Web Audio API:
// no audio files, no network. The context is created on the first user
// gesture (a click or keypress), as browsers require; M toggles mute.

function AudioEngine() {
  this.ctx = null;
  this.master = null;
  this.muted = false;
  this.droneNodes = null;
  this.beamOsc = null;
  this.beamGain = null;
  this.beamOn = false;
}

// Create (or resume) the context. Safe to call on every gesture.
AudioEngine.prototype.unlock = function () {
  if (!this.ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ctx.destination);
    this.startDrone();
  }
  if (this.ctx.state === 'suspended') this.ctx.resume();
};

AudioEngine.prototype.setMuted = function (m) {
  this.muted = m;
  if (this.master) this.master.gain.value = m ? 0 : 0.5;
};

// Quiet two-oscillator ambient drone under everything.
AudioEngine.prototype.startDrone = function () {
  const ctx = this.ctx;
  const g = ctx.createGain();
  g.gain.value = 0.045;
  const filt = ctx.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.value = 420;
  const o1 = ctx.createOscillator();
  o1.type = 'sine';
  o1.frequency.value = 55;
  const o2 = ctx.createOscillator();
  o2.type = 'triangle';
  o2.frequency.value = 82.5;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.07;
  const lfoG = ctx.createGain();
  lfoG.gain.value = 0.02;
  lfo.connect(lfoG);
  lfoG.connect(g.gain);
  o1.connect(filt);
  o2.connect(filt);
  filt.connect(g);
  g.connect(this.master);
  o1.start();
  o2.start();
  lfo.start();
  this.droneNodes = { o1, o2, lfo, g };
};

// One short pitched blip with an exponential decay envelope.
AudioEngine.prototype.blip = function (freq, dur, type, vol, slideTo) {
  if (!this.ctx || this.muted) return;
  const ctx = this.ctx;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type || 'sine';
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(vol || 0.2, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(this.master);
  o.start(t);
  o.stop(t + dur + 0.02);
};

// White-noise burst through a band-pass filter (shatter / whoosh / horn air).
AudioEngine.prototype.noiseBurst = function (dur, freq, vol, q) {
  if (!this.ctx || this.muted) return;
  const ctx = this.ctx;
  const t = ctx.currentTime;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filt = ctx.createBiquadFilter();
  filt.type = 'bandpass';
  filt.frequency.value = freq || 2400;
  filt.Q.value = q || 1;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol || 0.25, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filt);
  filt.connect(g);
  g.connect(this.master);
  src.start(t);
};

// Prism-bounce chime: pitch climbs the pentatonic ladder with the combo.
AudioEngine.prototype.chime = function (combo) {
  const scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
  const step = Math.min(scale.length - 1, Math.floor(combo / 2));
  this.blip(scale[step], 0.35, 'sine', 0.16);
  this.blip(scale[step] * 2, 0.22, 'triangle', 0.06);
};

AudioEngine.prototype.shoot = function () {
  this.blip(880, 0.09, 'square', 0.07, 440);
};

AudioEngine.prototype.hit = function () {
  this.blip(220, 0.07, 'triangle', 0.12, 140);
};

AudioEngine.prototype.shatter = function () {
  this.noiseBurst(0.4, 3200, 0.3, 0.8);
  this.blip(1567, 0.5, 'sine', 0.14, 784);
  this.blip(2093, 0.4, 'sine', 0.09, 1046);
};

AudioEngine.prototype.dash = function () {
  this.noiseBurst(0.25, 900, 0.22, 1.4);
  this.blip(180, 0.22, 'sawtooth', 0.08, 420);
};

AudioEngine.prototype.horn = function () {
  // Boss warning horn: low saw swell with a fifth above it.
  if (!this.ctx || this.muted) return;
  const ctx = this.ctx;
  const t = ctx.currentTime;
  [110, 164.8].forEach(function (f) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.16, t + 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + 1.5);
  });
};

AudioEngine.prototype.coreHit = function () {
  this.blip(98, 0.4, 'sawtooth', 0.2, 55);
  this.noiseBurst(0.3, 500, 0.2, 1);
};

AudioEngine.prototype.convergence = function () {
  // Rising four-note chime as the prisms link into the solar web.
  const self = this;
  [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) {
    setTimeout(function () {
      self.blip(f, 0.5, 'sine', 0.14);
    }, i * 90);
  });
};

// Continuous laser hum while the Prism Beam is channelled.
AudioEngine.prototype.beamStart = function () {
  if (!this.ctx || this.muted || this.beamOn) return;
  const ctx = this.ctx;
  this.beamOsc = ctx.createOscillator();
  this.beamOsc.type = 'sawtooth';
  this.beamOsc.frequency.value = 96;
  this.beamGain = ctx.createGain();
  this.beamGain.gain.value = 0.0;
  this.beamGain.gain.linearRampToValueAtTime(0.07, ctx.currentTime + 0.1);
  const filt = ctx.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.value = 900;
  this.beamOsc.connect(filt);
  filt.connect(this.beamGain);
  this.beamGain.connect(this.master);
  this.beamOsc.start();
  this.beamOn = true;
};

AudioEngine.prototype.beamStop = function () {
  if (!this.beamOn || !this.beamOsc) return;
  const osc = this.beamOsc;
  const g = this.beamGain;
  g.gain.linearRampToValueAtTime(0.0, this.ctx.currentTime + 0.08);
  setTimeout(function () {
    try {
      osc.stop();
    } catch (e) {
      /* already stopped */
    }
  }, 120);
  this.beamOsc = null;
  this.beamGain = null;
  this.beamOn = false;
};
