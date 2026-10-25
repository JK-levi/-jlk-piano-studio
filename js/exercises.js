import { chord, toMidi, parseNote } from './theory.js';
export const bachNotes = ['C4','E4','G4','C5','E5'].map(fullName => ({ ...parseNote(fullName), fullName, midi: toMidi(fullName) }));
const event = (notes, beat, duration, extra = {}) => ({ notes, beat, duration, ...extra });
export function brokenEvents(notes, chordIndex = 0, start = 0) {
  return Array.from({ length: 8 }, (_, i) => event([notes[i % notes.length]], start + i / 2, 0.5, { noteIndex: i, chordIndex }));
}
export function chordPlan(notes, broken = false) {
  return { beats: 4, events: broken ? brokenEvents(notes) : [event(notes, 0, 4)] };
}
export function bachPlan() {
  const figure = [0,1,2,3,4,2,3,4];
  return { beats: 8, events: Array.from({ length: 16 }, (_, i) => event([bachNotes[figure[i % 8]]], i / 2, 0.5, { noteIndex: i, ring: i % 8 < 2 ? 3.5 : 0.65 })) };
}
export function progressionPlan(specs, { broken = false, metronome = false } = {}) {
  const events = specs.flatMap((spec, index) => {
    const notes = chord(spec).notes;
    return broken ? brokenEvents(notes, index, index * 4) : [event(notes, index * 4, 4, { chordIndex: index })];
  });
  if (metronome) for (let beat = 0; beat < specs.length * 4; beat++) events.push({ beat, duration: 0.1, click: true, accent: beat % 4 === 0 });
  return { beats: specs.length * 4, events: events.sort((a,b) => a.beat - b.beat) };
}
