import { ROOTS, QUALITIES, chord, transpose, voiceLead, pretty, midiName, INTERVALS, toMidi, parseNote } from './theory.js';
import { renderNotation } from './notation.js';
import * as audio from './audio.js';
import { read, write, validSpec, savedProgressions } from './storage.js';
const $ = id => document.getElementById(id);
const base = {root:'C',quality:'major',octave:4,inversion:0,voicing:'close'};
const prefs=read('preferences',{});
let spec=validSpec(prefs?.spec)?prefs.spec:{...base};
let mode='explore', revealed=false, selected=0;
const make=(root,quality='major')=>({...base,root,quality,octave:3});
const presets=[ [make('C'),make('A','minor'),make('F'),make('G')], [make('C'),make('G'),make('A','minor'),make('F')], [make('C','major7'),make('A','minor9'),make('F','major7'),make('G','dominant7')] ];
const restored=read('session',null);
let progression=Array.isArray(restored)&&restored.length<=64&&restored.every(validSpec)?restored:structuredClone(presets[0]);
let saved=savedProgressions();
let timer=null, visualTimers=[], nextTick=0, nextAt=0, playing=false, paused=false, run=0, activeIndex=-1;
function message(text){$('status').textContent=text;}
function option(value,label){const n=document.createElement('option');n.value=value;n.textContent=label;return n;}
ROOTS.forEach(r=>$('root').append(option(r,pretty(r))));
Object.entries(QUALITIES).forEach(([id,q])=>$('quality').append(option(id,q.name)));
for(const id of ['staff-labels','key-labels','metronome','voice-leading']) if(typeof prefs?.[id]==='boolean') $(id).checked=prefs[id];
if(Number.isFinite(prefs?.tempo)) $('tempo').value=Math.min(180,Math.max(40,prefs.tempo));
if(['block','broken'].includes(prefs?.pattern)) $('pattern').value=prefs.pattern;
function persistPrefs(){const data={spec,tempo:tempo(),pattern:$('pattern').value};for(const id of ['staff-labels','key-labels','metronome','voice-leading'])data[id]=$(id).checked;write('preferences',data);}
function persistSession(){if(!write('session',progression))message('Device storage is unavailable. This session still works, but changes will not survive a reload.');}
function tempo(){return Math.min(180,Math.max(40,Number($('tempo').value)||80));}
function syncControls(){
  $('root').value=spec.root;$('quality').value=spec.quality;$('octave').value=spec.octave;$('voicing').value=spec.voicing;
  $('inversion').replaceChildren(...QUALITIES[spec.quality].steps.map((_,i)=>option(i,i===0?'Root position':`${['','1st','2nd','3rd','4th'][i]} inversion`)));
  $('inversion').value=spec.inversion;
}
function render(){
  syncControls();const c=chord(spec);
  const title=document.createTextNode(pretty(c.symbol));const quality=document.createElement('span');quality.textContent=c.quality.name;
  $('chord-heading').replaceChildren(title,quality);
  $('note-summary').textContent=c.notes.map(n=>pretty(n.fullName)).join(' · ');
  renderNotation($('notation'),c.notes,{labels:$('staff-labels').checked});
  $('voicing-description').textContent=`${spec.inversion?['','1st','2nd','3rd','4th'][spec.inversion]+' inversion':'Root position'} · ${spec.voicing==='open'?'Open':'Close'} voicing`;
  $('formula').textContent=c.quality.formula;
  $('intervals').textContent=c.quality.steps.map(i=>INTERVALS[i]).join(' · ');
  $('explanation').textContent=`${pretty(spec.root+c.quality.symbol)} = ${chord({...spec,inversion:0,voicing:'close'}).notes.map(n=>pretty(n.name)).join(', ')}. ${c.quality.description}`;
  renderKeyboard(c.notes);
  $('reveal').textContent=revealed?'Hide keys':'Reveal keys';
}
function renderKeyboard(notes){
  const min=Math.min(...notes.map(n=>n.midi)),max=Math.max(...notes.map(n=>n.midi));
  let start=Math.floor(min/12)*12;
  if(max>start+24 && min>=start+5)start+=5;
  const end=Math.max(start+24,max);
  const midis=Array.from({length:end-start+1},(_,i)=>i+start);
  const whites=midis.filter(m=>![1,3,6,8,10].includes(m%12));
  const highlighted=mode!=='practice'||revealed;
  const fragment=document.createDocumentFragment();
  for(const midi of midis){
    const black=[1,3,6,8,10].includes(midi%12);
    const note=notes.find(n=>n.midi===midi);
    const button=document.createElement('button');button.type='button';button.className=`key ${black?'black':'white'}${highlighted&&note?' selected':''}`;
    const name=highlighted&&note?note.fullName:midiName(midi,spec.root.includes('b'));
    button.setAttribute('aria-label',`Play ${pretty(name)}`);
    button.dataset.midi=midi;
    if(highlighted&&note&&$('key-labels').checked)button.textContent=pretty(note.fullName);
    else if(midi%12===0&&$('key-labels').checked)button.textContent=midiName(midi);
    if(black){const leftCount=whites.filter(m=>m<midi).length;button.style.left=`${(leftCount-.32)/whites.length*100}%`;button.style.width=`${.64/whites.length*100}%`;}
    button.addEventListener('pointerdown',e=>{e.preventDefault();button.classList.add('pressed');});
    for(const event of ['pointerup','pointercancel','pointerleave','blur'])button.addEventListener(event,()=>button.classList.remove('pressed'));
    button.addEventListener('click',()=>withAudio(()=>audio.tone(midi,audio.now(),1.1,0.22)));
    fragment.append(button);
  }
  $('keyboard').replaceChildren(fragment);
  $('keyboard-range').textContent=`${midiName(start)} — ${midiName(end)}`;
  $('keyboard-hint').textContent=highlighted?'Chord tones · tap any key to listen':'Keys hidden · find the chord on your piano';
}
async function withAudio(fn){try{await audio.unlock();fn();}catch(error){message(`Sound could not start: ${error.message}`);}}
function clearTiming(){clearInterval(timer);timer=null;visualTimers.forEach(clearTimeout);visualTimers=[];}
function transport(){ $('sequence-play').disabled=playing||!progression.length;$('sequence-play').textContent=paused?'Resume':'Play';$('sequence-pause').disabled=!playing; }
function stop({silent=false}={}){run++;clearTiming();audio.silence();playing=false;paused=false;nextTick=0;activeIndex=-1;transport();renderProgression();$('position').textContent='Ready to play';if(!silent)message('Playback stopped.');}
function changeSpec(){stop({silent:true});spec={root:$('root').value,quality:$('quality').value,octave:Number($('octave').value),inversion:Number($('inversion').value),voicing:$('voicing').value};spec.inversion=Math.min(spec.inversion,QUALITIES[spec.quality].steps.length-1);revealed=false;persistPrefs();render();}
for(const id of ['root','quality','inversion','octave','voicing'])$(id).addEventListener('change',changeSpec);
for(const id of ['staff-labels','key-labels'])$(id).addEventListener('change',()=>{persistPrefs();render();});
for(const id of ['tempo','pattern','metronome','voice-leading'])$(id).addEventListener('change',()=>{if(id==='tempo')$('tempo').value=tempo();if(playing||paused)stop({silent:true});persistPrefs();});
function setMode(value){stop({silent:true});mode=value;revealed=false;document.querySelectorAll('[data-mode]').forEach(b=>{const active=b.dataset.mode===mode;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active);});$('practice-banner').hidden=mode!=='practice';$('studio-panel').hidden=mode!=='studio';render();}
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
$('reveal').addEventListener('click',()=>{revealed=!revealed;render();});
$('next-chord').addEventListener('click',()=>{stop({silent:true});const keys=Object.keys(QUALITIES);spec={...spec,root:ROOTS[Math.floor(Math.random()*ROOTS.length)],quality:keys[Math.floor(Math.random()*keys.length)],inversion:0};revealed=false;persistPrefs();render();});
$('play-chord').addEventListener('click',()=>withAudio(()=>{stop({silent:true});audio.playNotes(chord(spec).notes);}));
$('play-arpeggio').addEventListener('click',()=>withAudio(()=>{stop({silent:true});audio.playNotes(chord(spec).notes,{arpeggio:true});}));
function actionButton(text,label,fn,disabled=false){const b=document.createElement('button');b.textContent=text;b.setAttribute('aria-label',label);b.disabled=disabled;b.addEventListener('click',fn);return b;}
function renderProgression(){
  $('progression').replaceChildren();
  progression.forEach((s,i)=>{
    const li=document.createElement('li');li.classList.toggle('current',i===selected);li.classList.toggle('sounding',i===activeIndex);
    const pick=actionButton(pretty(chord(s).symbol),`Select chord ${i+1}: ${pretty(chord(s).symbol)}`,()=>{stop({silent:true});selected=i;spec={...s};revealed=false;render();renderProgression();});pick.className='chord-select';pick.setAttribute('aria-pressed',i===selected);const count=document.createElement('span');count.textContent=String(i+1).padStart(2,'0');pick.append(count);
    const actions=document.createElement('div');actions.className='chord-actions';
    const edit=fn=>{stop({silent:true});fn();selected=Math.min(selected,progression.length-1);persistSession();renderProgression();};
    actions.append(actionButton('←',`Move chord ${i+1} earlier`,()=>edit(()=>{[progression[i-1],progression[i]]=[progression[i],progression[i-1]];selected=i-1;}),i===0),actionButton('→',`Move chord ${i+1} later`,()=>edit(()=>{[progression[i+1],progression[i]]=[progression[i],progression[i+1]];selected=i+1;}),i===progression.length-1),actionButton('⧉',`Duplicate chord ${i+1}`,()=>edit(()=>{if(progression.length<64)progression.splice(i+1,0,{...s});else message('A progression can contain up to 64 chords.');})),actionButton('×',`Remove chord ${i+1}`,()=>edit(()=>progression.splice(i,1))));
    li.append(pick,actions);$('progression').append(li);
  });
  if(!progression.length){const li=document.createElement('li');li.textContent='Choose a chord above, then add it here.';li.style.padding='16px';li.style.gridColumn='1 / -1';$('progression').append(li);}
  transport();
}
$('add-chord').addEventListener('click',()=>{if(progression.length>=64)return message('A progression can contain up to 64 chords.');stop({silent:true});progression.push({...spec});selected=progression.length-1;persistSession();setMode('studio');renderProgression();message(`${pretty(chord(spec).symbol)} added to your progression.`);});
$('load-preset').addEventListener('click',()=>{stop({silent:true});progression=structuredClone(presets[Number($('preset').value)]);selected=0;spec={...progression[0]};persistSession();render();renderProgression();message('Starting point loaded. Your named saves are unchanged.');});
$('clear-progression').addEventListener('click',()=>{stop({silent:true});progression=[];selected=0;persistSession();renderProgression();});
function transposition(amount){stop({silent:true});let previous=null;progression=progression.map(s=>{let next=transpose(s,amount);if($('voice-leading').checked)next=voiceLead(next,previous);previous=chord(next).notes;return next;});spec={...(progression[selected]||transpose(spec,amount))};persistSession();persistPrefs();render();renderProgression();message(`Progression transposed ${amount>0?'up':'down'} one semitone.`);}
$('transpose-up').addEventListener('click',()=>transposition(1));$('transpose-down').addEventListener('click',()=>transposition(-1));
function schedule(){
  if(!playing)return;
  const token=run, beat=60/tempo(), total=progression.length*8;
  while(nextAt<audio.now()+0.08){
    if(nextTick>=total){const delay=Math.max(0,(nextAt-audio.now())*1000);clearInterval(timer);timer=null;visualTimers.push(setTimeout(()=>{if(token!==run)return;stop({silent:true});$('position').textContent='Complete';message('Progression complete.');},delay));return;}
    const tick=nextTick,index=Math.floor(tick/8),within=tick%8;
    const s=progression[index], notes=chord(s).notes;
    if($('pattern').value==='block'&&within===0)audio.playNotes(notes,{at:nextAt,duration:beat*3.95});
    if($('pattern').value==='broken')audio.tone(notes[within%notes.length].midi,nextAt,beat*1.6,0.22);
    if($('metronome').checked&&within%2===0)audio.click(nextAt,within===0);
    visualTimers.push(setTimeout(()=>{if(token!==run)return;if(activeIndex!==index){activeIndex=index;selected=index;spec={...s};render();renderProgression();} $('position').textContent=`Chord ${index+1} of ${progression.length} · Beat ${Math.floor(within/2)+1}`;},Math.max(0,(nextAt-audio.now())*1000)));
    nextTick++;nextAt+=beat/2;
  }
}
$('sequence-play').addEventListener('click',()=>withAudio(()=>{
  if(!progression.length||playing)return;audio.silence();run++;activeIndex=-1;
  // Resume from the beginning of the paused chord so every tone is audible.
  nextTick=paused?Math.floor(Math.max(0,nextTick-1)/8)*8:0;
  playing=true;paused=false;nextAt=audio.now()+0.06;transport();schedule();timer=setInterval(schedule,25);
}));
$('sequence-pause').addEventListener('click',()=>{if(!playing)return;run++;clearTiming();audio.silence();playing=false;paused=true;transport();$('position').textContent='Paused · resumes this chord';message('Paused. Resume starts the current chord again.');});
$('sequence-stop').addEventListener('click',()=>stop());
function renderSaved(){const selectedValue=$('saved').value;$('saved').replaceChildren(option('','Choose a saved progression'),...saved.map((p,i)=>option(i,p.name)));if(saved[Number(selectedValue)]&&selectedValue!=='')$('saved').value=selectedValue;}
$('save-progression').addEventListener('click',()=>{
  const name=$('save-name').value.trim();if(!name)return message('Give your progression a name first.');if(!progression.length)return message('Add a chord before saving.');
  const entry={name,chords:structuredClone(progression)},index=saved.findIndex(p=>p.name===name);
  if(index===-1&&saved.length>=50)return message('Your device has 50 saved progressions. Delete one before adding another.');
  const updated=structuredClone(saved);if(index<0)updated.push(entry);else updated[index]=entry;
  if(write('progressions',updated)){saved=updated;renderSaved();$('saved').value=index<0?saved.length-1:index;message(`“${name}” saved on this device.`);}else message('Unable to save. Your browser may have disabled local storage.');
});
$('load-saved').addEventListener('click',()=>{const p=$('saved').value===''?null:saved[Number($('saved').value)];if(!p)return message('Choose a saved progression first.');stop({silent:true});progression=structuredClone(p.chords);spec={...progression[0]};selected=0;$('save-name').value=p.name;persistSession();render();renderProgression();message(`Opened “${p.name}”.`);});
$('delete-saved').addEventListener('click',()=>{if($('saved').value==='')return message('Choose a saved progression first.');const index=Number($('saved').value),updated=saved.filter((_,i)=>i!==index);if(write('progressions',updated)){saved=updated;renderSaved();message('Saved progression deleted. The current progression remains available.');}else message('Unable to update device storage.');});
const bachNotes=['C4','E4','G4','C5','E5'].map(fullName=>({...parseNote(fullName),name:fullName.slice(0,-1),fullName,midi:toMidi(fullName)}));
renderNotation($('bach-notation'),bachNotes,{figure:true});
$('bach').addEventListener('click',()=>{$('bach-panel').hidden=!$('bach-panel').hidden;if(!$('bach-panel').hidden)$('bach-panel').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});});
$('close-bach').addEventListener('click',()=>{$('bach-panel').hidden=true;$('bach').focus();});
$('play-bach').addEventListener('click',()=>withAudio(()=>{stop({silent:true});const figure=[0,1,2,3,4,2,3,4,0,1,2,3,4,2,3,4],at=audio.now();figure.forEach((n,i)=>audio.tone(bachNotes[n].midi,at+i*.23,n<2?1.8:0.55,0.2));}));
window.addEventListener('pagehide',()=>stop({silent:true}));
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop({silent:true});});
window.addEventListener('blur',()=>document.querySelectorAll('.key.pressed').forEach(k=>k.classList.remove('pressed')));
let installPrompt;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('install').hidden=false;});
$('install').addEventListener('click',async()=>{if(installPrompt){await installPrompt.prompt();installPrompt=null;$('install').hidden=true;}});
window.addEventListener('appinstalled',()=>{$('install').hidden=true;message('Studio installed.');});
const connection=()=>{$('connection').textContent=navigator.onLine?'PERSONAL STUDIO':'OFFLINE STUDIO';};
window.addEventListener('online',connection);window.addEventListener('offline',connection);connection();
if('serviceWorker' in navigator)navigator.serviceWorker.register(new URL('../service-worker.js',import.meta.url),{scope:new URL('../',import.meta.url).href}).catch(()=>message('Offline caching is unavailable. The studio still works while this page is open.'));
render();renderProgression();renderSaved();
