import test from 'node:test';
import assert from 'node:assert/strict';
import {lessonTitle,practiceRegisters,instructionBlocks} from '../js/weekly-presentation.js';
test('display titles omit week prefixes without changing source titles',()=>{assert.equal(lessonTitle('Week 10 — Cinematic Piano'),'Cinematic Piano');assert.equal(lessonTitle('Layers That Breathe'),'Layers That Breathe');});
test('practice registers default safely and restore validated hand choices',()=>{for(const raw of [null,'bad','{}','null','[]'])assert.deepEqual(practiceRegisters(raw),{lh:3,rh:4});assert.deepEqual(practiceRegisters('{"lh":2,"rh":5}'),{lh:2,rh:5});assert.deepEqual(practiceRegisters('{"lh":0,"rh":"5"}'),{lh:3,rh:4});});
test('presentation removes duplicate hand lines only, preserving musical guidance and source',()=>{const section={rows:[{lh:['C'],rh:['E']}],instructions:'LH: C | RH: E\n\nHold until beat 4.\nRelease together.\n\nTry a quieter repeat.'},before=structuredClone(section);assert.deepEqual(instructionBlocks(section),['Hold until beat 4.\nRelease together.','Try a quieter repeat.']);assert.deepEqual(section,before);});
