import {rhythmPlan,noteForPractice} from './weekly-model.js';
import {renderScore,highlightScore} from './score-renderer.js';
import {renderNotation} from './notation.js';
export function timedStudy(section,registers,variation=false){
 const plan=rhythmPlan(section,registers,{variation});
 plan.events.forEach((e,i)=>{e.id=`weekly-event-${i}`;});
 const written=[];
 for(const e of plan.events.filter(e=>!e.click)){
  const pitches=e.notes.map(n=>n.fullName),hand=e.hand==='lh'?'left':'right',beat=e.beat-4;
  if(e.duration===3.5){written.push({id:e.id,beat,duration:3,pitches,hand},{id:e.id+'-tie',beat:beat+3,duration:.5,pitches,hand},{id:e.id+'-rest',beat:beat+3.5,duration:.5,pitches:[],hand});}
  else written.push({id:e.id,beat,duration:e.duration,pitches,hand});
 }
 if(section.pattern==='country')section.rows.forEach((_,i)=>{for(const hand of ['left','right']){const hits=hand==='left'?[0,2]:[1,3];for(let half=0;half<8;half++)if(!hits.includes(half/2))written.push({id:`country-rest-${i}-${hand}-${half}`,beat:i*4+half/2,duration:.5,pitches:[],hand});}});
 else section.rows.forEach((_,i)=>[ [.5,1],[2,1],[3.5,.5] ].forEach(([at,duration],j)=>written.push({id:`rest-${i}-${j}`,beat:i*4+at,duration,pitches:[],hand:'right'})));
 return {plan,written};
}
export function drawWeeklyScore(container,section,registers,selected,mode,variation=false){
 container.hidden=mode==='notes';if(container.hidden)return;
 if(['synth-pop','country'].includes(section.pattern)){
  const {written}=timedStudy(section,registers,variation);renderScore(container,written,{measures:section.rows.length,labels:mode==='score-notes',title:'Practice-register rhythm'});
  container.querySelectorAll('[data-score-event$="-tie"]').forEach(tied=>{const first=container.querySelector(`[data-score-event="${tied.dataset.scoreEvent.replace('-tie','')}"]`);const svg=tied.ownerSVGElement;first.querySelectorAll('ellipse[data-midi]').forEach(note=>{const other=tied.querySelector(`ellipse[data-midi="${note.dataset.midi}"]`);if(!other)return;const x=Number(note.getAttribute('cx'))+8,end=Number(other.getAttribute('cx'))-8,y=Number(note.getAttribute('cy'))+8;const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',`M ${x} ${y} Q ${(x+end)/2} ${y+16} ${end} ${y}`);path.setAttribute('fill','none');path.setAttribute('stroke','#30312f');svg.append(path);});});
 }else{
  const row=section.rows[selected];renderNotation(container,['lh','rh'].flatMap(h=>row[h].map(n=>noteForPractice(n,registers[h]))),{labels:mode==='score-notes',figure:section.pattern==='sequence'});
 }
}
export function lightWeeklyScore(container,events,measure){highlightScore(container,events.flatMap(e=>[e,{...e,id:e.id+'-tie'}]));container.querySelectorAll('[data-measure]').forEach(n=>n.classList.toggle('active-measure',Number(n.dataset.measure)===measure));}
