import test from 'node:test';
import assert from 'node:assert/strict';
import { Practice } from '../js/practice.js';
import { chord } from '../js/theory.js';
import { romanNumeral, PRESETS } from '../js/progressions.js';
import { savedProgressions, validSpec } from '../js/storage.js';
const spec={root:'C',quality:'major',octave:4,inversion:0,voicing:'close'};
test('practice matches written octaves, counts each note once, supports hints and reset',()=>{
  const p=new Practice(chord(spec).notes);
  assert.equal(p.attempt(72),false);assert.equal(p.mistakes,1);assert.equal(p.hint.fullName,'C4');
  p.attempt(67);p.attempt(67);assert.equal(p.found.size,1);assert.equal(p.complete,false);
  p.attempt(60);assert.equal(p.hint.fullName,'E4');p.attempt(64);assert.equal(p.complete,true);assert.match(p.progress,/Chord complete/);
  p.reset(chord(spec).notes);assert.equal(p.found.size,0);assert.equal(p.mistakes,0);
});
test('curated progressions are valid and Roman numerals reflect key, quality and chromatic spelling',()=>{
  for(const preset of PRESETS)assert.ok(preset.chords.every(validSpec));
  assert.deepEqual(PRESETS[0].chords.map(s=>romanNumeral(s,'C')),['I','vi','IV','V']);
  assert.deepEqual(PRESETS[4].chords.map(s=>romanNumeral(s,'Am')),['i','VI','iv','V7']);
  assert.equal(romanNumeral({...spec,root:'F#'},'C'),'♯IV');
  assert.equal(romanNumeral({...spec,root:'Bb'},'C'),'♭VII');
  assert.equal(romanNumeral(spec,''),'');
});
test('v1 named saves remain readable, with optional analysis key metadata preserved',()=>{
  globalThis.localStorage={getItem:()=>JSON.stringify([{name:'Legacy',chords:[spec]},{name:'New',key:'C',chords:[spec]}])};
  const saves=savedProgressions();assert.equal(saves.length,2);assert.equal(saves[0].name,'Legacy');assert.equal(saves[1].key,'C');
  delete globalThis.localStorage;
});
