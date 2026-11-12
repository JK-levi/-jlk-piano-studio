import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {mergeLessonContent,upsert,validateLesson} from '../js/weekly-model.js';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url)));
const current=read('data/weekly-lessons.json'),previous=read('data/weekly-sources/previous-bundled.json');
const base=JSON.parse(execFileSync('git',['show','7e8a2bc8948f82c29928723e77805436986d35d6:data/weekly-lessons.json'],{encoding:'utf8'}));
const personal={...structuredClone(base[0]),id:'weekly-my-august-practice',date:'2026-08-09',title:'My August bass study',originalText:'My handwritten bass study: LH D♭ + A♭ | RH F + C',sections:[{id:'my-shape',title:'My shape',instructions:'LH D♭ + A♭ | RH F + C',rows:[{lh:['D♭','A♭'],rh:['F','C']}]},{id:'my-repeat',title:'My repeat',instructions:'Repeat gently.',rows:[]}]};
test('startup reconciles same-date personal and canonical IDs without applying import collisions',()=>{
 assert.deepEqual(validateLesson(personal).errors,[]);
 const accepted=upsert(base,personal); // The real base archive has no August 9.
 assert.equal(accepted.length,13);
 const before=structuredClone(accepted),merged=mergeLessonContent(current,accepted,previous);
 assert.equal(merged.length,19);assert.equal(new Set(merged.map(l=>l.id)).size,19);
 assert.deepEqual(merged.find(l=>l.id===personal.id),personal);
 assert.deepEqual(merged.find(l=>l.id==='weekly-2026-08-09'),current.find(l=>l.id==='weekly-2026-08-09'));
 assert.deepEqual(accepted,before);
 assert.deepEqual(mergeLessonContent(current,accepted,previous),merged);
 assert.deepEqual(mergeLessonContent(current,merged,previous),merged);
 assert.throws(()=>upsert(current,personal),/already uses ID/); // Ordinary imports stay strict.
});
test('startup still upgrades old bundled copies and retains same-ID custom content',()=>{
 assert.deepEqual(mergeLessonContent(current,previous,previous),current);
 const custom={...structuredClone(current[0]),title:'My annotations',originalText:'My unchanged personal annotations'};
 const merged=mergeLessonContent(current,[custom],previous);assert.equal(merged.length,18);assert.deepEqual(merged.find(l=>l.id===custom.id),custom);
 assert.throws(()=>mergeLessonContent(current,[{...personal,sections:[]}],previous),/ordered sections/);
 for(const original of base)assert.deepEqual(current.find(l=>l.id===original.id),original);
});
test('same-date pair members can each be revised under their own unchanged ID and date',()=>{
 const archive=mergeLessonContent(current,upsert(base,personal),previous),before=structuredClone(archive);
 for(const id of [personal.id,'weekly-2026-08-09']){
  const original=archive.find(l=>l.id===id),revision=structuredClone(original);
  revision.title+=' — revised';revision.sections[0].instructions+=' Play slowly.';
  const updated=upsert(archive,revision);
  assert.equal(updated.length,19);assert.equal(new Set(updated.map(l=>l.id)).size,19);
  for(const record of archive)assert.deepEqual(updated.find(l=>l.id===record.id),record.id===id?revision:record);
 }
 assert.deepEqual(archive,before);
});
test('import still rejects new IDs and date moves onto occupied dates, validates revisions and accepts unused dates',()=>{
 const archive=mergeLessonContent(current,upsert(base,personal),previous),before=structuredClone(archive);
 assert.throws(()=>upsert(archive,{...personal,id:'weekly-new-collision'}),/already uses ID/);
 assert.throws(()=>upsert(archive,{...personal,date:'2026-08-16'}),/already uses ID/);
 const other=archive.find(l=>l.id==='weekly-2026-08-16');
 assert.throws(()=>upsert(archive,{...other,date:personal.date}),/already uses ID/);
 assert.throws(()=>upsert(archive,{...personal,title:''}),/title is required/);
 assert.throws(()=>upsert(archive,{...personal,sections:[]}),/ordered sections/);
 const moved={...personal,date:'2026-11-15'},added={...personal,id:'weekly-new-unused',date:'2026-11-22'};
 assert.equal(upsert(archive,moved).length,19);
 assert.deepEqual(upsert(archive,moved).find(l=>l.id===personal.id),moved);
 assert.equal(upsert(archive,added).length,20);
 assert.deepEqual(upsert(archive,added).find(l=>l.id===added.id),added);
 assert.deepEqual(archive,before);
});
