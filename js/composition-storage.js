import {read,write} from './storage.js';
import {validateComposition,validateEditableComposition,compositionIssues,newId} from './composition-model.js';
const SAVED='compositions-v1',DRAFTS='composition-meter-drafts-v1';
const rows=key=>{const value=read(key,[]);return Array.isArray(value)?value:[];};
const valid=(values,validate)=>values.filter(row=>{try{validate(row);return true;}catch{return false;}});
export function compositions(){return valid(rows(SAVED),validateComposition).slice(0,50);}
export function draftCopies(){return valid(rows(DRAFTS),validateEditableComposition).slice(0,50);}
export function editableCompositions(){const result=compositions(),ids=new Set(result.map(p=>p.id));return [...result,...draftCopies().filter(p=>!ids.has(p.id))];}
export function isDraftCopy(id){return !compositions().some(p=>p.id===id)&&draftCopies().some(p=>p.id===id);}
function checkRoom(id){const all=[...rows(SAVED),...rows(DRAFTS)],ids=new Set(all.map(p=>p?.id).filter(Boolean));if(!ids.has(id)&&ids.size>=50)throw Error('You have 50 saved pieces and draft copies. Back up and delete one before adding another.');}
function upsert(key,doc,message){checkRoom(doc.id);const values=rows(key),index=values.findIndex(p=>p?.id===doc.id);if(index<0)values.push(structuredClone(doc));else values[index]=structuredClone(doc);if(!write(key,values))throw Error(message);}
export function saveComposition(doc){
 validateComposition(doc);upsert(SAVED,doc,'Could not save. Allow local storage and download a JSON backup of your working piece.');
 const drafts=rows(DRAFTS);return {draftCleared:!drafts.some(p=>p?.id===doc.id)||write(DRAFTS,drafts.filter(p=>p?.id!==doc.id))};
}
export function saveDraftCopy(doc){validateEditableComposition(doc);upsert(DRAFTS,doc,'Could not save this draft copy. Keep the editor open and allow local storage before leaving.');}
export function preserveMeterOriginal(doc){
 validateEditableComposition(doc);const saved=editableCompositions().find(p=>p.id===doc.id);
 if(saved&&JSON.stringify(saved)===JSON.stringify(doc))return saved;
 const snapshot=structuredClone(doc);
 if(saved){snapshot.id=newId();snapshot.title=(doc.title.slice(0,76)+' · before meter change').slice(0,100);}
 if(compositionIssues(snapshot).length)saveDraftCopy(snapshot);else saveComposition(snapshot);
 return snapshot;
}
export function removeComposition(id){
 for(const key of [SAVED,DRAFTS]){const values=rows(key);if(values.some(p=>p?.id===id)&&!write(key,values.filter(p=>p?.id!==id)))throw Error('Could not delete the saved copy. Allow local storage and try again.');}
}
export function saveDraft(doc){validateEditableComposition(doc);return write('composition-draft-v1',doc);}
export function loadDraft(){try{return validateEditableComposition(read('composition-draft-v1',null));}catch{return null;}}
