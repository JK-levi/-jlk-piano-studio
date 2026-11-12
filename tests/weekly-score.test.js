import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {timedStudy} from '../js/weekly-score.js';import {rhythmPlan} from '../js/weekly-model.js';
const l=JSON.parse(fs.readFileSync(new URL('../data/weekly-lessons.json',import.meta.url))).find(l=>l.date==='2026-11-08');
test('notation adaptation preserves scheduler events and fills both hands without invented attacks',()=>{
 for(const variation of [false,true]){const {plan,written}=timedStudy(l.sections[3],{lh:3,rh:4},variation);assert.deepEqual(plan.events.map(({id,...e})=>e),rhythmPlan(l.sections[3],{lh:3,rh:4},{variation}).events);
 for(let bar=0;bar<4;bar++)for(const hand of ['left','right'])assert.equal(written.filter(e=>e.hand===hand&&Math.floor(e.beat/4)===bar).reduce((s,e)=>s+e.duration,0),4);
 assert.equal(written.filter(e=>e.id.endsWith('-tie')).length,4);}
});
test('September country onsets and releases follow explicit beat-and instructions',()=>{
 const section={pattern:'country',rows:[{lh:['G','D'],rh:['B','D','G']}]};const {plan,written}=timedStudy(section,{lh:3,rh:4});
 assert.deepEqual(plan.events.filter(e=>!e.click).map(e=>[e.beat,e.duration,e.hand]),[[4,.5,'lh'],[5,.5,'rh'],[6,.5,'lh'],[7,.5,'rh']]);
 for(const hand of ['left','right'])assert.equal(written.filter(e=>e.hand===hand).reduce((n,e)=>n+e.duration,0),4);
});
