// Every sound is made here from noise and tones, after the real parts: key switches, a rocker, a dot-matrix head,
// paper, and a tape motor behind glass.
// Always on. iPhone Safari starts audio only from a finger LIFT (touchend / pointerup), a click or a key, never from a finger
// going down, so the context is unlocked on those events; after that, sounds on finger-down play at once.
let ctx: AudioContext = null,
  master: GainNode = null,
  noiseBuf: AudioBuffer = null,
  pinBuf: AudioBuffer = null,
  unlocked = false;
function audio() {
  // before the first tap, click or key the browser would refuse to start audio (and warn), so stay quiet
  if (!ctx && navigator.userActivation && !navigator.userActivation.hasBeenActive) return null;
  if (!ctx) {
    const AC: typeof AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.7;
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // one pass of a 9-pin print head: needle strikes at about 2 kHz, a few pins idle
    pinBuf = ctx.createBuffer(1, Math.round(ctx.sampleRate * 0.034), ctx.sampleRate);
    const pd = pinBuf.getChannelData(0);
    for (let t = 0.001; t < 0.033; t += 1 / rnd(1700, 2300)) {
      if (Math.random() < 0.25) continue;
      const i0 = Math.floor(t * ctx.sampleRate),
        a = rnd(0.4, 1);
      for (let k = 0; k < 40 && i0 + k < pd.length; k++) pd[i0 + k] += a * Math.exp(-k / 6) * (Math.random() * 2 - 1);
    }
  }
  if (ctx.state !== "running" && ctx.state !== "closed") ctx.resume().catch(() => {});
  return ctx;
}
function unlock() {
  const c = audio();
  if (!c || unlocked) return;
  unlocked = true;
  const s = c.createBufferSource();
  s.buffer = c.createBuffer(1, 1, 22050);
  s.connect(c.destination);
  s.start(0);
}
for (const ev of ["pointerup", "touchend", "click", "keydown"])
  addEventListener(ev, unlock, { capture: true, passive: true });
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && ctx && ctx.state !== "running") ctx.resume().catch(() => {});
});
export const rnd = (a: number, b: number) => a + Math.random() * (b - a);
function noise(t, type, f, q, gain, decay) {
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  const fl = ctx.createBiquadFilter();
  fl.type = type;
  fl.frequency.value = f;
  fl.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  s.connect(fl).connect(g).connect(master);
  s.start(t, rnd(0, 0.4));
  s.stop(t + decay + 0.01);
}
function tone(t, f, gain, decay, type: OscillatorType = "sine", f2?: number) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + decay);
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + decay + 0.02);
}
let humN = null,
  humL = -1;
