import {meter} from './meter.js';
// Deterministic tonal suggestions, not probability claims or an AI service.
import {chord,QUALITIES,ROOTS,parseNote,toMidi,midiName,mod} from './theory.js';
import {compositionEvents,usedBeats} from './composition-model.js';
const LETTERS='CDEFGAB';
function scale(key,octave){
 const minor=key.endsWith('m'),root=minor?key.slice(0,-1):key,r=parseNote(root),start=LETTERS.indexOf(r.letter),base=toMidi(root+octave);
 return (minor?[0,2,3,5,7,8,10]:[0,2,4,5,7,9,11]).map((step,i)=>{const letter=LETTERS[(start+i)%7],written=octave+Math.floor((start+i)/7),alter=base+step-toMidi(letter+written);return letter+(alter>=0?'#'.repeat(alter):'b'.repeat(-alter));});
}
export function chordPitches(spec,octave){
 const normalized=ROOTS.includes(spec.root)?spec.root:midiName(toMidi(spec.root+'4'),spec.root.includes('b')).replace(/\d+$/,'');
 chord({...spec,root:normalized,octave:3,inversion:0,voicing:'close'});
 const q=QUALITIES[spec.quality],r=parseNote(spec.root),start=LETTERS.indexOf(r.letter),base=toMidi(spec.root+octave);
 return q.steps.map((step,i)=>{const degree=start+q.degrees[i]-1,letter=LETTERS[degree%7],written=octave+Math.floor(degree/7),alter=base+step-toMidi(letter+written);return letter+(alter>=0?'#'.repeat(alter):'b'.repeat(-alter))+written;});
}

function candidates(key){
 const minor=key.endsWith('m'),names=scale(key,3),qualities=minor?['minor','diminished','major','minor','major','major','major']:['major','minor','minor','major','major','minor','diminished'];
 return names.map((root,i)=>({root,quality:qualities[i]}));
}
export function contextAt(doc,{measure,hand}){
 const beat=measure*meter(doc.timeSignature).quarters+usedBeats(doc,measure,hand),events=compositionEvents(doc);
 const prior=events.filter(e=>e.beat<beat||(e.hand!==hand&&e.beat===beat));
 const underlying=prior.filter(e=>e.pitches.length>=3&&e.hand!==hand&&e.beat<=beat&&e.beat+e.duration>beat).at(-1)||prior.filter(e=>e.pitches.length>=3).at(-1);
 const melody=prior.filter(e=>e.hand===hand&&e.pitches.length).at(-1);
 return {beat,underlying,lastNote:melody?Math.max(...melody.pitches.map(toMidi)):null};
}
export function suggestChords(doc,position){
 const all=candidates(doc.key),context=contextAt(doc,position);let previous=-1;
 if(context.underlying){const pcs=context.underlying.pitches.map(p=>mod(toMidi(p)));previous=all.findIndex(s=>{const pitches=chordPitches(s,3).map(p=>mod(toMidi(p)));return pitches.every(p=>pcs.includes(p));});}
 const minor=doc.key.endsWith('m'),order=previous===4||previous===6?[0,5,3]:previous===1||previous===3?[4,0,5]:[minor?3:5,3,4];
 const unique=[...new Set(order)];for(const i of [0,4,3,5])if(!unique.includes(i))unique.push(i);
 return unique.filter(i=>chordPitches(all[i],position.octave).every(p=>toMidi(p)>=21&&toMidi(p)<=108)).slice(0,3).map(i=>{const spec=all[i],symbol=spec.root+QUALITIES[spec.quality].symbol;return {spec,symbol,pitches:chordPitches(spec,position.octave),description:i===0?'A settled place to land.':i===4?'A little tension, inviting a return home.':i===3?'An open turn into a new color.':'A softer change of scenery.'};});
}
export function suggestNotes(doc,position){
 const context=contextAt(doc,position),names=scale(doc.key,position.octave),chordPCs=new Set(context.underlying?.pitches.map(p=>mod(toMidi(p)))||[]);
 const tonic=mod(toMidi((doc.key.endsWith('m')?doc.key.slice(0,-1):doc.key)+'4'));
 return names.map(name=>{const pitch=name+position.octave,midi=toMidi(pitch),distance=context.lastNote===null?0:Math.abs(midi-context.lastNote);return {pitch,midi,distance,score:distance*2+(distance>7?8:0)+(distance===0?3:0)-(chordPCs.has(mod(midi))?4:0)-(context.lastNote===null&&mod(midi)===tonic?6:0)};}).filter(n=>n.midi>=21&&n.midi<=108).sort((a,b)=>a.score-b.score||a.midi-b.midi).slice(0,3).map(n=>({pitch:n.pitch,description:chordPCs.has(mod(n.midi))?'Belongs to the harmony sounding here.':n.distance<=2?'A small, easy step from your last note.':'A note from your chosen key, within this octave.'}));
}
