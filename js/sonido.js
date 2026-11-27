// CVRCVMO · Ambiente sonoro sintetizado en el navegador (Web Audio, sin archivos).
// Graves profundos, aire metálico y campanas lejanas. Nunca suena solo: se activa con un botón.
export function crearSonido() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  let ctx = null, master = null, bus = null, on = false, bellTimer = 0;

  function noiseBuffer(sec) {
    const b = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate), d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } // ruido café: suave
    return b;
  }
  function whiteBuffer(sec) {
    const b = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  function build() {
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3;
    master.connect(comp); comp.connect(ctx.destination);
    // reverberación metálica: dos retardos cruzados con filtro en el lazo
    bus = ctx.createGain(); bus.gain.value = 1; bus.connect(master);
    const dl = ctx.createDelay(1), dr = ctx.createDelay(1), fb = ctx.createGain(), lp = ctx.createBiquadFilter();
    dl.delayTime.value = 0.31; dr.delayTime.value = 0.47; fb.gain.value = 0.42; lp.type = 'lowpass'; lp.frequency.value = 2600;
    const send = ctx.createGain(); send.gain.value = 0.5;
    send.connect(dl); dl.connect(lp); lp.connect(dr); dr.connect(fb); fb.connect(dl); dr.connect(master);
    bus.send = send;

    // graves: tres osciladores casi afinados que laten despacio
    const low = ctx.createBiquadFilter(); low.type = 'lowpass'; low.frequency.value = 170; low.Q.value = 0.6;
    const lowG = ctx.createGain(); lowG.gain.value = 0.55; low.connect(lowG); lowG.connect(master);
    [[41.2, 'sine', 0.55], [41.65, 'sine', 0.4], [61.7, 'triangle', 0.12], [82.4, 'sine', 0.06]].forEach(([f, t, g]) => {
      const o = ctx.createOscillator(); o.type = t; o.frequency.value = f;
      const gn = ctx.createGain(); gn.gain.value = g; o.connect(gn); gn.connect(low); o.start();
    });
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.045;
    const lfoG = ctx.createGain(); lfoG.gain.value = 55; lfo.connect(lfoG); lfoG.connect(low.frequency); lfo.start();

    // aire: ruido filtrado que respira
    const air = ctx.createBufferSource(); air.buffer = noiseBuffer(4); air.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.9;
    const airG = ctx.createGain(); airG.gain.value = 0.07;
    air.connect(bp); bp.connect(airG); airG.connect(master); air.start();
    const lfo2 = ctx.createOscillator(); lfo2.frequency.value = 0.03; const l2 = ctx.createGain(); l2.gain.value = 500;
    lfo2.connect(l2); l2.connect(bp.frequency); lfo2.start();

    // brillo metálico: ruido blanco muy agudo, casi imperceptible
    const sh = ctx.createBufferSource(); sh.buffer = whiteBuffer(3); sh.loop = true;
    const hp = ctx.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.value = 6200; hp.Q.value = 14;
    const shG = ctx.createGain(); shG.gain.value = 0.012;
    sh.connect(hp); hp.connect(shG); shG.connect(bus.send); sh.start();
  }

  // campana de metal (FM): parciales inarmónicos, ataque suave y cola larga
  function bell(freq = 440, gain = 0.05, dur = 4) {
    if (!on) return;
    const t = ctx.currentTime;
    const car = ctx.createOscillator(), mod = ctx.createOscillator(), mg = ctx.createGain(), g = ctx.createGain();
    car.frequency.value = freq; mod.frequency.value = freq * 3.47;
    mg.gain.setValueAtTime(freq * 2.2, t); mg.gain.exponentialRampToValueAtTime(freq * 0.05, t + dur);
    mod.connect(mg); mg.connect(car.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    car.connect(g); g.connect(bus); g.connect(bus.send);
    car.start(t); mod.start(t); car.stop(t + dur + 0.1); mod.stop(t + dur + 0.1);
  }
  function scheduleBells() {
    clearTimeout(bellTimer);
    if (!on) return;
    bellTimer = setTimeout(() => { const notes = [196, 233.1, 261.6, 293.7, 349.2]; bell(notes[(Math.random() * notes.length) | 0], 0.022, 6); scheduleBells(); }, 9000 + Math.random() * 9000);
  }

  // sonidos de interacción (solo con el sonido encendido)
  function tick() {
    if (!on) return;
    const t = ctx.currentTime, s = ctx.createBufferSource(); s.buffer = whiteBuffer(0.05);
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 3800;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
    s.connect(f); f.connect(g); g.connect(master); s.start(t);
  }
  function whoosh(up = true) {
    if (!on) return;
    const t = ctx.currentTime, s = ctx.createBufferSource(); s.buffer = whiteBuffer(1);
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.4;
    f.frequency.setValueAtTime(up ? 220 : 2400, t); f.frequency.exponentialRampToValueAtTime(up ? 2400 : 220, t + 0.7);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.08, t + 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + 0.9);
  }
  const morph = () => bell(130.8 * (1 + Math.floor(Math.random() * 3) * 0.5), 0.03, 3.2);

  async function set(next) {
    if (next === on) return on;
    if (next) {
      if (!ctx) build();
      if (ctx.state === 'suspended') await ctx.resume();
      on = true;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 2.5);
      scheduleBells();
      setTimeout(() => bell(98, 0.03, 6), 400);
    } else {
      on = false;
      clearTimeout(bellTimer);
      if (ctx) {
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
        master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);
        setTimeout(() => { if (!on && ctx) ctx.suspend(); }, 900);
      }
    }
    return on;
  }
  document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend(); else if (on) ctx.resume(); });

  return {set, toggle: () => set(!on), get on() { return on; }, tick, whoosh, morph};
}
