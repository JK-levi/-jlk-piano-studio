// Keep context creation, the first buffer start, and resume() in the gesture's
// synchronous call stack. Never mistake a resolved resume for a running engine.
export function createAudioEngine({ host = () => globalThis, timeout = 2500 } = {}) {
  let context, master, pending;
  const voices = new Set(), listeners = new Set();
  const report = (message, error = false) => {
    const status = { state: context?.state || 'uninitialized', message, error };
    listeners.forEach(listener => listener(status));
  };
  function stateMessage() {
    const state = context?.state;
    report(state === 'running' ? 'Audio engine ready. Device output is not verified.' :
      state === 'interrupted' ? 'Audio interrupted. Tap Test Sound to reconnect.' :
      state === 'closed' ? 'Audio closed. Tap Test Sound to restart.' : 'Audio paused. Tap Test Sound to resume.');
  }
  function silence() {
    for (const source of voices) { try { source.stop(); } catch { /* Already ended. */ } }
    voices.clear();
  }
  function initialize() {
    const platform = host();
    const Audio = platform.AudioContext || platform.webkitAudioContext;
    if (!Audio) throw new Error('Web Audio is unavailable in this browser.');
    // Supported by newer Safari versions. No permissions or external media.
    // Older browsers retain their default routing; do not pretend we can verify it.
    try { if (platform.navigator?.audioSession) platform.navigator.audioSession.type = 'playback'; } catch { /* Optional API. */ }
    context = new Audio({ latencyHint: 'interactive' });
    master = context.createGain(); master.gain.value = 0.7;
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -14; limiter.knee.value = 18;
    limiter.ratio.value = 5; limiter.attack.value = 0.003; limiter.release.value = 0.18;
    master.connect(limiter); limiter.connect(context.destination);
    context.onstatechange = stateMessage;
  }
  function unlock({ reset = false } = {}) {
    // This function deliberately isn't async: all activation work happens before
    // returning a promise to the UI. The UI must call it directly from a gesture.
    try {
      if (reset) {
        silence(); pending = null;
        if (context) { context.onstatechange = null; context.close().catch(() => {}); }
        context = null;
      }
      if (!context || context.state === 'closed') { pending = null; initialize(); }
      if (pending) return pending;
      const current = context;
      // Safari's legacy unlock also primes the destination with a silent buffer.
      const primer = current.createBufferSource();
      primer.buffer = current.createBuffer(1, 1, current.sampleRate);
      primer.connect(master); primer.onended = () => primer.disconnect();
      primer.start(0);
      report('Starting audio. If this stalls, tap Recover audio.');
      const resumed = current.resume(); // Invoke even for interrupted contexts.
      let timer;
      const deadline = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Audio did not resume. Tap Recover audio, then Test Sound.')), timeout);
      });
      const operation = Promise.race([Promise.resolve(resumed), deadline]).then(() => {
        if (current !== context) throw new Error('Audio was reset. Tap Play again.');
        if (current.state !== 'running') throw new Error(`Audio is ${current.state}. Tap Recover audio, then try again.`);
        stateMessage(); return current;
      }).catch(error => { if (current === context) report(error.message, true); throw error; }).finally(() => {
        clearTimeout(timer); if (pending === operation) pending = null;
      });
      pending = operation;
      return operation;
    } catch (error) { report(error.message, true); return Promise.reject(error); }
  }
  const now = () => context?.currentTime ?? 0;
  function audibleTime() {
    // Map animation to the output clock, not wall-clock timers. The timestamp API
    // accounts for output buffering; latency values are a fallback, not a promise
    // of exact Bluetooth/hardware latency on every device.
    const stamp = context?.getOutputTimestamp?.();
    if (stamp?.contextTime > 0 && stamp.performanceTime > 0)
      return stamp.contextTime + Math.max(0, (host().performance.now() - stamp.performanceTime) / 1000);
    return Math.max(0, now() - (context?.outputLatency || context?.baseLatency || 0));
  }
  function tone(midi, when = now(), duration = 1.5, volume = 0.22) {
    if (!context || context.state !== 'running') throw new Error('Audio is not running. Tap Test Sound to resume.');
    if (![midi, when, duration, volume].every(Number.isFinite) || duration <= 0) throw new Error('Invalid audio event.');
    when = Math.max(when, now());
    const frequency = 440 * 2 ** ((midi - 69) / 12);
    // Soft hammer attack and independently decaying partials: brighter onset,
    // warm sustained fundamental. All nodes are local; no sample downloads.
    const filter = context.createBiquadFilter(); filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(10000, frequency * 9), when);
    filter.frequency.exponentialRampToValueAtTime(Math.max(600, frequency * 2), when + duration);
    filter.Q.value = 0.4; filter.connect(master);
    let remaining = 4;
    [1, 0.28, 0.1, 0.035].forEach((level, index) => {
      const source = context.createOscillator(), gain = context.createGain();
      source.type = 'sine'; source.frequency.value = frequency * (index + 1);
      const attack = Math.min(0.008, duration / 4);
      gain.gain.setValueAtTime(0, when);
      gain.gain.linearRampToValueAtTime(volume * level, when + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + duration / (1 + index * 0.4));
      source.connect(gain); gain.connect(filter); voices.add(source);
      source.onended = () => { voices.delete(source); source.disconnect(); gain.disconnect(); if (--remaining === 0) filter.disconnect(); };
      source.start(when); source.stop(when + duration + 0.02);
    });
  }
  function playNotes(notes, { arpeggio = false, beat = 0.23, duration = 1.8, at = now() } = {}) {
    notes.forEach((n, i) => tone(n.midi, at + (arpeggio ? i * beat : 0), duration, 0.42 / Math.sqrt(notes.length)));
  }
  return { unlock, silence, now, audibleTime, tone, playNotes,
    click: (at = now(), accent = false) => tone(accent ? 96 : 89, at, 0.045, 0.1),
    isRunning: () => context?.state === 'running',
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    refreshStatus: stateMessage };
}
const engine = createAudioEngine();
export const { unlock, silence, now, audibleTime, tone, playNotes, click, isRunning, subscribe, refreshStatus } = engine;
