export const ROOTS = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'];
export const QUALITIES = {
  major: { name: 'Major', symbol: '', steps: [0,4,7], degrees: [1,3,5], formula: '1 · 3 · 5', description: 'A major third and a perfect fifth: clear and settled.' },
  minor: { name: 'Minor', symbol: 'm', steps: [0,3,7], degrees: [1,3,5], formula: '1 · ♭3 · 5', description: 'A minor third and a perfect fifth: a softer shade.' },
  diminished: { name: 'Diminished', symbol: 'dim', steps: [0,3,6], degrees: [1,3,5], formula: '1 · ♭3 · ♭5', description: 'Two stacked minor thirds create a tense, diminished triad.' },
  augmented: { name: 'Augmented', symbol: 'aug', steps: [0,4,8], degrees: [1,3,5], formula: '1 · 3 · ♯5', description: 'A major triad with a raised fifth creates an unsettled sound.' },
  sus2: { name: 'Suspended 2nd', symbol: 'sus2', steps: [0,2,7], degrees: [1,2,5], formula: '1 · 2 · 5', description: 'The second replaces the third, leaving an open sound.' },
  sus4: { name: 'Suspended 4th', symbol: 'sus4', steps: [0,5,7], degrees: [1,4,5], formula: '1 · 4 · 5', description: 'The fourth replaces the third, inviting resolution.' },
  dominant7: { name: 'Dominant 7th', symbol: '7', steps: [0,4,7,10], degrees: [1,3,5,7], formula: '1 · 3 · 5 · ♭7', description: 'A major triad plus a minor seventh, often pulling toward home.' },
  major7: { name: 'Major 7th', symbol: 'maj7', steps: [0,4,7,11], degrees: [1,3,5,7], formula: '1 · 3 · 5 · 7', description: 'A major triad plus the major seventh.' },
  minor7: { name: 'Minor 7th', symbol: 'm7', steps: [0,3,7,10], degrees: [1,3,5,7], formula: '1 · ♭3 · 5 · ♭7', description: 'A minor triad plus a minor seventh.' },
  minorMajor7: { name: 'Minor–major 7th', symbol: 'm(maj7)', steps: [0,3,7,11], degrees: [1,3,5,7], formula: '1 · ♭3 · 5 · 7', description: 'A minor triad plus a major seventh: a reflective tension.' },
  add9: { name: 'Add 9', symbol: 'add9', steps: [0,4,7,14], degrees: [1,3,5,9], formula: '1 · 3 · 5 · 9', description: 'A major triad with an added ninth, without a seventh.' },
  major9: { name: 'Major 9th', symbol: 'maj9', steps: [0,4,7,11,14], degrees: [1,3,5,7,9], formula: '1 · 3 · 5 · 7 · 9', description: 'A major seventh chord with a ninth above the root.' },
  minor9: { name: 'Minor 9th', symbol: 'm9', steps: [0,3,7,10,14], degrees: [1,3,5,7,9], formula: '1 · ♭3 · 5 · ♭7 · 9', description: 'A minor seventh chord with a ninth above the root.' }
};
const LETTERS = ['C','D','E','F','G','A','B'];
const NATURAL = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
export const mod = (x, n=12) => ((x % n) + n) % n;
export const pretty = s => String(s).replace(/#/g, '♯').replace(/b/g, '♭');
export function parseNote(name) {
  const m = /^([A-G])([#b]*)(-?\d+)?$/.exec(name);
  if (!m) throw new Error(`Invalid note: ${name}`);
  const accidental = [...m[2]].reduce((n,c) => n + (c === '#' ? 1 : -1), 0);
  return { letter:m[1], accidental, octave:m[3] === undefined ? null : Number(m[3]), pitchClass:mod(NATURAL[m[1]]+accidental) };
}
export function toMidi(name) {
  const p = parseNote(name);
  if (p.octave === null) throw new Error('Octave required');
  return 12*(p.octave+1)+NATURAL[p.letter]+p.accidental;
}
export function midiName(midi, flats=false) {
  const names = flats ? ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'] : ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  return names[mod(midi)] + (Math.floor(midi/12)-1);
}
export function chord(spec={}) {
  const { root='C', quality='major', octave=4, inversion=0, voicing='close' } = spec;
  if (!ROOTS.includes(root) || !QUALITIES[quality] || !Number.isInteger(octave) || octave<2 || octave>4) throw new Error('Invalid chord specification');
  const q = QUALITIES[quality];
  const r = parseNote(root);
  const rootIndex = LETTERS.indexOf(r.letter);
  const rootMidi = toMidi(root+octave);
  let notes = q.steps.map((step,i) => {
    const degreeIndex = rootIndex+q.degrees[i]-1;
    const letter = LETTERS[degreeIndex%7];
    const writtenOctave = octave+Math.floor(degreeIndex/7);
    const midi = rootMidi+step;
    const accidental = midi-(12*(writtenOctave+1)+NATURAL[letter]);
    return { letter, accidental, octave:writtenOctave, midi };
  });
  const inv = mod(Math.trunc(inversion), notes.length);
  const bass = notes[inv].midi;
  notes = notes.map(n => { let lift=0; while(n.midi+lift<bass) lift+=12; return {...n,midi:n.midi+lift,octave:n.octave+lift/12}; }).sort((a,b)=>a.midi-b.midi);
  if (voicing === 'open' && notes.length>2) { notes[1] = {...notes[1], midi:notes[1].midi+12, octave:notes[1].octave+1}; notes.sort((a,b)=>a.midi-b.midi); }
  notes = notes.map(n=>({...n, name:n.letter+(n.accidental>=0?'#'.repeat(n.accidental):'b'.repeat(-n.accidental)), fullName:n.letter+(n.accidental>=0?'#'.repeat(n.accidental):'b'.repeat(-n.accidental))+n.octave}));
  return { notes, symbol:root+q.symbol+(inv ? '/'+notes[0].name : ''), quality:q, inversion:inv };
}
export function transpose(spec, semitones) {
  const pc = mod(parseNote(spec.root).pitchClass+semitones);
  const flat = spec.root.includes('b') || ['F','Bb','Eb','Ab','Db','Gb'].includes(spec.root);
  return {...spec, root:midiName(60+pc,flat).replace(/\d+$/, '')};
}
export function voiceLead(spec, previous) {
  if (!previous?.length) return {...spec};
  let best = {...spec}, score = Infinity;
  for (let octave=2;octave<=4;octave++) for (let inversion=0;inversion<QUALITIES[spec.quality].steps.length;inversion++) {
    const candidate = {...spec, octave, inversion, voicing:'close'};
    const notes = chord(candidate).notes;
    const cost = notes.reduce((s,n)=>s+Math.min(...previous.map(p=>Math.abs(p.midi-n.midi))),0) + Math.abs(notes[0].midi-previous[0].midi)*0.5;
    if (cost<score) { score=cost; best=candidate; }
  }
  return best;
}
export const INTERVALS = {0:'unison',2:'major 2nd',3:'minor 3rd',4:'major 3rd',5:'perfect 4th',6:'diminished 5th',7:'perfect 5th',8:'augmented 5th',10:'minor 7th',11:'major 7th',14:'major 9th'};
