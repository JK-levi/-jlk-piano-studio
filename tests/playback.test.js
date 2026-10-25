import test from 'node:test';
import assert from 'node:assert/strict';
import { Playback } from '../js/playback.js';
import { chordPlan, bachPlan, progressionPlan } from '../js/exercises.js';
import { chord } from '../js/theory.js';
const spec={root:'C',quality:'major',octave:4,inversion:0,voicing:'close'};
function setup(){
  let time=0,audible=0,running=true,next=0;const callbacks=new Map(),scheduled=[],frames=[];
  const audio={now:()=>time,audibleTime:()=>audible,isRunning:()=>running,silence(){},tone:(midi,at)=>scheduled.push({midi,at}),click(){}};
  const player=new Playback({audio,requestFrame:fn=>{callbacks.set(++next,fn);return next;},cancelFrame:id=>callbacks.delete(id)});
  return {player,scheduled,frames,options:{bpm:60,onFrame:(events,beat)=>frames.push({events,beat})},advance(t,a=t){time=t;audible=a;const batch=[...callbacks.values()];callbacks.clear();batch.forEach(fn=>fn());},interrupt(){running=false;},callbacks};
}
test('lookahead schedules sound before visuals, and visuals follow audible clock rather than timer clock',()=>{
  const f=setup();f.player.start(chordPlan(chord(spec).notes,true),f.options);
  assert.equal(f.scheduled[0].at,.06);assert.equal(f.frames.at(-1).events.length,0);
  f.advance(.2,.05);assert.equal(f.frames.at(-1).events.length,0);
  f.advance(.3,.07);assert.equal(f.frames.at(-1).events[0].notes[0].midi,60);
  f.advance(.6,.57);assert.equal(f.frames.at(-1).events[0].notes[0].midi,64);
  f.player.stop();assert.equal(f.frames.at(-1).events.length,0);assert.equal(f.callbacks.size,0);
  const count=f.scheduled.length;f.advance(10);assert.equal(f.scheduled.length,count);
});
test('loop repeats at exact plan boundary, remains bounded, and speed scales timestamps',()=>{
  const f=setup();f.player.start({beats:1,events:[{beat:0,duration:1,notes:[{midi:60}]}]},{...f.options,bpm:120,loop:true});
  for(let i=0;i<40;i++)f.advance(i*.1);
  assert.ok(f.scheduled.length>=8);assert.equal(f.scheduled[1].at,.56);assert.ok(f.player.queued.length<3);
  assert.equal(f.player.running,true);f.player.stop();
});
test('completion and interruption clear active notes; replay does not duplicate scheduled callbacks',()=>{
  const f=setup();let ended=0,error;
  const plan={beats:1,events:[{beat:0,duration:1,notes:[{midi:60}]}]};
  f.player.start(plan,{...f.options,onEnd:()=>ended++});f.advance(1.1);
  assert.equal(ended,1);assert.equal(f.player.running,false);assert.equal(f.frames.at(-1).events.length,0);
  f.player.start(plan,f.options);f.player.start(plan,{...f.options,onError:e=>error=e});
  assert.equal(f.callbacks.size,1);f.interrupt();f.advance(1.2);assert.match(error.message,/interrupted/);assert.equal(f.player.running,false);
});
test('exercise durations fill measures; Bach study keeps exact pitches; sequence resume excludes previous chords',()=>{
  const notes=chord(spec).notes;
  assert.equal(chordPlan(notes,true).events.reduce((s,e)=>s+e.duration,0),4);
  const bach=bachPlan();assert.equal(bach.beats,8);assert.deepEqual(bach.events.slice(0,8).map(e=>e.notes[0].fullName),['C4','E4','G4','C5','E5','G4','C5','E5']);
  const plan=progressionPlan([spec,{...spec,root:'F'}],{broken:true,metronome:true});
  assert.equal(plan.events.filter(e=>e.click).length,8);
  const f=setup();f.player.start(plan,{...f.options,fromBeat:4});assert.equal(f.scheduled[0].midi,65);
});
