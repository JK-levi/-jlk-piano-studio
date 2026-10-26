import { parseNote, mod, QUALITIES } from './theory.js';
const make = (root, quality = 'major') => ({ root, quality, octave: 3, inversion: 0, voicing: 'close' });
export const PRESETS = [
  { name:'The familiar · C – Am – F – G', key:'C', chords:[make('C'),make('A','minor'),make('F'),make('G')] },
  { name:'A little lift · C – G – Am – F', key:'C', chords:[make('C'),make('G'),make('A','minor'),make('F')] },
  { name:'In reflection · Cmaj7 – Am9 – Fmaj7 – G7', key:'C', chords:[make('C','major7'),make('A','minor9'),make('F','major7'),make('G','dominant7')] },
  { name:'A gentle cadence · Dm7 – G7 – Cmaj7', key:'C', chords:[make('D','minor7'),make('G','dominant7'),make('C','major7')] },
  { name:'A minor evening · Am – F – Dm – E7', key:'Am', chords:[make('A','minor'),make('F'),make('D','minor'),make('E','dominant7')] }
];
const additions = [
 ['Coming home','C','gentle','easy',72,'Hear the last chord settle back home.',['C','F','G','C']],
 ['A brighter day','G','uplifting','easy',88,'Keep an even pulse through these familiar shapes.',['G','D','Em','C']],
 ['Room to breathe','F','gentle','easy',66,'Leave space between each warm chord.',['F','Bb','C','F']],
 ['A small adventure','D','uplifting','developing',90,'Listen for the lift from B minor into G.',['D','A','Bm','G']],
 ['Descending evening','Am','moody','easy',68,'A falling bass brings a little drama.',['Am','G','F','E7']],
 ['Quiet window','C','reflective','developing',64,'Sevenths soften familiar chord shapes.',['Cmaj7','Am7','Dm7','G7']],
 ['Blue room','C','jazzy','developing',78,'A twelve-bar blues loop with straight timing.',['C7','C7','C7','C7','F7','F7','C7','C7','G7','F7','C7','G7']],
 ['Soft landing','Eb','gentle','developing',70,'Follow the movement toward a gentle E-flat home.',['Fm7','Bb7','Ebmaj7','Ebmaj7']],
 ['Late-night circle','C','jazzy','adventurous',76,'A brighter A7 leads to D minor.',['Cmaj7','A7','Dm7','G7']],
 ['Under the surface','Dm','dramatic','developing',74,'The final A7 leaves a question for the next loop.',['Dm','Bb','Gm','A7']],
 ['Open sky','G','uplifting','developing',84,'Suspended colors open into settled harmony.',['Gsus4','G','Cadd9','D7']],
 ['Close by','C','reflective','developing',68,'Inversions keep neighboring chords close together.',['C','Am','F','G']],
 ['Velvet dusk','F','jazzy','adventurous',62,'Ninths give these slow chords more color.',['Fmaj9','Dm9','Gm7','C7']]
];
function parseSymbol(symbol){
 const match=/^([A-G](?:b|#)?)(.*)$/.exec(symbol), suffix=match[2];
 const quality={'':'major',m:'minor','7':'dominant7',maj7:'major7',m7:'minor7',maj9:'major9',m9:'minor9',sus4:'sus4',add9:'add9'}[suffix];
 return make(match[1],quality);
}
const metadata=[
 ['uplifting','easy',80,'An easy four-chord loop. Listen once, then play each chord for four beats.'],
 ['uplifting','easy',84,'The same family of chords in a new order.'],
 ['reflective','adventurous',64,'Listen to the extra colors above each triad.'],
 ['jazzy','developing',72,'Three chords move gently toward C.'],
 ['moody','developing',68,'A minor home with a brighter final chord.']
];
PRESETS.forEach((p,i)=>Object.assign(p,{mood:metadata[i][0],difficulty:metadata[i][1],tempo:metadata[i][2],hint:metadata[i][3]}));
for(const [name,key,mood,difficulty,tempo,hint,symbols] of additions)PRESETS.push({name,key,mood,difficulty,tempo,hint,chords:symbols.map(parseSymbol)});
PRESETS[16].chords[1]={...make('A','minor'),inversion:1};
PRESETS[16].chords[2]={...make('F'),inversion:2};
export function filterPresets(mood='',difficulty=''){return PRESETS.map((p,index)=>({...p,index})).filter(p=>(!mood||p.mood===mood)&&(!difficulty||p.difficulty===difficulty));}

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
