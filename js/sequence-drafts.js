import { read,write,validSpec } from './storage.js';
export function preserveSequence(chords,name,key,presets,saves){
 if(!chords.length||[...presets,...saves].some(p=>JSON.stringify(p.chords)===JSON.stringify(chords)))return {ok:true,preserved:false};
 const drafts=read('sequence-drafts',[]);if(!Array.isArray(drafts))return {ok:false};
 if(drafts.at(-1)&&JSON.stringify(drafts.at(-1).chords)===JSON.stringify(chords))return {ok:true,preserved:true};
 if(drafts.length>=20)return {ok:false};
 const ok=write('sequence-drafts',[...drafts,{name,key,chords:structuredClone(chords)}]);return {ok,preserved:ok};
}
export function latestDraft(){const drafts=read('sequence-drafts',[]);return Array.isArray(drafts)?drafts.filter(p=>p&&typeof p.name==='string'&&Array.isArray(p.chords)&&p.chords.length<=64&&p.chords.length&&p.chords.every(validSpec)).at(-1):null;}
