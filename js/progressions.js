import { parseNote, mod, QUALITIES } from './theory.js';
const make = (root, quality = 'major') => ({ root, quality, octave: 3, inversion: 0, voicing: 'close' });
export const PRESETS = [
  { name:'The familiar · C – Am – F – G', key:'C', chords:[make('C'),make('A','minor'),make('F'),make('G')] },
  { name:'A little lift · C – G – Am – F', key:'C', chords:[make('C'),make('G'),make('A','minor'),make('F')] },
  { name:'In reflection · Cmaj7 – Am9 – Fmaj7 – G7', key:'C', chords:[make('C','major7'),make('A','minor9'),make('F','major7'),make('G','dominant7')] },
  { name:'A gentle cadence · Dm7 – G7 – Cmaj7', key:'C', chords:[make('D','minor7'),make('G','dominant7'),make('C','major7')] },
  { name:'A minor evening · Am – F – Dm – E7', key:'Am', chords:[make('A','minor'),make('F'),make('D','minor'),make('E','dominant7')] }
];
export function romanNumeral(spec, key) {
  if (!key) return '';
  const minor = key.endsWith('m'), root = minor ? key.slice(0,-1) : key;
  const tonic=parseNote(root), target=parseNote(spec.root);
  const scale = minor ? [0,2,3,5,7,8,10] : [0,2,4,5,7,9,11];
  const degree = mod('CDEFGAB'.indexOf(target.letter)-'CDEFGAB'.indexOf(tonic.letter),7);
  let alteration=mod(target.pitchClass-tonic.pitchClass-scale[degree]);
  if(alteration>6)alteration-=12;
  if(Math.abs(alteration)>2)return 'chromatic';
  const accidental=alteration<0?'♭'.repeat(-alteration):'♯'.repeat(alteration);
  let numeral = ['I','II','III','IV','V','VI','VII'][degree];
  if (QUALITIES[spec.quality].steps[1] === 3) numeral = numeral.toLowerCase();
  const suffix = { diminished:'°', augmented:'+', major7:'maj7', minor7:'7', dominant7:'7', minorMajor7:'(maj7)', major9:'maj9', minor9:'9', add9:'add9', sus2:'sus2', sus4:'sus4' }[spec.quality] || '';
  return accidental + numeral + suffix;
}
