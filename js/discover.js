import { PRESETS, filterPresets } from './progressions.js';
import { chord,pretty } from './theory.js';
import { progressionPlan } from './exercises.js';
import { STUDIES,studyPlan } from './studies.js';
import { renderScore,highlightScore } from './score-renderer.js';
import { validTempo } from './feedback.js';
export function setupDiscover({audition,stop,feedback,renderKeyboard}){
 const $=id=>document.getElementById(id);
 function browse(){
  const matches=filterPresets($('browse-mood').value,$('browse-difficulty').value);$('browse-count').textContent=`${matches.length} progressions`;
  $('browse-cards').replaceChildren();
  for(const p of matches){
   const card=document.createElement('article');card.className='catalogue-card';
   const title=document.createElement('h3');title.textContent=p.name.split(' · ')[0];
   const meta=document.createElement('p');meta.className='eyebrow';meta.textContent=`${p.mood} · ${p.difficulty} · ${p.tempo} BPM`;
   const sequence=document.createElement('p');sequence.textContent=p.chords.map(s=>pretty(chord(s).symbol)).join(' – ');
   const hint=document.createElement('p');hint.className='subtle';hint.textContent=p.hint;
   const actions=document.createElement('div');actions.className='catalogue-actions';
   const hear=document.createElement('button');hear.textContent='Hear this progression';hear.addEventListener('click',()=>audition({plan:progressionPlan(p.chords),bpm:p.tempo,scope:'browse'}));
   const load=document.createElement('button');load.className='primary';load.textContent='Play along';load.addEventListener('click',()=>document.dispatchEvent(new CustomEvent('studio-use-preset',{detail:{index:p.index}})));
   actions.append(hear,load);card.append(meta,title,sequence,hint,actions);$('browse-cards').append(card);
  }
  if(!matches.length)$('browse-cards').textContent='No matches. Try a different feel or difficulty.';
 }
 $('browse-mood').addEventListener('change',browse);$('browse-difficulty').addEventListener('change',browse);$('browse-stop').addEventListener('click',()=>stop('browse'));browse();
 let active=STUDIES[0];
 STUDIES.forEach((s,i)=>{const option=document.createElement('option');option.value=s.id;option.textContent=`${i+1}. ${s.name}`;$('study-picker').append(option);});
 function draw(){renderScore($('bach-notation'),active.events,{measures:active.measures,labels:$('guided-labels').checked,title:active.name});}
 function open(){
  $('guided-title').textContent=active.name;$('guided-goal').textContent=active.goal;$('guided-notice').textContent=active.notice;
  const all=active.events.flatMap(e=>e.notes),unique=[...new Map(all.map(n=>[n.midi,n])).values()];renderKeyboard(unique);draw();
 }
 function play(){
  const bpm=Number($('study-tempo').value);
  if(!validTempo($('study-tempo').value)){feedback.show('bach',{id:'tempo',kind:'error',text:'Enter a tempo between 40 and 180 BPM.',field:'study-tempo'});return;}
  feedback.clear('bach','tempo');
  audition({plan:studyPlan(active),bpm,loop:$('study-loop').checked,scope:'bach',onFrame:events=>{
   highlightScore($('bach-notation'),events);
   const midis=new Set(events.flatMap(e=>e.notes.map(n=>n.midi)));document.querySelectorAll('#keyboard .key').forEach(key=>key.classList.toggle('sounding',midis.has(Number(key.dataset.midi))));
  }});
 }
 $('study-picker').addEventListener('change',()=>{stop('bach');active=STUDIES.find(s=>s.id===$('study-picker').value);$('study-tempo').value=active.tempo;open();});
 $('guided-labels').addEventListener('change',draw);
 $('next-study').addEventListener('click',()=>{$('study-picker').value=STUDIES[(STUDIES.indexOf(active)+1)%STUDIES.length].id;$('study-picker').dispatchEvent(new Event('change'));$('task-body').scrollTop=0;});
 return {open,play};
}
