import test from 'node:test';
import assert from 'node:assert/strict';
import { Playback } from '../js/playback.js';
import { chordPlan, bachPlan, progressionPlan } from '../js/exercises.js';
import { PRESETS } from '../js/progressions.js';
import { chord } from '../js/theory.js';
const spec={root:'C',quality:'major',octave:4,inversion:0,voicing:'close'};
function setup(){
  let time=0,audible=0,running=true,next=0;const callbacks=new Map(),timers=new Map(),scheduled=[],frames=[];
  const audio={now:()=>time,audibleTime:()=>audible,isRunning:()=>running,silence(){},tone:(midi,at)=>scheduled.push({midi,at}),click(){}};
  const player=new Playback({audio,requestFrame:fn=>{callbacks.set(++next,fn);return next;},cancelFrame:id=>callbacks.delete(id),setTimer:fn=>{timers.set(++next,fn);return next;},clearTimer:id=>timers.delete(id)});
  return {player,scheduled,frames,options:{bpm:60,onFrame:(events,beat)=>frames.push({events,beat})},advance(t,a=t){time=t;audible=a;for(const fn of [...timers.values()])fn();const batch=[...callbacks.values()];callbacks.clear();batch.forEach(fn=>fn());},tick(t){time=t;for(const fn of [...timers.values()])fn();},interrupt(){running=false;},callbacks,timers};
}
test('lookahead schedules sound before visuals, and visuals follow audible clock rather than timer clock',()=>{
  const f=setup();f.player.start(chordPlan(chord(spec).notes,true),f.options);
  assert.equal(f.scheduled[0].at,.08);assert.equal(f.frames.at(-1).events.length,0);
  f.advance(.2,.05);assert.equal(f.frames.at(-1).events.length,0);
  f.advance(.3,.09);assert.equal(f.frames.at(-1).events[0].notes[0].midi,60);
  f.advance(.45,.4);f.advance(.6,.59);assert.equal(f.frames.at(-1).events[0].notes[0].midi,64);
  f.player.stop();assert.equal(f.frames.at(-1).events.length,0);assert.equal(f.callbacks.size,0);
  const count=f.scheduled.length;f.advance(10);assert.equal(f.scheduled.length,count);
});
test('loop repeats at exact plan boundary, remains bounded, and speed scales timestamps',()=>{
  const f=setup();f.player.start({beats:1,events:[{beat:0,duration:1,notes:[{midi:60}]}]},{...f.options,bpm:120,loop:true});
  for(let i=0;i<40;i++)f.advance(i*.1);
  assert.ok(f.scheduled.length>=8);assert.equal(f.scheduled[1].at,.58);assert.ok(f.player.queued.length<3);
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
test('all C–Am–F–G block chords reach the audio graph at four-beat intervals and visuals advance',()=>{
  const f=setup(),seen=[],visual=[];
  f.player.start(progressionPlan(PRESETS[0].chords),{...f.options,onScheduled:({event,at})=>seen.push({index:event.chordIndex,at}),onFrame:(events)=>{for(const e of events)if(!visual.includes(e.chordIndex))visual.push(e.chordIndex);}});
  for(let i=1;i<=325;i++)f.advance(i*.05);
  assert.deepEqual(seen.map(e=>e.index),[0,1,2,3]);
  assert.deepEqual(seen.map(e=>e.at),[.08,4.08,8.08,12.08]);
  assert.deepEqual(f.scheduled.map(e=>e.midi),[48,52,55,57,60,64,53,57,60,55,59,62]);
  assert.deepEqual(visual,[0,1,2,3]);assert.equal(f.player.running,false);assert.equal(f.timers.size,0);
});
test('audio scheduling proceeds without animation frames; future output timestamps cannot end the sequence',()=>{
  const f=setup();f.player.start(progressionPlan(PRESETS[0].chords),f.options);
  f.advance(.1,1000);assert.equal(f.player.running,true);
  for(let i=1;i<=240;i++)f.tick(i*.05);
  assert.equal(f.scheduled.length,12);f.player.stop();assert.equal(f.timers.size,0);
});
test('invalid tempo, empty plans and missing notes fail explicitly without idle timers',()=>{
  for(const [plan,bpm] of [[{beats:0,events:[]},80],[{beats:4,events:[{beat:0,duration:4}]},80],[chordPlan(chord(spec).notes),0]]){
    const f=setup();let error;f.player.start(plan,{bpm,onError:e=>error=e});assert.ok(error);assert.equal(f.player.running,false);assert.equal(f.timers.size,0);
  }
});

test('a graph scheduling exception fails once, clears visuals, and cancels both scheduling loops',()=>{
  const f=setup();let failures=0;f.player.audio.tone=()=>{throw new Error('Graph unavailable');};
  f.player.start(chordPlan(chord(spec).notes),{...f.options,onError:()=>failures++});
  assert.equal(failures,1);assert.equal(f.player.running,false);assert.equal(f.timers.size,0);assert.equal(f.callbacks.size,0);assert.equal(f.frames.at(-1).events.length,0);
});
