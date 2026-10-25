export class Practice {
  constructor(notes = []) { this.reset(notes); }
  reset(notes) { this.notes = notes; this.found = new Set(); this.mistakes = 0; }
  attempt(midi) {
    if (this.notes.some(note => note.midi === midi)) { this.found.add(midi); return true; }
    this.mistakes++; return false;
  }
  get complete() { return this.notes.length > 0 && this.found.size === this.notes.length; }
  get hint() { return this.notes.find(note => !this.found.has(note.midi)); }
  get progress() { return `${this.found.size} of ${this.notes.length} notes found${this.complete ? ' · Chord complete' : ''}`; }
}
