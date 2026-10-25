import test from 'node:test';
import assert from 'node:assert/strict';
import { createAudioEngine } from '../js/audio.js';
function fixture({mode='normal',state='suspended'}={}) {
  const log=[], contexts=[];
  const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
  const node=()=>({connect(){},disconnect(){},gain:param(),frequency:param(),Q:param(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param()});
  class Context {
    constructor(){this.state=state;this.currentTime=10;this.sampleRate=44100;this.baseLatency=.02;this.destination={};contexts.push(this);log.push('construct');}
    createGain(){return node();} createDynamicsCompressor(){return node();} createBiquadFilter(){return node();}
    createBuffer(){return {};}
    createBufferSource(){return {...node(),start:()=>log.push('prime')};}
    createOscillator(){return {...node(),start:at=>log.push(['tone',at]),stop:()=>log.push('stop')};}
    resume(){log.push('resume');if(mode==='reject')return Promise.reject(new Error('Denied'));if(mode==='hang')return new Promise(()=>{});if(mode!=='same')this.state='running';return Promise.resolve();}
    close(){this.state='closed';return Promise.resolve();}
  }
  const platform={AudioContext:Context,navigator:{audioSession:{}},performance:{now:()=>1000}};
  return {engine:createAudioEngine({host:()=>platform,timeout:20}),log,contexts,platform};
}
test('creates, primes and invokes resume synchronously inside the initial call',async()=>{
  const {engine,log,platform}=fixture();assert.deepEqual(log,[]);
  const ready=engine.unlock();assert.deepEqual(log,['construct','prime','resume']);
  await ready;assert.equal(engine.isRunning(),true);assert.equal(platform.navigator.audioSession.type,'playback');
  engine.tone(60,10.2,1);assert.equal(log.filter(e=>e[0]==='tone').length,4);
  assert.ok(log.filter(e=>e[0]==='tone').every(e=>e[1]===10.2));
  engine.silence();assert.equal(log.filter(e=>e==='stop').length,8);
});
test('reuses concurrent unlock, resumes interruption, recreates closed or explicitly reset contexts',async()=>{
  const {engine,contexts}=fixture();const first=engine.unlock();assert.equal(engine.unlock(),first);await first;
  contexts[0].state='interrupted';await engine.unlock();assert.equal(contexts.length,1);assert.equal(engine.isRunning(),true);
  contexts[0].state='closed';await engine.unlock();assert.equal(contexts.length,2);
  await engine.unlock({reset:true});assert.equal(contexts.length,3);assert.equal(contexts[1].state,'closed');
});
test('suspended, rejected, missing and timed-out audio report errors instead of silently playing nothing',async()=>{
  for(const mode of ['same','reject','hang']){
    const {engine}=fixture({mode});const status=[];engine.subscribe(s=>status.push(s));
    await assert.rejects(engine.unlock());assert.equal(status.at(-1).error,true);
    assert.throws(()=>engine.tone(60),/not running/);
  }
  const engine=createAudioEngine({host:()=>({})});await assert.rejects(engine.unlock(),/unavailable/);
});
test('reports state changes and uses output timestamp or latency-adjusted audio clock',async()=>{
  const {engine,contexts}=fixture();const status=[];engine.subscribe(s=>status.push(s));await engine.unlock();
  assert.equal(engine.audibleTime(),9.98);
  contexts[0].getOutputTimestamp=()=>({contextTime:9,performanceTime:900});assert.equal(engine.audibleTime(),9.1);
  contexts[0].state='interrupted';contexts[0].onstatechange();assert.match(status.at(-1).message,/interrupted/);
});