export const sfx = {
  hum(level) {
    if (!ctx || !unlocked) return;
    level = Math.min(1, Math.max(0, level));
    if (Math.abs(level - humL) < 0.02 && level) return;
    humL = level;
    if (!humN) {
      const o1 = ctx.createOscillator();
      o1.type = "sawtooth";
      o1.frequency.value = 50;
      const o2 = ctx.createOscillator();
      o2.frequency.value = 100;
      const nz = ctx.createBufferSource();
      nz.buffer = noiseBuf;
      nz.loop = true;
      const nf = ctx.createBiquadFilter();
      nf.type = "lowpass";
      nf.frequency.value = 180;
      const ng = ctx.createGain();
      ng.gain.value = 0.6;
      const g2 = ctx.createGain();
      g2.gain.value = 0.4;
      const lp1 = ctx.createBiquadFilter(),
        lp2 = ctx.createBiquadFilter();
      for (const f of [lp1, lp2]) {
        f.type = "lowpass";
        f.frequency.value = 260;
        f.Q.value = 0.5;
      } // two filters: the glass and the cabinet door
      const g = ctx.createGain();
      g.gain.value = 0;
      o1.connect(lp1);
      o2.connect(g2).connect(lp1);
      nz.connect(nf).connect(ng).connect(lp1);
      lp1.connect(lp2).connect(g).connect(master);
      o1.start();
      o2.start();
      nz.start();
      humN = { g, o1, o2 };
    }
    const t = ctx.currentTime;
    humN.g.gain.setTargetAtTime(0.07 * level, t, level ? 0.06 : 0.12);
    humN.o1.frequency.setTargetAtTime(46 + 8 * level, t, 0.15);
    humN.o2.frequency.setTargetAtTime(92 + 16 * level, t, 0.15);
  }, // the motor winds up a little with speed
  key(down) {
    if (!audio()) return;
    const t = ctx.currentTime,
      p = rnd(0.95, 1.05);
    if (down) {
      noise(t, "lowpass", 1400 * p, 0.8, 0.45, 0.03);
      tone(t, 140 * p, 0.5, 0.07, "sine", 80);
      noise(t + 0.004, "bandpass", 2300 * p, 3, 0.14, 0.02);
    } else {
      noise(t, "bandpass", 2600 * p, 2, 0.18, 0.015);
    }
  },
  rocker() {
    if (!audio()) return;
    const t = ctx.currentTime; // pre-travel rub, over-center snap, contact tick
    noise(t, "bandpass", 1800, 1.2, 0.08, 0.025);
    noise(t + 0.028, "highpass", 3800, 0.7, 0.32, 0.012);
    tone(t + 0.028, 210, 0.35, 0.05, "sine", 120);
    noise(t + 0.036, "bandpass", 6000, 4, 0.1, 0.006);
  },
  tap() {
    if (!audio()) return;
    const t = ctx.currentTime;
    noise(t, "bandpass", 3200, 2, 0.22, 0.008);
    tone(t, 1300, 0.03, 0.03, "square");
  },
  change() {
    if (!audio()) return;
    const t = ctx.currentTime + 0.015; // just after the key's thunk
    noise(t, "highpass", 3000, 0.7, 0.13, 0.03);
    noise(t + 0.02, "bandpass", 1500, 0.8, 0.09, 0.22);
    noise(t + 0.02, "highpass", 5000, 0.7, 0.03, 0.18);
  },
  gear(n, v) {
    if (!audio()) return;
    const t0 = ctx.currentTime,
      s = Math.min(1, v / 1.5),
      g = 0.05 + 0.13 * s,
      f = 2300 + 1100 * s;
    for (let i = 0; i < n; i++) {
      const t = t0 + (i * 0.016) / n,
        p = rnd(0.93, 1.07);
      noise(t, "bandpass", f * p, 5, g, 0.005);
      noise(t, "lowpass", 650 * p, 0.8, g * 0.45, 0.012);
    }
  },
  edge() {
    if (!audio()) return;
    const t = ctx.currentTime;
    tone(t, 220, 0.08, 0.05, "triangle");
  },
  crtOff() {
    if (!audio()) return;
    const t = ctx.currentTime; // relay thump, the picture collapsing, a fading whine
    tone(t, 120, 0.3, 0.16, "sine", 45);
    noise(t, "lowpass", 600, 0.7, 0.25, 0.1);
    tone(t + 0.02, 3200, 0.025, 0.5, "sine", 400);
    noise(t + 0.1, "highpass", 4000, 0.7, 0.04, 0.35);
  },
  crtOn() {
    if (!audio()) return;
    const t = ctx.currentTime; // static crackle, the tube warming up, a faint high whine
    noise(t, "highpass", 3000, 0.7, 0.18, 0.04);
    tone(t, 60, 0.28, 0.5, "sine", 90);
    noise(t + 0.03, "bandpass", 1500, 0.8, 0.12, 0.45);
    tone(t + 0.05, 7800, 0.01, 1.2);
  },
  print() {
    if (!audio()) return;
    const t = ctx.currentTime,
      s = ctx.createBufferSource();
    s.buffer = pinBuf;
    s.playbackRate.value = rnd(0.96, 1.04);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2400;
    bp.Q.value = 0.9;
    const g = ctx.createGain();
    g.gain.value = 0.55;
    s.connect(bp).connect(g).connect(master);
    s.start(t);
  },
  tear() {
    if (!audio()) return;
    const t = ctx.currentTime;
    noise(t, "bandpass", rnd(2200, 4200), 1.4, rnd(0.1, 0.22), rnd(0.006, 0.012));
    if (Math.random() < 0.4) noise(t, "lowpass", 900, 0.7, 0.06, 0.02);
  },
  rip() {
    if (!audio()) return;
    const t = ctx.currentTime;
    noise(t, "highpass", 2000, 0.7, 0.3, 0.06);
    noise(t + 0.015, "bandpass", 1400, 1, 0.12, 0.035);
  },
};
