import test from 'node:test';
import assert from 'node:assert/strict';
import { chord, ROOTS, QUALITIES, transpose, toMidi, midiName, parseNote, voiceLead } from '../js/theory.js';
import { validSpec, savedProgressions, read, write } from '../js/storage.js';
import { staffPosition } from '../js/notation.js';
const base={root:'C',quality:'major',octave:4,inversion:0,voicing:'close'};
const names=s=>chord({...base,...s}).notes.map(n=>n.fullName);
test('major, minor and extended chord formulas',()=>{
  assert.deepEqual(names({}),['C4','E4','G4']);
  assert.deepEqual(names({root:'A',quality:'minor'}),['A4','C5','E5']);
  assert.deepEqual(names({quality:'major7'}),['C4','E4','G4','B4']);
  assert.deepEqual(names({root:'Bb',quality:'minor9',octave:3}),['Bb3','Db4','F4','Ab4','C5']);
  assert.deepEqual(names({quality:'minorMajor7'}),['C4','Eb4','G4','B4']);
});
test('enharmonic spelling follows letter degrees, including double accidentals',()=>{
  assert.deepEqual(names({root:'Ab',quality:'major7'}),['Ab4','C5','Eb5','G5']);
  assert.deepEqual(names({root:'C#'}),['C#4','E#4','G#4']);
  assert.deepEqual(names({root:'A#'}),['A#4','C##5','E#5']);
  assert.throws(()=>names({root:'Cb'}), /Invalid chord/);
});
test('all supported roots, qualities, octaves, voicings and inversions agree with MIDI',()=>{
  for(const root of ROOTS)for(const [quality,q] of Object.entries(QUALITIES))for(const octave of [2,3,4])for(const voicing of ['close','open'])for(let inversion=0;inversion<q.steps.length;inversion++){
    const c=chord({root,quality,octave,voicing,inversion});
    assert.equal(c.notes.length,q.steps.length);
    c.notes.forEach((n,i)=>{assert.equal(toMidi(n.fullName),n.midi,n.fullName);assert.equal(parseNote(n.name).pitchClass,n.midi%12);if(i)assert.ok(n.midi>c.notes[i-1].midi);});
    assert.deepEqual(c.notes.map(n=>n.midi%12).sort((a,b)=>a-b),q.steps.map(s=>(toMidi(root+octave)+s)%12).sort((a,b)=>a-b));
  }
});
test('inversions lift the bass and preserve written octave',()=>{
  assert.deepEqual(names({inversion:1}),['E4','G4','C5']);
  assert.deepEqual(names({inversion:2}),['G4','C5','E5']);
  assert.deepEqual(names({quality:'major9',inversion:4}),['D5','E5','G5','B5','C6']);
});
test('scientific octave conversion handles boundary accidentals',()=>{
  assert.equal(toMidi('C4'),60);assert.equal(toMidi('A4'),69);
  assert.equal(toMidi('B#3'),60);assert.equal(toMidi('Cb4'),59);assert.equal(toMidi('C##4'),62);
  assert.equal(midiName(60),'C4');assert.equal(midiName(70,true),'Bb4');
  assert.throws(()=>toMidi('C'));assert.throws(()=>toMidi('H4'));
});
test('transpose supports flat keys, negative offsets and pitch-class consistency',()=>{
  assert.equal(transpose({...base,root:'Bb'},2).root,'C');
  assert.equal(transpose(base,-1).root,'B');
  assert.equal(transpose({...base,root:'F'},1).root,'Gb');
  for(const root of ROOTS)for(const quality of Object.keys(QUALITIES))for(const shift of [-13,-1,1,7,12]){
    const s={...base,root,quality};const before=chord(s),after=chord(transpose(s,shift));
    assert.deepEqual(after.notes.map(n=>n.midi%12).sort((a,b)=>a-b),before.notes.map(n=>((n.midi+shift)%12+12)%12).sort((a,b)=>a-b));
  }
});
test('smooth voice leading chooses a valid close voicing near previous chord',()=>{
  const previous=chord({...base,octave:3}).notes;
  const next=voiceLead({...base,root:'F'},previous);
  assert.ok(validSpec(next));assert.deepEqual(chord(next).notes.map(n=>n.fullName),['C3','F3','A3']);
});
test('staff coordinates use diatonic, not chromatic steps',()=>{
  assert.equal(staffPosition(parseNote('C4'),'treble'),116);
  assert.equal(staffPosition(parseNote('E4'),'treble'),106);
  assert.equal(staffPosition(parseNote('F5'),'treble'),66);
  assert.equal(staffPosition(parseNote('G2'),'bass'),206);
  assert.equal(staffPosition(parseNote('A3'),'bass'),166);
  assert.equal(staffPosition(parseNote('Bb3'),'bass'),staffPosition(parseNote('B3'),'bass'));
});
test('storage tolerates corrupt data, unavailable storage and invalid chord shapes',()=>{
  assert.equal(validSpec({...base,octave:900}),false);
  assert.equal(validSpec({...base,inversion:99}),false);
  assert.equal(validSpec({...base,quality:'constructor'}),false);
  globalThis.localStorage={getItem:()=>'{bad',setItem:()=>{throw new Error('blocked');}};
  assert.deepEqual(read('test',[]),[]);assert.equal(write('test',{}),false);
  globalThis.localStorage={getItem:()=>JSON.stringify([{name:'Valid',chords:[base]},{name:'Bad',chords:[{}]}])};
  assert.equal(savedProgressions().length,1);delete globalThis.localStorage;
});
