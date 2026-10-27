import test from 'node:test';import assert from 'node:assert/strict';
import {meter,positionLabel} from '../js/meter.js';
import {newComposition,insertEvent,meterCopy,compositionIssues,validateComposition,compositionPlan,deleteEvent,compositionEvents} from '../js/composition-model.js';
import {Playback} from '../js/playback.js';
const empty=signature=>({...newComposition(),timeSignature:signature});
const add=(doc,pitches,duration,hand='right',measure=0)=>insertEvent(doc,{hand,measure,pitches,duration});
test('simple and compound meters have correct capacity and pulse grouping',()=>{
 for(const [signature,quarters,pulses,pulseQuarters]of [[[4,4],4,4,1],[[3,4],3,3,1],[[6,8],3,2,1.5],[[12,8],6,4,1.5]]){
  const m=meter(signature);assert.equal(m.quarters,quarters);assert.equal(m.pulses,pulses);assert.equal(m.pulseQuarters,pulseQuarters);
  let doc=empty(signature);for(let i=0;i<quarters*2;i++)doc=add(doc,['C4'],.5);assert.equal(doc.measures[0].right.length,quarters*2);assert.equal(compositionPlan(doc).beats,pulses);assert.throws(()=>add(doc,['D4'],.5),new RegExp('Only 0 '+(signature[1]===8?'eighth-note units':'beats')));
 }
 assert.throws(()=>meter([5,4]),/Choose/);assert.match(positionLabel([6,8],2/3),/1-li/);assert.match(positionLabel([6,8],1),/2 of 2/);assert.match(positionLabel([12,8],4),/Measure 2/);
});
test('changing meter makes a distinct editable copy without re-barring or modifying note values',()=>{
 let original=add(add(empty([4,4]),['C4'],4),['C3'],4,'left');const before=JSON.stringify(original),copy=meterCopy(original,[3,4]);
 assert.notEqual(copy.id,original.id);assert.deepEqual(copy.measures,original.measures);assert.equal(copy.copyOf.id,original.id);assert.equal(compositionIssues(copy).length,2);assert.throws(()=>compositionPlan(copy),/overfilled/);assert.equal(JSON.stringify(original),before);
 let fixed=deleteEvent(copy,0,'right',copy.measures[0].right[0].id);fixed=add(fixed,['C4'],3);fixed=deleteEvent(fixed,0,'left',fixed.measures[0].left[0].id);fixed=add(fixed,['C3'],3,'left');assert.equal(validateComposition(fixed),fixed);assert.equal(JSON.stringify(original),before);
});
test('overflow retains explicit measure ownership for rendering and is never a playable plan',()=>{
 const doc=empty([12,8]);doc.measures.push({right:[],left:[]});let source=add(add(doc,['C4'],6),['D4'],1,'right',1);const copy=meterCopy(source,[3,4]);
 assert.deepEqual(compositionEvents(copy).map(e=>[e.measure,e.localBeat,e.duration]),[[0,0,6],[1,0,1]]);assert.throws(()=>compositionPlan(copy),/overfilled/);
});
test('compound plan uses dotted-quarter pulses and one shared playback clock',()=>{
 let doc=empty([6,8]);for(let i=0;i<6;i++)doc=add(doc,['C4'],.5);doc=add(doc,['C3'],3,'left');doc.metronome=true;
 const plan=compositionPlan(doc),tones=[],clicks=[];let now=0;
 const audio={now:()=>now,audibleTime:()=>now,isRunning:()=>true,silence(){},tone:(...args)=>tones.push(args),click:(...args)=>clicks.push(args)};
 const player=new Playback({audio,requestFrame:()=>1,cancelFrame(){},setTimer:()=>1,clearTimer(){}});player.start(plan,{bpm:120});for(let t=.05;t<1.2;t+=.05){now=t;player.schedule();}
 const right=tones.filter(t=>t[0]===60);assert.equal(right.length,6);for(let i=0;i<6;i++)assert.ok(Math.abs(right[i][1]-(.08+i/6))<1e-9);assert.equal(tones.find(t=>t[0]===48)[1],right[0][1]);assert.deepEqual(clicks.map(c=>c[1]),[true,false]);assert.equal(plan.beats,2);
});

test('invalid meter copies save/reload as drafts while originals and saved pieces remain intact',async()=>{
 const {saveComposition,preserveMeterOriginal,saveDraftCopy,saveDraft,loadDraft,compositions,draftCopies}=await import('../js/composition-storage.js');const data=new Map();globalThis.localStorage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
 try{
  const original=add(empty([4,4]),['C4'],4);saveComposition(original);const saved=JSON.parse(JSON.stringify(compositions()[0]));const preserved=preserveMeterOriginal(original);assert.equal(preserved.id,original.id);
  const copy=meterCopy(original,[3,4],preserved.id);saveDraftCopy(copy);saveDraft(copy);assert.deepEqual(loadDraft(),copy);assert.deepEqual(compositions()[0],saved);assert.equal(draftCopies().length,1);assert.throws(()=>saveComposition(copy),/overfilled/);
  const edited={...original,title:'Unsaved edit'};const archive=preserveMeterOriginal(edited);assert.notEqual(archive.id,original.id);assert.deepEqual(compositions().find(d=>d.id===original.id),saved);
  let fixed=deleteEvent(copy,0,'right',copy.measures[0].right[0].id);fixed=add(fixed,['C4'],3);saveComposition(fixed);assert.ok(compositions().some(d=>d.id===copy.id));assert.ok(!draftCopies().some(d=>d.id===copy.id));assert.deepEqual(compositions().find(d=>d.id===original.id),saved);
 }finally{delete globalThis.localStorage;}
});

test('legacy quarter-meter defaults remain copyable and malformed copy references are rejected',()=>{
 const legacy=newComposition();delete legacy.timeSignature;assert.deepEqual(meterCopy(legacy,[3,4]).copyOf.timeSignature,[4,4]);assert.throws(()=>validateComposition({...newComposition(),copyOf:'not a reference'}),/original-piece/);
});
