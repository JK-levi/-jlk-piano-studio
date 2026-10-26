// Independent source of truth: no rendered SVG, chord symbols or audio nodes.
import { parseNote,toMidi,ROOTS } from './theory.js';
export const DURATIONS=[4,2,1,.5];
export const HANDS=['right','left'];
export const newId=()=>globalThis.crypto?.randomUUID?.()||`piece-${Date.now()}-${++counter}`;
let counter=0;
export function newComposition(){return {version:1,id:newId(),title:'Untitled piece',tempo:80,key:'C',timeSignature:[4,4],measures:[{right:[],left:[]}]};}
export function usedBeats(doc,measure,hand){return doc.measures[measure][hand].reduce((sum,e)=>sum+e.duration,0);}
export function validateComposition(doc){
 if(!doc||doc.version!==1||typeof doc.id!=='string'||!doc.id||doc.id.length>100||typeof doc.title!=='string'||!doc.title.trim()||doc.title.length>100)throw Error('Enter a title of 1–100 characters.');
 if(!Number.isInteger(doc.tempo)||doc.tempo<40||doc.tempo>180)throw Error('Enter a tempo between 40 and 180 BPM.');
 if(typeof doc.key!=='string'||!ROOTS.includes(doc.key.endsWith('m')?doc.key.slice(0,-1):doc.key))throw Error('Choose a musical key.');
 if(JSON.stringify(doc.timeSignature)!=='[4,4]'||!Array.isArray(doc.measures)||!doc.measures.length||doc.measures.length>8)throw Error('Use 1–8 measures in 4/4 time.');
 const ids=new Set();
 for(const [i,m] of doc.measures.entries())for(const hand of HANDS){
  if(!Array.isArray(m?.[hand])||m[hand].length>8)throw Error('Each hand supports up to eight eighth notes per measure.');let beat=0;
  for(const e of m[hand]){
   if(!e||typeof e.id!=='string'||!e.id||ids.has(e.id)||!DURATIONS.includes(e.duration)||e.beat!==beat||!Array.isArray(e.pitches)||e.pitches.length>8||e.rest!==(e.pitches.length===0))throw Error('Invalid note event or timing.');ids.add(e.id);
   const pitches=new Set();for(const name of e.pitches){const p=parseNote(name),midi=toMidi(name);if(p.octave===null||midi<21||midi>108||Math.abs(p.accidental)>2||pitches.has(midi))throw Error('Use distinct piano pitches between A0 and C8.');pitches.add(midi);}
   beat+=e.duration;if(beat>4)throw Error(`Measure ${i+1}, ${hand} hand is overfilled.`);
  }
 }
 return doc;
}
export function insertEvent(doc,{measure,hand,duration,pitches}){
 validateComposition(doc);if(!HANDS.includes(hand)||!Number.isInteger(measure)||!doc.measures[measure])throw Error('Choose a hand and measure.');
 if(!DURATIONS.includes(duration))throw Error('Choose whole, half, quarter or eighth notes.');
 const beat=usedBeats(doc,measure,hand),remaining=4-beat;
 if(duration>remaining)throw Error(`Only ${remaining} beat${remaining===1?'':'s'} remain in measure ${measure+1} for this hand. Choose a shorter duration, another measure, or delete an entry.`);
 const next=structuredClone(doc);next.measures[measure][hand].push({id:newId(),beat,duration,pitches:[...pitches],rest:pitches.length===0});return validateComposition(next);
}
export function deleteEvent(doc,measure,hand,id){const next=structuredClone(doc);next.measures[measure][hand]=next.measures[measure][hand].filter(e=>e.id!==id);let beat=0;next.measures[measure][hand].forEach(e=>{e.beat=beat;beat+=e.duration;});return validateComposition(next);}
export function addMeasure(doc){if(doc.measures.length>=8)throw Error('This editor supports up to eight measures.');const next=structuredClone(doc);next.measures.push({right:[],left:[]});return next;}
export function compositionEvents(doc){validateComposition(doc);return doc.measures.flatMap((m,index)=>HANDS.flatMap(hand=>m[hand].map(e=>({...e,hand,beat:index*4+e.beat,notes:e.pitches.map(fullName=>({...parseNote(fullName),fullName,midi:toMidi(fullName)}))})))).sort((a,b)=>a.beat-b.beat);}
export function compositionPlan(doc){return {beats:doc.measures.length*4,events:compositionEvents(doc).filter(e=>!e.rest)};}
export function incompleteMeasures(doc){return doc.measures.flatMap((m,i)=>HANDS.filter(hand=>usedBeats(doc,i,hand)<4).map(hand=>({measure:i,hand,remaining:4-usedBeats(doc,i,hand)})));}
export function importComposition(text){if(text.length>200000)throw Error('Choose a composition JSON file smaller than 200 KB.');return validateComposition(JSON.parse(text));}
