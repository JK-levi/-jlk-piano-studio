import {read,write} from './storage.js';
import {validateComposition} from './composition-model.js';
export function compositions(){const rows=read('compositions-v1',[]);return Array.isArray(rows)?rows.filter(row=>{try{validateComposition(row);return true;}catch{return false;}}).slice(0,50):[];}
export function saveComposition(doc){validateComposition(doc);const rows=compositions(),index=rows.findIndex(row=>row.id===doc.id);if(index<0&&rows.length>=50)throw Error('You have 50 saved pieces. Back up and delete one before saving another.');if(index<0)rows.push(structuredClone(doc));else rows[index]=structuredClone(doc);if(!write('compositions-v1',rows))throw Error('Could not save. Allow local storage and download a JSON backup of your working piece.');}
export function removeComposition(id){if(!write('compositions-v1',compositions().filter(p=>p.id!==id)))throw Error('Could not delete the saved copy. Allow local storage and try again.');}
export function saveDraft(doc){return write('composition-draft-v1',doc);}
export function loadDraft(){try{return validateComposition(read('composition-draft-v1',null));}catch{return null;}}
