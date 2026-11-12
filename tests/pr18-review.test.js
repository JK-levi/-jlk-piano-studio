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
