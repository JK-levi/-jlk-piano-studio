import { ROOTS, QUALITIES, chord, transpose, voiceLead, pretty, midiName, INTERVALS } from './theory.js';
import { renderNotation, renderExercise } from './notation.js';
import * as audio from './audio.js';
import { read, write, validSpec, savedProgressions } from './storage.js';
import { Playback } from './playback.js';
import { chordPlan, bachPlan, bachNotes, brokenEvents, progressionPlan } from './exercises.js';
import { Practice } from './practice.js';
import { PRESETS, romanNumeral } from './progressions.js';
import { setupComposer } from './composer.js';
import { setupDiscover } from './discover.js';
import { preserveSequence,latestDraft } from './sequence-drafts.js';
import { Feedback, validTempo } from './feedback.js';
import { bindLayout, setExperience, openView, closeView, currentView, returnToWorkspace } from './layout.js';
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
const feedback=new Feedback();
bindLayout();
let sequenceName=read('session-name',null);
if(typeof sequenceName!=='string'||sequenceName.length>60)sequenceName=PRESETS.find(p=>JSON.stringify(p.chords)===JSON.stringify(progression))?.name.split(' · ')[0]||'Your progression';
let activeScope=null,pendingScope=null;
const playbackStates=new Map();
function message(text,{scope=mode==='studio'?'studio':mode==='practice'?'practice':'study',kind='info',id='notice'}={}){feedback.show(scope,{kind,id,text});}
function playbackStatus(scope,state,detail=''){
  playbackStates.set(scope,state);
  const target={sequence:'position',study:'study-position',bach:'bach-position',practice:'practice-position',audio:'audio-playback-status',browse:'browse-position',composition:'composition-position'}[scope];
  if(target){$(target).textContent=state+(detail?' · '+detail:'');$(target).dataset.state=state;}
  if(scope==='practice'){$('study-position').textContent=state+(detail?' · '+detail:'');$('study-position').dataset.state=state;}
}
function checkTempo(field,scope){
  if(validTempo($(field).value)){const invalid=$(field).hasAttribute('aria-invalid');feedback.clear(scope,'tempo');if(invalid&&!feedback.entries.has(`${scope}:audio`))playbackStatus(scope,'Stopped');return true;}
  playbackStatus(scope,'Failed');
  feedback.show(scope,{id:'tempo',kind:'error',text:'Invalid tempo. Enter a whole-number value between 40 and 180 BPM.',field});
  return false;
}
function playbackFailure(error,scope=activeScope||pendingScope||'study'){
  audioRequest++;player.stop();playing=false;paused=false;activePlayback=null;activeScope=null;pendingScope=null;activeIndex=-1;
  transport();renderProgression();playbackStatus(scope,'Failed');
  $('audio-status').textContent=error.message;
  feedback.show(scope,{id:'audio',kind:'error',text:'Unable to start or continue audio. Open Sound settings, tap Recover audio, then try Play again.',action:{label:'Sound settings',run:()=>openView('sound-settings')}});
}

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
function persistPrefs(){const data={spec,tempo:validTempo($('tempo').value)?tempo():read('preferences',{}).tempo||80,pattern:$('pattern').value,studyTempo:validTempo($('study-tempo').value)?studyTempo():read('preferences',{}).studyTempo||80};for(const id of ['staff-labels','key-labels','metronome','voice-leading','study-loop','sequence-loop'])data[id]=$(id).checked;write('preferences',data);}
function persistSession(){write('session-name',sequenceName);write('session-key',$('analysis-key').value);if(!write('session',progression))message('Device storage is unavailable. This session still works, but changes will not survive a reload.',{kind:'warning',id:'storage'});}
function tempo(){return Number($('tempo').value);}
function studyTempo(){return Number($('study-tempo').value);}
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
  $('editor-chord-name').textContent=`${pretty(c.symbol)} · ${c.notes.map(n=>pretty(n.fullName)).join(', ')}`;
  const signature=JSON.stringify(spec);
  if(signature!==practiceSignature){practice.reset(c.notes);practiceSignature=signature;hintMidi=null;}
  renderSheet(c.notes); updatePractice();
  $('voicing-description').textContent=`${spec.inversion?['','1st','2nd','3rd','4th'][spec.inversion]+' inversion':'Root position'} · ${spec.voicing==='open'?'Open':'Close'} voicing`;
  $('formula').textContent=c.quality.formula;
  $('intervals').textContent=c.quality.steps.map(i=>INTERVALS[i]).join(' · ');
  $('explanation').textContent=`${pretty(spec.root+c.quality.symbol)} = ${chord({...spec,inversion:0,voicing:'close'}).notes.map(n=>pretty(n.name)).join(', ')}. ${c.quality.description}`;
  renderKeyboard(c.notes);
  $('reveal').textContent=revealed?'Hide keys':'Reveal keys';
  $('bach-tempo-description').textContent=`${$('study-tempo').value||'—'} BPM`;
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
      withAudio(()=>startPlayback({beats:1,events:[{notes:[{midi}],beat:0,duration:1}]},'key',{scope:mode==='practice'?'practice':'keyboard'}),{scope:mode==='practice'?'practice':'keyboard'});
    });
    fragment.append(button);
  }
  $('keyboard').replaceChildren(fragment);
  $('keyboard-range').textContent=`${midiName(start)} — ${midiName(end)}`;
  $('keyboard-hint').textContent=highlighted?'Chord tones · tap any key to listen':'Keys hidden · find the chord on your piano';
}
function withAudio(fn,{scope=mode==='practice'?'practice':'study',reset=false}={}){
  stop({silent:true});
  const ticket=++audioRequest;pendingScope=scope;playbackStatus(scope,'Starting');
  const ready=()=>{if(ticket!==audioRequest||document.hidden)return;pendingScope=null;fn();};
  const failed=error=>{if(ticket===audioRequest)playbackFailure(error,scope);};
  // A running engine can schedule synchronously during the tap. Only a suspended
  // engine waits for resume; state notifications must not cancel that request.
  if(audio.isRunning()&&!reset){try{ready();}catch(error){failed(error);}return;}
  audio.unlock({reset}).then(ready).catch(failed);
}
audio.subscribe(status=>{
  $('audio-status').textContent=status.message;
  if(status.state!=='running'&&player.running)playbackFailure(new Error(status.message),activeScope);
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
  $('practice-meter').max=practice.notes.length||1;$('practice-meter').value=practice.found.size;
}
function startPlayback(plan,kind,{fromBeat=0,scope=kind==='progression'?'sequence':kind==='bach'?'bach':kind==='key'?'keyboard':mode==='practice'?'practice':'study'}={}){
  activePlayback=kind;activeScope=scope;
  const isSequence=kind==='progression';
  const loop=kind!=='key'&&(isSequence?$('sequence-loop').checked:$('study-loop').checked);
  player.start(plan,{bpm:kind==='key'?100:isSequence?tempo():studyTempo(),loop,fromBeat,
    onScheduled({count}){if(count===1){feedback.clear(scope,'audio');playbackStatus(scope,'Playing');}},
    onFrame(events,beat){
      if(beat===null){clearHighlights();return;}
      if(isSequence){
        const index=Math.min(progression.length-1,Math.floor(beat/4));pausedChord=index;
        if(index!==activeIndex){activeIndex=index;selected=index;spec={...progression[index]};render();renderProgression();}
        if(player.scheduled)playbackStatus(scope,'Playing',`Chord ${index+1} of ${progression.length} · Beat ${Math.floor(beat%4)+1}${loop?' · Loop':''}`);
      }else if(kind!=='key'&&player.scheduled)playbackStatus(scope,'Playing',`Beat ${Math.floor(beat%4)+1}${loop?' · Loop':''}`);
      syncHighlights(events);
    },
    onEnd(){if(kind==='bach')renderKeyboard(currentView()==='bach-panel'?bachNotes:chord(spec).notes);playing=false;activePlayback=null;activeScope=null;activeIndex=-1;transport();renderProgression();playbackStatus(scope,'Complete');},
    onError(error){playbackFailure(error,scope);}
  });
  return player.running;
}

function playStudy(kind){
  stop({silent:true});studyKind=kind;
  if(kind==='bach'){renderKeyboard(bachNotes);renderExercise($('bach-notation'),bachPlan().events,{labels:$('staff-labels').checked});}
  else render();
  startPlayback(kind==='bach'?bachPlan():chordPlan(chord(spec).notes,kind==='arpeggio'),kind);
}
function transport(){
  $('sequence-play').disabled=playing||!progression.length||pendingScope==='sequence';
  $('sequence-play').textContent=paused?'Resume':'Play';$('sequence-pause').disabled=!playing;
  $('sequence-empty').hidden=progression.length>0;
  $('sequence-play').setAttribute('aria-describedby',progression.length?'position':'sequence-empty position');
}
function stop({silent=false}={}){
  const scope=activeScope||pendingScope;
  audioRequest++;player.stop();playing=false;paused=false;activePlayback=null;activeScope=null;pendingScope=null;activeIndex=-1;
  clearHighlights();transport();renderProgression();
  if(scope&&(!silent||playbackStates.get(scope)!=='Failed'))playbackStatus(scope,'Stopped');
}
$('test-sound').addEventListener('click',()=>withAudio(()=>{
  if(startPlayback({beats:2,events:[{notes:[{midi:60}],beat:0,duration:1},{notes:[{midi:64}],beat:1,duration:1}]},'key',{scope:'audio'}))
    message('Test notes scheduled: C4 then E4. If silent, check media volume and output route.',{scope:'audio',id:'test'});
},{scope:'audio'}));
$('recover-audio').addEventListener('click',()=>withAudio(()=>{feedback.clear('audio','audio');playbackStatus('audio','Stopped');message('Audio engine running. Tap Test Sound to check your output; device audibility is unverified.',{scope:'audio',kind:'success'});},{scope:'audio',reset:true}));
$('study-stop').addEventListener('click',()=>{stop();playbackStatus(studyKind==='bach'?'bach':mode==='practice'?'practice':'study','Stopped');renderKeyboard(chord(spec).notes);});
function requestStudy(kind){
  const scope=kind==='bach'?'bach':mode==='practice'?'practice':'study';
  if(!checkTempo('study-tempo',scope))return;
  withAudio(()=>playStudy(kind),{scope});
}
$('replay').addEventListener('click',()=>currentView()==='bach-panel'?guided.play():requestStudy(studyKind));
$('study-tempo').addEventListener('change',()=>{stop({silent:true});if(checkTempo('study-tempo',currentView()==='bach-panel'?'bach':mode==='practice'?'practice':'study'))persistPrefs();$('bach-tempo-description').textContent=`${$('study-tempo').value||'—'} BPM`;});
for(const id of ['study-loop','sequence-loop'])$(id).addEventListener('change',()=>{stop({silent:true});persistPrefs();});
$('analysis-key').addEventListener('change',()=>{stop({silent:true});persistSession();renderProgression();});
$('practice-hint').addEventListener('click',()=>{hintMidi=practice.hint?.midi??null;updatePractice(practice.hint?`Try ${pretty(practice.hint.fullName)}.`:'All notes found.');renderKeyboard(chord(spec).notes);});
$('practice-reset').addEventListener('click',()=>{stop({silent:true});practice.reset(chord(spec).notes);hintMidi=null;revealed=false;render();});
function changeSpec(){stop({silent:true});spec={root:$('root').value,quality:$('quality').value,octave:Number($('octave').value),inversion:Number($('inversion').value),voicing:$('voicing').value};spec.inversion=Math.min(spec.inversion,QUALITIES[spec.quality].steps.length-1);revealed=false;studyKind='chord';persistPrefs();render();}
for(const id of ['root','quality','inversion','octave','voicing'])$(id).addEventListener('change',changeSpec);
for(const id of ['staff-labels','key-labels'])$(id).addEventListener('change',()=>{stop({silent:true});persistPrefs();render();renderExercise($('bach-notation'),bachPlan().events,{labels:$('staff-labels').checked});});
for(const id of ['tempo','pattern','metronome','voice-leading'])$(id).addEventListener('change',()=>{stop({silent:true});if(id!=='tempo'||checkTempo('tempo','sequence'))persistPrefs();});
function setMode(value){stop({silent:true});mode=value;revealed=false;studyKind='chord';practiceSignature='';setExperience(mode);$('practice-banner').hidden=mode!=='practice';$('studio-panel').hidden=mode!=='studio';if(mode==='studio'&&progression[selected])spec={...progression[selected]};render();}
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
$('reveal').addEventListener('click',()=>{revealed=!revealed;render();});
$('next-chord').addEventListener('click',()=>{stop({silent:true});practiceSignature='';const keys=Object.keys(QUALITIES);spec={...spec,root:ROOTS[Math.floor(Math.random()*ROOTS.length)],quality:keys[Math.floor(Math.random()*keys.length)],inversion:0};revealed=false;persistPrefs();render();});
$('play-chord').addEventListener('click',()=>requestStudy('chord'));
$('play-arpeggio').addEventListener('click',()=>requestStudy('arpeggio'));
function actionButton(text,label,fn,disabled=false){const b=document.createElement('button');b.textContent=text;b.setAttribute('aria-label',label);b.disabled=disabled;b.addEventListener('click',fn);return b;}
function renderProgression(){
  $('studio-title').textContent=sequenceName;
  const keyLabel=$('analysis-key').selectedOptions[0]?.textContent||'No defined key';
  $('progression-key').textContent=`${keyLabel} · ${progression.length} ${progression.length===1?'chord':'chords'}`;
  $('progression').replaceChildren();
  progression.forEach((s,i)=>{
    const li=document.createElement('li');li.classList.toggle('current',i===selected);li.classList.toggle('sounding',i===activeIndex);
    const pick=actionButton(pretty(chord(s).symbol),`Select chord ${i+1}: ${pretty(chord(s).symbol)}`,()=>{stop({silent:true});selected=i;spec={...s};revealed=false;render();renderProgression();});pick.className='chord-select';pick.setAttribute('aria-pressed',i===selected);const count=document.createElement('span');count.textContent=String(i+1).padStart(2,'0');pick.append(count);const roman=document.createElement('small');roman.className='roman';roman.textContent=romanNumeral(s,$('analysis-key').value);pick.append(roman);
    const actions=document.createElement('div');actions.className='chord-actions';
    const edit=fn=>{stop({silent:true});fn();selected=Math.min(selected,progression.length-1);persistSession();renderProgression();};
    actions.append(actionButton('←',`Move chord ${i+1} earlier`,()=>edit(()=>{[progression[i-1],progression[i]]=[progression[i],progression[i-1]];selected=i-1;}),i===0),actionButton('→',`Move chord ${i+1} later`,()=>edit(()=>{[progression[i+1],progression[i]]=[progression[i],progression[i+1]];selected=i+1;}),i===progression.length-1),actionButton('⧉',`Duplicate chord ${i+1}`,()=>edit(()=>{if(progression.length<64)progression.splice(i+1,0,{...s});else message('A progression can contain up to 64 chords. Remove a chord before adding another.',{scope:'studio',kind:'warning',id:'limit'});})),actionButton('×',`Remove chord ${i+1}`,()=>edit(()=>progression.splice(i,1))));
    li.append(pick,actions);$('progression').append(li);
  });
  if(!progression.length){const li=document.createElement('li');li.textContent='Choose a chord above, then add it here.';li.style.padding='16px';li.style.gridColumn='1 / -1';$('progression').append(li);}
  transport();
}
$('add-chord').addEventListener('click',()=>{if(progression.length>=64)return message('A progression can contain up to 64 chords. Remove a chord before adding another.',{scope:'studio',kind:'warning',id:'limit'});stop({silent:true});progression.push({...spec});selected=progression.length-1;persistSession();setMode('studio');if(currentView()==='chord-editor')closeView();renderProgression();message(`${pretty(chord(spec).symbol)} added to your progression.`,{scope:'studio',kind:'success'});});
function loadBuiltIn(index){
 const backup=preserveSequence(progression,sequenceName,$('analysis-key').value,PRESETS,saved);
 if(!backup.ok){feedback.show('studio',{id:'draft',kind:'error',text:'Your unsaved sequence could not be backed up. Save it in My progressions before loading another.'});return false;}
 stop({silent:true});progression=structuredClone(PRESETS[index].chords);sequenceName=PRESETS[index].name.split(' · ')[0];setKey(PRESETS[index].key);selected=0;spec={...progression[0]};$('tempo').value=PRESETS[index].tempo;
 persistSession();render();renderProgression();feedback.clear('studio','draft');
 if(backup.preserved)feedback.show('studio',{id:'draft',kind:'info',text:'Your unsaved sequence is preserved in My progressions → Restore latest unsaved draft.'});
 return true;
}
$('load-preset').addEventListener('click',()=>loadBuiltIn(Number($('preset').value)));
$('restore-draft').addEventListener('click',()=>{const draft=latestDraft();if(!draft)return;
 const backup=preserveSequence(progression,sequenceName,$('analysis-key').value,PRESETS,saved);if(!backup.ok){feedback.show('save',{id:'draft',kind:'error',text:'Save your current sequence before restoring a draft.'});return;}
 stop({silent:true});progression=structuredClone(draft.chords);sequenceName=draft.name;setKey(draft.key||'');selected=0;spec={...progression[0]};persistSession();render();renderProgression();message('Draft restored.',{scope:'save',kind:'success'});
});
document.addEventListener('studio-use-preset',event=>withAudio(()=>{
 if(!loadBuiltIn(event.detail.index))return;
 document.addEventListener('studio-view-change',function ready(e){if(e.detail.next===null){document.removeEventListener('studio-view-change',ready);$('sequence-play').click();}});
 returnToWorkspace();
},{scope:'browse'}));
$('clear-progression').addEventListener('click',()=>{stop({silent:true});progression=[];sequenceName='Your progression';selected=0;persistSession();renderProgression();});
function transposition(amount){stop({silent:true});const key=$('analysis-key').value;if(key){const minor=key.endsWith('m');setKey(transpose({...base,root:minor?key.slice(0,-1):key},amount).root+(minor?'m':''));}let previous=null;progression=progression.map(s=>{let next=transpose(s,amount);if($('voice-leading').checked)next=voiceLead(next,previous);previous=chord(next).notes;return next;});spec={...(progression[selected]||transpose(spec,amount))};persistSession();persistPrefs();render();renderProgression();message(`Progression transposed ${amount>0?'up':'down'} one semitone.`);}
$('transpose-up').addEventListener('click',()=>transposition(1));$('transpose-down').addEventListener('click',()=>transposition(-1));
$('sequence-play').addEventListener('click',()=>{
  if(!progression.length){feedback.show('sequence',{kind:'warning',id:'empty',text:'No chords loaded. Choose a progression and tap Load to begin.'});return;}
  if(!checkTempo('tempo','sequence')||playing)return;
  feedback.clear('sequence','empty');
  const fromBeat=paused?pausedChord*4:0;
  withAudio(()=>{
    playing=true;paused=false;studyKind='chord';activeIndex=-1;transport();
    startPlayback(progressionPlan(progression,{broken:$('pattern').value==='broken',metronome:$('metronome').checked}),'progression',{fromBeat});
  },{scope:'sequence'});
  transport();
});
$('sequence-pause').addEventListener('click',()=>{
  if(!playing)return;audioRequest++;player.stop();playing=false;paused=true;activePlayback=null;activeScope=null;activeIndex=-1;
  transport();renderProgression();playbackStatus('sequence','Paused','Resume restarts this chord');
});
$('sequence-stop').addEventListener('click',()=>{stop();playbackStatus('sequence','Stopped');renderKeyboard(chord(spec).notes);});
function renderSaved(){const selectedValue=$('saved').value;$('saved').replaceChildren(option('','Choose a saved progression'),...saved.map((p,i)=>option(i,p.name)));if(saved[Number(selectedValue)]&&selectedValue!=='')$('saved').value=selectedValue;updateSavedActions();}
function updateSavedActions(){const none=$('saved').value==='';$('load-saved').disabled=none;$('delete-saved').disabled=none;const draft=latestDraft();$('restore-draft').disabled=!draft;$('draft-description').textContent=draft?`Recoverable draft: ${draft.name}`:'No unsaved sequence drafts yet.';}
$('saved').addEventListener('change',updateSavedActions);
$('save-progression').addEventListener('click',()=>{
  const name=$('save-name').value.trim();if(!name)return feedback.show('save',{id:'name',kind:'error',text:'Name required. Enter a name before saving your progression.',field:'save-name'});feedback.clear('save','name');if(!progression.length)return feedback.show('save',{id:'chords',kind:'warning',text:'No chords to save. Load a starting point or add a chord above.'});
  feedback.clear('save','name');feedback.clear('save','chords');
  const entry={name,key:$('analysis-key').value,chords:structuredClone(progression)},index=saved.findIndex(p=>p.name===name);
  if(index===-1&&saved.length>=50)return message('Your device has 50 saved progressions. Delete one before adding another.',{scope:'save',kind:'warning',id:'limit'});
  const updated=structuredClone(saved);if(index<0)updated.push(entry);else updated[index]=entry;
  if(write('progressions',updated)){sequenceName=name;persistSession();renderProgression();saved=updated;renderSaved();$('saved').value=index<0?saved.length-1:index;updateSavedActions();feedback.clear('save','storage');feedback.clear('save','limit');message(`“${name}” saved on this device.`,{scope:'save',kind:'success'});}else feedback.show('save',{id:'storage',kind:'error',text:'Unable to save. Allow this site to use local storage, then try again. Your current progression is still available.'});
});
$('load-saved').addEventListener('click',()=>{const p=$('saved').value===''?null:saved[Number($('saved').value)];if(!p)return message('Choose a saved progression first.',{scope:'save',kind:'warning',id:'selection'});stop({silent:true});progression=structuredClone(p.chords);sequenceName=p.name;setKey(p.key||'');spec={...progression[0]};selected=0;$('save-name').value=p.name;persistSession();render();renderProgression();feedback.clear('save','selection');message(`Opened “${p.name}”.`,{scope:'save',kind:'success'});});
$('delete-saved').addEventListener('click',()=>{if($('saved').value==='')return message('Choose a saved progression first.',{scope:'save',kind:'warning',id:'selection'});const index=Number($('saved').value),updated=saved.filter((_,i)=>i!==index);if(write('progressions',updated)){saved=updated;renderSaved();feedback.clear('save','storage');feedback.clear('save','selection');message('Saved progression deleted. The current progression remains available.',{scope:'save',kind:'success'});}else feedback.show('save',{id:'storage',kind:'error',text:'Unable to delete the saved progression. Allow local storage and try again.'});});
function audition({plan,bpm,loop=false,scope,onFrame=()=>{}}){
 withAudio(()=>{activeScope=scope;activePlayback=scope;player.start(plan,{bpm,loop,
  onScheduled:()=>{feedback.clear(scope,'audio');playbackStatus(scope,'Playing');},
  onFrame:(events,beat)=>{onFrame(events,beat);if(beat!==null)playbackStatus(scope,'Playing',`Beat ${Math.floor(beat%4)+1}`);},
  onEnd:()=>{activeScope=null;activePlayback=null;playbackStatus(scope,'Complete');},onError:error=>playbackFailure(error,scope)
 });},{scope});
}
function stopExternal(scope){stop();playbackStatus(scope,'Stopped');}
const guided=setupDiscover({audition,stop:stopExternal,feedback,renderKeyboard});
const composer=setupComposer({audition,stop:stopExternal,feedback});

renderExercise($('bach-notation'),bachPlan().events);
document.addEventListener('studio-view-change',event=>{
  const {previous,next}=event.detail;
  if(next==='composition-panel')composer.open();
  if(next==='save-panel')updateSavedActions();
  // Viewing a playing progression's score is observational. Editing and
  // leaving a study stop through the existing transport, never a new engine.
  if(next!=='voicing-view' && !(previous==='voicing-view'&&next===null))stop({silent:true});
  if(next==='bach-panel'){studyKind='bach';guided.open();}
  else if(previous==='bach-panel'){studyKind='chord';render();}
});
$('play-bach').addEventListener('click',()=>guided.play());
$('stop-bach').addEventListener('click',()=>{stop();playbackStatus('bach','Stopped');guided.open();});
window.addEventListener('pageshow',()=>audio.refreshStatus());
window.addEventListener('pagehide',()=>stop({silent:true}));
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop({silent:true});else audio.refreshStatus();});
window.addEventListener('blur',()=>document.querySelectorAll('.key.pressed').forEach(k=>k.classList.remove('pressed')));
let installPrompt;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('install').hidden=false;});
$('install').addEventListener('click',async()=>{if(installPrompt){await installPrompt.prompt();installPrompt=null;$('install').hidden=true;}});
window.addEventListener('appinstalled',()=>{$('install').hidden=true;message('Studio installed.',{scope:'app',kind:'success'});});
const connection=()=>{$('connection').textContent=navigator.onLine?'ON YOUR DEVICE':'OFFLINE';};
window.addEventListener('online',connection);window.addEventListener('offline',connection);connection();
if('serviceWorker' in navigator)navigator.serviceWorker.register(new URL('../service-worker.js',import.meta.url),{scope:new URL('../',import.meta.url).href,updateViaCache:'none'}).then(registration=>{
  const notify=()=>{if(registration.waiting&&navigator.serviceWorker.controller&&registration.active)message('Studio update downloaded. Close all Studio windows and Home Screen instances, then reopen to use it.',{scope:'app'});};
  notify();registration.addEventListener('updatefound',()=>registration.installing?.addEventListener('statechange',notify));
}).catch(()=>message('Offline caching is unavailable. Stay online or reload this page to retry installation.',{scope:'app',kind:'warning'}));
setExperience(mode);render();renderProgression();renderSaved();
