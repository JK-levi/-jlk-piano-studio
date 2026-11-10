// Independent source of truth: no rendered SVG, chord symbols or audio nodes.
import { parseNote,toMidi,ROOTS } from './theory.js';
import {meter,NOTE_VALUES} from './meter.js';
export const DURATIONS=Object.keys(NOTE_VALUES).map(Number).sort((a,b)=>a-b);
export const HANDS=['right','left'];
export const newId=()=>globalThis.crypto?.randomUUID?.()||`piece-${Date.now()}-${++counter}`;
let counter=0;
export function newComposition(){return {version:1,id:newId(),title:'Untitled piece',tempo:80,key:'C',timeSignature:[4,4],measures:[{right:[],left:[]}]};}
export function usedBeats(doc,measure,hand){return doc.measures[measure][hand].reduce((sum,e)=>sum+e.duration,0);}
export function validateEditableComposition(doc){
 if(!doc||doc.version!==1||typeof doc.id!=='string'||!doc.id||doc.id.length>100||typeof doc.title!=='string'||!doc.title.trim()||doc.title.length>100)throw Error('Enter a title of 1–100 characters.');
 if(!Number.isInteger(doc.tempo)||doc.tempo<40||doc.tempo>180)throw Error('Enter a tempo between 40 and 180 BPM.');
 if(typeof doc.key!=='string'||!ROOTS.includes(doc.key.endsWith('m')?doc.key.slice(0,-1):doc.key))throw Error('Choose a musical key.');
 meter(doc.timeSignature);
 if(!Array.isArray(doc.measures)||!doc.measures.length||doc.measures.length>8)throw Error('Use 1–8 measures.');
 if(doc.metronome!==undefined&&typeof doc.metronome!=='boolean')throw Error('Choose a valid metronome setting.');
 if(doc.copyOf!==undefined){if(!doc.copyOf||typeof doc.copyOf.id!=='string'||typeof doc.copyOf.title!=='string')throw Error('Invalid original-piece reference.');meter(doc.copyOf.timeSignature);}
 const ids=new Set();
 for(const [i,m] of doc.measures.entries())for(const hand of HANDS){
  if(!Array.isArray(m?.[hand])||m[hand].length>12)throw Error('Each hand supports up to twelve eighth-note entries per measure.');let beat=0;
  for(const e of m[hand]){
   if(!e||typeof e.id!=='string'||!e.id||ids.has(e.id)||!DURATIONS.includes(e.duration)||e.beat!==beat||!Array.isArray(e.pitches)||e.pitches.length>8||e.rest!==(e.pitches.length===0))throw Error('Invalid note event or timing.');ids.add(e.id);
   const pitches=new Set();for(const name of e.pitches){const p=parseNote(name),midi=toMidi(name);if(p.octave===null||midi<21||midi>108||Math.abs(p.accidental)>2||pitches.has(midi))throw Error('Use distinct piano pitches between A0 and C8.');pitches.add(midi);}
   beat+=e.duration;if(beat>6)throw Error('A hand-measure cannot contain more than six quarter-note units.');
  }
 }
 return doc;
}
export function compositionIssues(doc){
 validateEditableComposition(doc);const capacity=meter(doc.timeSignature).quarters;
 return doc.measures.flatMap((m,i)=>HANDS.filter(hand=>usedBeats(doc,i,hand)>capacity).map(hand=>({measure:i,hand,excess:usedBeats(doc,i,hand)-capacity})));
}
export function validateComposition(doc){
 validateEditableComposition(doc);const first=compositionIssues(doc)[0];
 if(first)throw Error(`Measure ${first.measure+1}, ${first.hand} hand is overfilled for ${meter(doc.timeSignature).key}. Edit the copy before playing, printing or exporting.`);
 return doc;
}
export function meterCopy(doc,signature,sourceId=doc.id){
 validateEditableComposition(doc);meter(signature);const next=structuredClone(doc),suffix=` · ${signature.join('/')} copy`;
 next.id=newId();next.title=doc.title.slice(0,100-suffix.length)+suffix;next.timeSignature=[...signature];next.copyOf={id:sourceId,title:doc.title,timeSignature:[...(doc.timeSignature||[4,4])]};return validateEditableComposition(next);
}
export function insertEvent(doc,{measure,hand,duration,pitches}){
 validateEditableComposition(doc);if(!HANDS.includes(hand)||!Number.isInteger(measure)||!doc.measures[measure])throw Error('Choose a hand and measure.');
 if(!DURATIONS.includes(duration))throw Error('Choose whole, half, quarter, eighth or dotted notes.');
 const beat=usedBeats(doc,measure,hand),remaining=meter(doc.timeSignature).quarters-beat;
 if(duration>remaining)throw Error(`Only ${Math.max(0,remaining)*(meter(doc.timeSignature).denominator===8?2:1)} ${meter(doc.timeSignature).denominator===8?'eighth-note units':'beats'} remain in measure ${measure+1} for this hand. Choose a shorter duration, another measure, or delete an entry.`);
 const next=structuredClone(doc);next.measures[measure][hand].push({id:newId(),beat,duration,pitches:[...pitches],rest:pitches.length===0});return validateEditableComposition(next);
}
export function deleteEvent(doc,measure,hand,id){const next=structuredClone(doc);next.measures[measure][hand]=next.measures[measure][hand].filter(e=>e.id!==id);let beat=0;next.measures[measure][hand].forEach(e=>{e.beat=beat;beat+=e.duration;});return validateEditableComposition(next);}
export function addMeasure(doc){if(doc.measures.length>=8)throw Error('This editor supports up to eight measures.');const next=structuredClone(doc);next.measures.push({right:[],left:[]});return next;}
export function compositionEvents(doc){validateEditableComposition(doc);const span=meter(doc.timeSignature).quarters;return doc.measures.flatMap((m,index)=>HANDS.flatMap(hand=>m[hand].map(e=>({...e,hand,measure:index,localBeat:e.beat,beat:index*span+e.beat,notes:e.pitches.map(fullName=>({...parseNote(fullName),fullName,midi:toMidi(fullName)}))})))).sort((a,b)=>a.beat-b.beat);}
export function compositionPlan(doc){
 validateComposition(doc);const m=meter(doc.timeSignature),events=compositionEvents(doc).filter(e=>!e.rest).map(e=>({...e,beat:e.beat/m.pulseQuarters,duration:e.duration/m.pulseQuarters}));
 if(doc.metronome)for(let beat=0;beat<doc.measures.length*m.pulses;beat++)events.push({beat,duration:.05,click:true,accent:beat%m.pulses===0});
 return {beats:doc.measures.length*m.pulses,events:events.sort((a,b)=>a.beat-b.beat)};
}
export function incompleteMeasures(doc){const span=meter(doc.timeSignature).quarters;return doc.measures.flatMap((m,i)=>HANDS.filter(hand=>usedBeats(doc,i,hand)<span).map(hand=>({measure:i,hand,remaining:span-usedBeats(doc,i,hand)})));}
export function importComposition(text){if(text.length>200000)throw Error('Choose a composition JSON file smaller than 200 KB.');return validateComposition(JSON.parse(text));}
