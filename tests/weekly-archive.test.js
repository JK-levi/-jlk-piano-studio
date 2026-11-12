import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateLesson,upsert,mergeLessonContent,HISTORICAL_DATES,rhythmPlan} from '../js/weekly-model.js';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url)));
const lessons=read('data/weekly-lessons.json'),previous=read('data/weekly-sources/previous-bundled.json');
test('all eighteen originals preserved byte for byte, valid and uniquely dated',()=>{
 assert.equal(lessons.length,18);assert.equal(new Set(lessons.map(l=>l.date)).size,18);
 for(const l of lessons){
  assert.equal(l.id,`weekly-${l.date}`);assert.deepEqual(validateLesson(l).errors,[]);
  if(['2026-08-09','2026-08-16','2026-08-23','2026-09-13','2026-09-20','2026-09-27'].includes(l.date)){assert.equal(l.originalText,read(`data/weekly-sources/final-six/ready_to_import/${l.id}.json`).originalText);continue;}
  assert.equal(l.originalText,fs.readFileSync(new URL(`../data/weekly-sources/originals/${l.id}.txt`,import.meta.url),'utf8'));
  assert.equal(upsert(lessons,l).length,18);
  if(l.date==='2026-11-08')continue;
  const prepared=read(`data/weekly-sources/ready_to_import/${l.id}.json`);
  if(l.date>'2026-08-02')assert.deepEqual(l.sections.map(s=>s.rows),prepared.sections.map(s=>s.rows));
  else {const shapes=l.sections.find(s=>s.id==='section-2').rows;assert.equal(shapes.length,3);for(const row of shapes){assert.deepEqual(row.rh,[]);assert.ok(l.originalText.replaceAll('–',' ').includes(row.lh.join(' '))||l.originalText.includes(row.lh.join('–'))||l.originalText.includes(row.lh.join(' – ')));}}
  for(const s of l.sections)if(s.rows.length){assert.ok(!s.pattern||s.pattern==='sequence');assert.ok(validateLesson(l).warnings.some(w=>w.includes('no source octave')));}
 }
 assert.deepEqual(HISTORICAL_DATES.filter(d=>!lessons.some(l=>l.date===d)),[]);
 assert.equal(upsert(lessons,lessons[0])[0].date,'2026-11-08');
});
test('November interactive sections, IDs, tempo and timing are unchanged',()=>{
 const before=previous.at(-1),after=lessons.at(-1);
 assert.deepEqual(after.sections,before.sections);assert.equal(after.bpm,90);
 assert.deepEqual(rhythmPlan(after.sections[3],{lh:3,rh:4},{variation:true}),rhythmPlan(before.sections[3],{lh:3,rh:4},{variation:true}));
});
test('legacy cached bundles upgrade without mutating imports or personal records',()=>{
 const copy=structuredClone(previous);assert.deepEqual(mergeLessonContent(lessons,copy,previous),lessons);assert.deepEqual(copy,previous);
 const custom={...previous[0],title:'My annotated lesson'};
 assert.equal(mergeLessonContent(lessons,[custom],previous).find(l=>l.id===custom.id).title,custom.title);
 for(const old of previous.slice(0,2))assert.ok(lessons.find(l=>l.id===old.id).sections.some(s=>s.id===old.sections[0].id));
});
