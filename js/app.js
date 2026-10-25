import { ROOTS, QUALITIES, chord, transpose, voiceLead, pretty, midiName, INTERVALS } from './theory.js';
import { renderNotation, renderExercise } from './notation.js';
import * as audio from './audio.js';
import { read, write, validSpec, savedProgressions } from './storage.js';
import { Playback } from './playback.js';
import { chordPlan, bachPlan, bachNotes, brokenEvents, progressionPlan } from './exercises.js';
import { Practice } from './practice.js';
import { PRESETS, romanNumeral } from './progressions.js';
const $ = id => document.getElementById(id);
const base = {root:'C',quality:'major',octave:4,inversion:0,voicing:'close'};
const prefs=read('preferences',{});
let spec=validSpec(prefs?.spec)?prefs.spec:{...base};
let mode='explore', revealed=false, selected=0;
const presets=PRESETS.map(p=>p.chords);
const restored=read('session',null);
let progression=Array.isArray(restored)&&restored.length<=64&&restored.every(validSpec)?restored:structuredClone(presets[0]);
let saved=savedProgressions();
let playing=false, paused=false, activeIndex=-1, audioRequest=0;
let studyKind='chord', activePlayback=null, pausedChord=0, practiceSignature='', hintMidi=null;
const practice=new Practice();
const player=new Playback({audio});
function message(text){$('status').textContent=text;}
function option(value,label){const n=document.createElement('option');n.value=value;n.textContent=label;return n;}
ROOTS.forEach(r=>$('root').append(option(r,pretty(r))));
$('preset').replaceChildren(...PRESETS.map((p,i)=>option(i,p.name)));
for(const key of ROOTS) for(const minor of [false,true]) $('analysis-key').append(option(key+(minor?'m':''), pretty(key)+(minor?' minor':' major')));
const setKey=value=>{$('analysis-key').value=Array.from($('analysis-key').options).some(o=>o.value===value)?value:'';};
setKey(read('session-key','C'));
Object.entries(QUALITIES).forEach(([id,q])=>$('quality').append(option(id,q.name)));
for(const id of ['staff-labels','key-labels','metronome','voice-leading','study-loop','sequence-loop']) if(typeof prefs?.[id]==='boolean') $(id).checked=prefs[id];
if(Number.isFinite(prefs?.tempo)) $('tempo').value=Math.min(180,Math.max(40,prefs.tempo));
if(Number.isFinite(prefs?.studyTempo)) $('study-tempo').value=Math.min(180,Math.max(40,prefs.studyTempo));
if(['block','broken'].includes(prefs?.pattern)) $('pattern').value=prefs.pattern;
function persistPrefs(){const data={spec,tempo:tempo(),pattern:$('pattern').value,studyTempo:studyTempo()};for(const id of ['staff-labels','key-labels','metronome','voice-leading','study-loop','sequence-loop'])data[id]=$(id).checked;write('preferences',data);}
function persistSession(){write('session-key',$('analysis-key').value);if(!write('session',progression))message('Device storage is unavailable. This session still works, but changes will not survive a reload.');}
function tempo(){return Math.min(180,Math.max(40,Number($('tempo').value)||80));}
function studyTempo(){return Math.min(180,Math.max(40,Number($('study-tempo').value)||80));}
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
  const signature=JSON.stringify(spec);
  if(signature!==practiceSignature){practice.reset(c.notes);practiceSignature=signature;hintMidi=null;}
  renderSheet(c.notes); updatePractice();
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
    button.classList.toggle('found',mode==='practice'&&practice.found.has(midi));
    button.classList.toggle('hint',mode==='practice'&&hintMidi===midi);
    button.addEventListener('click',()=>{
      stop({silent:true});
      if(mode==='practice') { const correct=practice.attempt(midi);hintMidi=null;updatePractice(correct?'Good note.':'Try another key; match the written octave.');renderKeyboard(chord(spec).notes); }
      withAudio(()=>startPlayback({beats:1,events:[{notes:[{midi}],beat:0,duration:1}]},'key'));
    });
    fragment.append(button);
  }
  $('keyboard').replaceChildren(fragment);
  $('keyboard-range').textContent=`${midiName(start)} — ${midiName(end)}`;
  $('keyboard-hint').textContent=highlighted?'Chord tones · tap any key to listen':'Keys hidden · find the chord on your piano';
}
function withAudio(fn,options={}){
  if(player.running&&!audio.isRunning())stop({silent:true});
  const ticket=++audioRequest;
  // unlock is invoked immediately, not after an await, timer, or animation.
  audio.unlock(options).then(()=>{if(ticket===audioRequest&&!document.hidden)fn();}).catch(error=>{$('audio-status').textContent=error.message;$('audio-status').classList.add('audio-error');message(`Sound could not start: ${error.message}`);});
}
audio.subscribe(status=>{
  if(status.state==='running'&&status.message.startsWith('Audio engine ready')&&$('audio-status').textContent.startsWith('Test signal sent'))return;
  $('audio-status').textContent=status.message;
  $('audio-status').classList.toggle('audio-error',status.error);
  if(status.state!=='running'&&player.running) stop({silent:true});
});
function clearHighlights(){document.querySelectorAll('.sounding').forEach(node=>node.classList.remove('sounding'));}
function syncHighlights(events){
  const midis=new Set(events.flatMap(event=>event.notes.map(n=>n.midi)));
  document.querySelectorAll('.key[data-midi]').forEach(key=>key.classList.toggle('sounding',midis.has(Number(key.dataset.midi))&&(mode!=='practice'||revealed||activePlayback==='key')));
  document.querySelectorAll('.notehead').forEach(note=>{
    const inBach=!!note.closest('#bach-notation');
    const relevant=activePlayback==='bach'?inBach:!inBach;
    const matching=events.some(event=>event.notes.some(n=>n.midi===Number(note.dataset.midi))&&(note.dataset.eventIndex===undefined||event.noteIndex===Number(note.dataset.eventIndex)));
    note.classList.toggle('sounding',relevant&&matching);
  });
}
function renderSheet(notes=chord(spec).notes){
  const broken=studyKind==='arpeggio'||(activePlayback==='progression'&&$('pattern').value==='broken');
  if(broken)renderExercise($('notation'),brokenEvents(notes),{labels:$('staff-labels').checked});
  else renderNotation($('notation'),notes,{labels:$('staff-labels').checked});
  $('sheet-caption').textContent=broken?'EIGHTH-NOTE STUDY · 4/4':'YOUR CHORD, ON THE PAGE';
}
function updatePractice(feedback=''){
  $('practice-progress').textContent=practice.progress+(feedback?' · '+feedback:'');
}
function startPlayback(plan,kind,{fromBeat=0}={}){
  activePlayback=kind;
  const isSequence=kind==='progression';
  const loop=kind!=='key'&&(isSequence?$('sequence-loop').checked:$('study-loop').checked);
  player.start(plan,{bpm:kind==='key'?100:isSequence?tempo():studyTempo(),loop,fromBeat,
    onFrame(events,beat){
      if(beat===null){clearHighlights();return;}
      if(isSequence){
        const index=Math.min(progression.length-1,Math.floor(beat/4));pausedChord=index;
        if(index!==activeIndex){activeIndex=index;selected=index;spec={...progression[index]};render();renderProgression();}
        $('position').textContent=`Chord ${index+1} of ${progression.length} · Beat ${Math.floor(beat%4)+1}${loop?' · Loop':''}`;
      }else if(kind!=='key')$('study-position').textContent=`Beat ${Math.floor(beat%4)+1}${loop?' · Loop':''}`;
      syncHighlights(events);
    },
    onEnd(){if(kind==='bach')renderKeyboard(chord(spec).notes);playing=false;activePlayback=null;activeIndex=-1;transport();renderProgression();if(isSequence)$('position').textContent='Complete';else $('study-position').textContent='Complete';},
    onError(error){playing=false;paused=false;activePlayback=null;activeIndex=-1;transport();renderProgression();$('audio-status').textContent=error.message;$('audio-status').classList.add('audio-error');message(error.message);}
  });
}
function playStudy(kind){
  stop({silent:true});studyKind=kind;
  if(kind==='bach'){$('bach-panel').hidden=false;renderKeyboard(bachNotes);renderExercise($('bach-notation'),bachPlan().events,{labels:$('staff-labels').checked});}
  else render();
  startPlayback(kind==='bach'?bachPlan():chordPlan(chord(spec).notes,kind==='arpeggio'),kind);
}
function transport(){ $('sequence-play').disabled=playing||!progression.length;$('sequence-play').textContent=paused?'Resume':'Play';$('sequence-pause').disabled=!playing; }
function stop({silent=false}={}){audioRequest++;player.stop();playing=false;paused=false;activePlayback=null;activeIndex=-1;clearHighlights();transport();renderProgression();$('position').textContent='Ready to play';$('study-position').textContent='Ready';if(!silent)message('Playback stopped.');}
$('test-sound').addEventListener('click',()=>{stop({silent:true});withAudio(()=>{startPlayback({beats:2,events:[{notes:[{midi:60}],beat:0,duration:1},{notes:[{midi:64}],beat:1,duration:1}]},'key');$('audio-status').textContent='Test signal sent: C4 then E4. If silent, check volume/output and Recover audio.';});});
$('recover-audio').addEventListener('click',()=>{stop({silent:true});withAudio(()=>{$('audio-status').textContent='Audio engine recreated. Tap Test Sound to check your output.';},{reset:true});});
$('study-stop').addEventListener('click',()=>{stop();renderKeyboard(chord(spec).notes);});
$('replay').addEventListener('click',()=>withAudio(()=>playStudy(studyKind)));
for(const id of ['study-tempo','study-loop','sequence-loop'])$(id).addEventListener('change',()=>{stop({silent:true});$('study-tempo').value=studyTempo();persistPrefs();});
$('analysis-key').addEventListener('change',()=>{stop({silent:true});persistSession();renderProgression();});
$('practice-hint').addEventListener('click',()=>{hintMidi=practice.hint?.midi??null;updatePractice(practice.hint?`Try ${pretty(practice.hint.fullName)}.`:'All notes found.');renderKeyboard(chord(spec).notes);});
$('practice-reset').addEventListener('click',()=>{stop({silent:true});practice.reset(chord(spec).notes);hintMidi=null;revealed=false;render();});
function changeSpec(){stop({silent:true});spec={root:$('root').value,quality:$('quality').value,octave:Number($('octave').value),inversion:Number($('inversion').value),voicing:$('voicing').value};spec.inversion=Math.min(spec.inversion,QUALITIES[spec.quality].steps.length-1);revealed=false;studyKind='chord';persistPrefs();render();}
for(const id of ['root','quality','inversion','octave','voicing'])$(id).addEventListener('change',changeSpec);
for(const id of ['staff-labels','key-labels'])$(id).addEventListener('change',()=>{stop({silent:true});persistPrefs();render();renderExercise($('bach-notation'),bachPlan().events,{labels:$('staff-labels').checked});});
for(const id of ['tempo','pattern','metronome','voice-leading'])$(id).addEventListener('change',()=>{if(id==='tempo')$('tempo').value=tempo();if(playing||paused)stop({silent:true});persistPrefs();});
function setMode(value){stop({silent:true});mode=value;revealed=false;studyKind='chord';practiceSignature='';document.querySelectorAll('[data-mode]').forEach(b=>{const active=b.dataset.mode===mode;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active);});$('practice-banner').hidden=mode!=='practice';$('studio-panel').hidden=mode!=='studio';render();}
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
$('reveal').addEventListener('click',()=>{revealed=!revealed;render();});
$('next-chord').addEventListener('click',()=>{stop({silent:true});practiceSignature='';const keys=Object.keys(QUALITIES);spec={...spec,root:ROOTS[Math.floor(Math.random()*ROOTS.length)],quality:keys[Math.floor(Math.random()*keys.length)],inversion:0};revealed=false;persistPrefs();render();});
$('play-chord').addEventListener('click',()=>withAudio(()=>playStudy('chord')));
$('play-arpeggio').addEventListener('click',()=>withAudio(()=>playStudy('arpeggio')));
function actionButton(text,label,fn,disabled=false){const b=document.createElement('button');b.textContent=text;b.setAttribute('aria-label',label);b.disabled=disabled;b.addEventListener('click',fn);return b;}
function renderProgression(){
  $('progression').replaceChildren();
  progression.forEach((s,i)=>{
    const li=document.createElement('li');li.classList.toggle('current',i===selected);li.classList.toggle('sounding',i===activeIndex);
    const pick=actionButton(pretty(chord(s).symbol),`Select chord ${i+1}: ${pretty(chord(s).symbol)}`,()=>{stop({silent:true});selected=i;spec={...s};revealed=false;render();renderProgression();});pick.className='chord-select';pick.setAttribute('aria-pressed',i===selected);const count=document.createElement('span');count.textContent=String(i+1).padStart(2,'0');pick.append(count);const roman=document.createElement('small');roman.className='roman';roman.textContent=romanNumeral(s,$('analysis-key').value);pick.append(roman);
    const actions=document.createElement('div');actions.className='chord-actions';
    const edit=fn=>{stop({silent:true});fn();selected=Math.min(selected,progression.length-1);persistSession();renderProgression();};
    actions.append(actionButton('←',`Move chord ${i+1} earlier`,()=>edit(()=>{[progression[i-1],progression[i]]=[progression[i],progression[i-1]];selected=i-1;}),i===0),actionButton('→',`Move chord ${i+1} later`,()=>edit(()=>{[progression[i+1],progression[i]]=[progression[i],progression[i+1]];selected=i+1;}),i===progression.length-1),actionButton('⧉',`Duplicate chord ${i+1}`,()=>edit(()=>{if(progression.length<64)progression.splice(i+1,0,{...s});else message('A progression can contain up to 64 chords.');})),actionButton('×',`Remove chord ${i+1}`,()=>edit(()=>progression.splice(i,1))));
    li.append(pick,actions);$('progression').append(li);
  });
  if(!progression.length){const li=document.createElement('li');li.textContent='Choose a chord above, then add it here.';li.style.padding='16px';li.style.gridColumn='1 / -1';$('progression').append(li);}
  transport();
}
$('add-chord').addEventListener('click',()=>{if(progression.length>=64)return message('A progression can contain up to 64 chords.');stop({silent:true});progression.push({...spec});selected=progression.length-1;persistSession();setMode('studio');renderProgression();message(`${pretty(chord(spec).symbol)} added to your progression.`);});
$('load-preset').addEventListener('click',()=>{stop({silent:true});progression=structuredClone(presets[Number($('preset').value)]);setKey(PRESETS[Number($('preset').value)].key);selected=0;spec={...progression[0]};persistSession();render();renderProgression();message('Starting point loaded. Your named saves are unchanged.');});
$('clear-progression').addEventListener('click',()=>{stop({silent:true});progression=[];selected=0;persistSession();renderProgression();});
function transposition(amount){stop({silent:true});const key=$('analysis-key').value;if(key){const minor=key.endsWith('m');setKey(transpose({...base,root:minor?key.slice(0,-1):key},amount).root+(minor?'m':''));}let previous=null;progression=progression.map(s=>{let next=transpose(s,amount);if($('voice-leading').checked)next=voiceLead(next,previous);previous=chord(next).notes;return next;});spec={...(progression[selected]||transpose(spec,amount))};persistSession();persistPrefs();render();renderProgression();message(`Progression transposed ${amount>0?'up':'down'} one semitone.`);}
$('transpose-up').addEventListener('click',()=>transposition(1));$('transpose-down').addEventListener('click',()=>transposition(-1));
$('sequence-play').addEventListener('click',()=>withAudio(()=>{
  if(!progression.length||playing)return;
  const fromBeat=paused?pausedChord*4:0;
  stop({silent:true});playing=true;paused=false;studyKind='chord';activeIndex=-1;transport();
  startPlayback(progressionPlan(progression,{broken:$('pattern').value==='broken',metronome:$('metronome').checked}),'progression',{fromBeat});
}));
$('sequence-pause').addEventListener('click',()=>{if(!playing)return;audioRequest++;player.stop();playing=false;paused=true;activePlayback=null;activeIndex=-1;transport();renderProgression();$('position').textContent='Paused · resumes this chord';message('Paused. Resume starts the current chord again.');});
$('sequence-stop').addEventListener('click',()=>{stop();renderKeyboard(chord(spec).notes);});
function renderSaved(){const selectedValue=$('saved').value;$('saved').replaceChildren(option('','Choose a saved progression'),...saved.map((p,i)=>option(i,p.name)));if(saved[Number(selectedValue)]&&selectedValue!=='')$('saved').value=selectedValue;}
$('save-progression').addEventListener('click',()=>{
  const name=$('save-name').value.trim();if(!name)return message('Give your progression a name first.');if(!progression.length)return message('Add a chord before saving.');
  const entry={name,key:$('analysis-key').value,chords:structuredClone(progression)},index=saved.findIndex(p=>p.name===name);
  if(index===-1&&saved.length>=50)return message('Your device has 50 saved progressions. Delete one before adding another.');
  const updated=structuredClone(saved);if(index<0)updated.push(entry);else updated[index]=entry;
  if(write('progressions',updated)){saved=updated;renderSaved();$('saved').value=index<0?saved.length-1:index;message(`“${name}” saved on this device.`);}else message('Unable to save. Your browser may have disabled local storage.');
});
$('load-saved').addEventListener('click',()=>{const p=$('saved').value===''?null:saved[Number($('saved').value)];if(!p)return message('Choose a saved progression first.');stop({silent:true});progression=structuredClone(p.chords);setKey(p.key||'');spec={...progression[0]};selected=0;$('save-name').value=p.name;persistSession();render();renderProgression();message(`Opened “${p.name}”.`);});
$('delete-saved').addEventListener('click',()=>{if($('saved').value==='')return message('Choose a saved progression first.');const index=Number($('saved').value),updated=saved.filter((_,i)=>i!==index);if(write('progressions',updated)){saved=updated;renderSaved();message('Saved progression deleted. The current progression remains available.');}else message('Unable to update device storage.');});
renderExercise($('bach-notation'),bachPlan().events);
$('bach').addEventListener('click',()=>{$('bach-panel').hidden=!$('bach-panel').hidden;if($('bach-panel').hidden&&activePlayback==='bach'){stop({silent:true});renderKeyboard(chord(spec).notes);}if(!$('bach-panel').hidden)$('bach-panel').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});});
$('close-bach').addEventListener('click',()=>{if(activePlayback==='bach')stop({silent:true});$('bach-panel').hidden=true;$('bach').focus();renderKeyboard(chord(spec).notes);});
$('play-bach').addEventListener('click',()=>withAudio(()=>playStudy('bach')));
window.addEventListener('pageshow',()=>audio.refreshStatus());
window.addEventListener('pagehide',()=>stop({silent:true}));
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop({silent:true});else audio.refreshStatus();});
window.addEventListener('blur',()=>document.querySelectorAll('.key.pressed').forEach(k=>k.classList.remove('pressed')));
let installPrompt;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('install').hidden=false;});
$('install').addEventListener('click',async()=>{if(installPrompt){await installPrompt.prompt();installPrompt=null;$('install').hidden=true;}});
window.addEventListener('appinstalled',()=>{$('install').hidden=true;message('Studio installed.');});
const connection=()=>{$('connection').textContent=navigator.onLine?'PERSONAL STUDIO':'OFFLINE STUDIO';};
window.addEventListener('online',connection);window.addEventListener('offline',connection);connection();
if('serviceWorker' in navigator)navigator.serviceWorker.register(new URL('../service-worker.js',import.meta.url),{scope:new URL('../',import.meta.url).href,updateViaCache:'none'}).then(registration=>{
  const notify=()=>{if(registration.waiting)message('Studio update downloaded. Close all Studio windows and Home Screen instances, then reopen to use it.');};
  notify();registration.addEventListener('updatefound',()=>registration.installing?.addEventListener('statechange',notify));
}).catch(()=>message('Offline caching is unavailable. The studio still works while this page is open.'));
render();renderProgression();renderSaved();
