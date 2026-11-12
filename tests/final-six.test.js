import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {validateLesson,mergeLessonContent,HISTORICAL_DATES,upsert,completeSection} from '../js/weekly-model.js';
import {readableLessonText} from '../js/weekly-presentation.js';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url))),all=read('data/weekly-lessons.json');
const dates=['2026-08-09','2026-08-16','2026-08-23','2026-09-13','2026-09-20','2026-09-27'];
test('final six exact originals preserved; prepared paired rows retained in original order',()=>{
 for(const date of dates){const l=all.find(l=>l.date===date),prepared=read(`data/weekly-sources/final-six/ready_to_import/weekly-${date}.json`);assert.equal(l.originalText,prepared.originalText);assert.deepEqual(validateLesson(l).errors,[]);assert.equal(l.id,`weekly-${date}`);
  for(const section of prepared.sections.filter(s=>s.rows.length))assert.deepEqual(l.sections.find(s=>s.id===section.id).rows,section.rows);
  for(const s of l.sections){assert.notEqual(s.pattern,'synth-pop');for(const row of s.rows)for(const n of [...row.lh,...row.rh])assert.doesNotMatch(n,/\d/);}
 }
 assert.deepEqual(all.map(l=>l.date),HISTORICAL_DATES);assert.equal(upsert(all,all[0]).length,18);
});
test('new verified paired voicings use the written order, not theoretical inversions',()=>{
 const aug16=all.find(l=>l.date==='2026-08-16').sections.find(s=>s.rows.length);assert.deepEqual(aug16.rows,[{lh:['E♭','B♭'],rh:['D♭','F','G♭']}]);
 const aug23=all.find(l=>l.date==='2026-08-23').sections.find(s=>s.id==='section-3');assert.deepEqual(aug23.rows[2],{lh:['B♭','F'],rh:['G♭','A♭','D♭']});
 assert.ok(!all.find(l=>l.date==='2026-08-09').sections.find(s=>s.id==='practice-2').rows.length);
});
test('adding six leaves personal records and custom lesson imports unchanged',()=>{
 const old=all.filter(l=>!dates.includes(l.date)),progress=Object.fromEntries(old.map(l=>[l.id,completeSection({favorite:true,completed:[],runs:[]},l,0)])),copy=structuredClone(progress);
 assert.equal(mergeLessonContent(all,old,old).length,18);assert.deepEqual(progress,copy);
 const custom={...old[0],goal:'My personal annotation'};assert.equal(mergeLessonContent(all,[custom],old).find(l=>l.id===custom.id).goal,custom.goal);
});
test('source export tokens become readable names without invented links',()=>{
 const raw='entity["song","Says"] by entity["artist","Nils Frahm"]. citeturn123 videoCountry drum backing 85bpmturn1';
 assert.equal(readableLessonText(raw),'Says by Nils Frahm.  Country drum backing 85bpm');
 for(const date of dates){const l=all.find(l=>l.date===date);assert.doesNotMatch(readableLessonText(l.originalText),/[]|turn\d/);}
});
