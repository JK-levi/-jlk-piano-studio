// One bounded look-ahead scheduler for sound and output-clock visual events.
// Injected dependencies make timing, interruption, looping, and cleanup testable.
export class Playback {
  constructor({ audio, requestFrame = callback => globalThis.requestAnimationFrame(callback), cancelFrame = id => globalThis.cancelAnimationFrame(id) }) {
    this.audio = audio; this.requestFrame = requestFrame; this.cancelFrame = cancelFrame;
    this.running = false; this.frameId = null;
  }
  stop() {
    this.running = false;
    if (this.frameId !== null) this.cancelFrame(this.frameId);
    this.frameId = null; this.audio.silence();
    this.options?.onFrame?.([], null);
  }
  start(plan, options = {}) {
    this.stop();
    if (!plan.events.length || plan.beats <= 0) return;
    this.plan = plan; this.options = options; this.seconds = 60 / (options.bpm || 80);
    this.startBeat = options.fromBeat || 0;
    this.origin = this.audio.now() + 0.06 - this.startBeat * this.seconds;
    this.cursor = plan.events.findIndex(event => event.beat >= this.startBeat);
    if (this.cursor < 0) this.cursor = plan.events.length;
    this.cycle = 0; this.queued = []; this.running = true;
    this.pump();
  }
  pump = () => {
    if (!this.running) return;
    try {
      if (!this.audio.isRunning()) throw new Error('Audio interrupted. Tap Test Sound, then Play to continue.');
      const { plan, options, seconds, origin } = this;
      const horizon = this.audio.now() + 0.12;
      while (true) {
        if (this.cursor >= plan.events.length) {
          if (!options.loop) break;
          this.cycle++; this.cursor = 0;
        }
        const event = plan.events[this.cursor];
        const at = origin + (event.beat + this.cycle * plan.beats) * seconds;
        if (at > horizon) break;
        if (event.click) this.audio.click(at, event.accent);
        else event.notes.forEach(note => this.audio.tone(note.midi, at, (event.ring || event.duration) * seconds, 0.4 / Math.sqrt(event.notes.length)));
        this.queued.push({ ...event, at, until: at + event.duration * seconds });
        this.cursor++;
      }
      const audible = this.audio.audibleTime();
      this.queued = this.queued.filter(event => event.until > audible);
      const elapsed = (audible - origin) / seconds;
      const beat = Math.max(this.startBeat, elapsed);
      const position = options.loop ? beat % plan.beats : Math.min(beat, plan.beats);
      options.onFrame?.(this.queued.filter(event => !event.click && event.at <= audible), position);
      if (!options.loop && elapsed >= plan.beats) {
        this.stop(); options.onEnd?.(); return;
      }
      this.frameId = this.requestFrame(this.pump);
    } catch (error) { this.stop(); this.options.onError?.(error); }
  };
}
