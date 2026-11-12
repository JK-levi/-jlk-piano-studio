import {organizeComposer} from './composer-layout.js';
import { ROOTS,QUALITIES,parseNote,pretty,toMidi,midiName } from './theory.js';
import { newComposition,newId,validateComposition,validateEditableComposition,compositionIssues,meterCopy,insertEvent,deleteEvent,deletePitch,clearHandMeasure,clearPiece,addMeasure,usedBeats,compositionEvents,compositionPlan,incompleteMeasures,importComposition } from './composition-model.js';
import { compositions,editableCompositions,isDraftCopy,saveComposition,saveDraftCopy,preserveMeterOriginal,removeComposition,loadDraft,saveDraft } from './composition-storage.js';
import { suggestChords,suggestNotes,chordPitches } from './suggestions.js';
import { renderScore,highlightScore } from './score-renderer.js';
import {METERS,NOTE_VALUES,meter,capacityLabel,positionLabel} from './meter.js';
export function setupComposer({audition,stop,feedback}){
 const $=id=>document.getElementById('composition-'+id),option=(value,label=value)=>{const n=document.createElement('option');n.value=value;n.textContent=label;return n;};
 const layout=organizeComposer();
 let doc=loadDraft()||newComposition(),undo=[],redo=[],tray=[],chosen=null,issuesSignature='',lastSounding=null;const octaves={right:4,left:3};
 const position=()=>({hand:$('hand').value,measure:Number($('measure').value)||0,octave:Number($('octave').value)});
 const duration=()=>Number($('duration').value);
 const note=()=>$('letter').value+$('accidental').value+$('octave').value;
 const report=(text,kind='error',id='edit')=>{feedback.show('composition',{text,kind,id});if(kind==='error'){stop('composition');$('position').textContent='Failed';$('position').dataset.state='Failed';document.getElementById('composition-feedback').scrollIntoView({block:'nearest',behavior:'instant'});}};
 const clear=()=>feedback.clear('composition','edit');
 function guard(fn){try{return fn();}catch(error){report(error.message);return false;}}
 function metadata(){const next={...doc,title:$('title').value.trim(),tempo:Number($('tempo').value),key:$('key').value};if(doc.metronome!==undefined||$('metronome').checked)next.metronome=$('metronome').checked;validateEditableComposition(next);doc=next;saveWorking();}
 function saveWorking(){if(!saveDraft(doc))report('Working changes could not be stored. Keep this view open and allow local storage before leaving.','warning','storage');else feedback.clear('composition','storage');}
 function commit(next){stop('composition');redo=[];undo.push(structuredClone(doc));if(undo.length>100)undo.shift();doc=next;saveWorking();clear();feedback.clear('composition','saved');draw();}
 function insert(pitches){return guard(()=>{metadata();const p=position();commit(insertEvent(doc,{...p,pitches,duration:duration()}));feedback.clear('composition','inserted');return true;});}
 function preview(pitches){guard(()=>{if(!pitches.length)throw Error('Choose a note or chord first.');audition({scope:'composition',describeBeat:()=>"Preview · selected notes only",completionDetail:'Note preview only',bpm:100,plan:{beats:1,events:[{id:'preview',beat:0,duration:1,notes:pitches.map(fullName=>({...parseNote(fullName),fullName,midi:toMidi(fullName)}))}]}});});}
 function setPitch(pitch){const p=parseNote(pitch);$('letter').value=p.letter;$('accidental').value=p.accidental>0?'#':p.accidental<0?'b':'';}
 function piano(){
  const octave=Number($('octave').value),fragment=document.createDocumentFragment();let white=0;
  for(let pc=0;pc<12;pc++){
   const midi=12*(octave+1)+pc,black=[1,3,6,8,10].includes(pc),pitch=midiName(midi,doc.key.includes('b')),b=document.createElement('button');b.dataset.midi=midi;b.className='entry-key '+(black?'black':'white');b.type='button';b.disabled=midi<21||midi>108;b.textContent=pretty(pitch);b.setAttribute('aria-label',`${$('write-taps').checked?'Insert':'Preview'} ${pretty(pitch)}`);
   if(black){b.style.left=`${(white-.33)/7*100}%`;b.style.width=`${.66/7*100}%`;}else white++;
   b.addEventListener('click',()=>{setPitch(pitch);if($('write-taps').checked)insert([pitch]);else preview([pitch]);});fragment.append(b);
  }
  $('keyboard').replaceChildren(fragment);
 }
 function refreshChosen(){if(!chosen)return;const pitches=chordPitches(chosen,position().octave);$('chosen-name').textContent=pretty(chosen.root+QUALITIES[chosen.quality].symbol)+' · '+pitches.map(pretty).join(', ');$('tone').replaceChildren(...pitches.map(name=>option(name.replace(/-?\d+$/,''),pretty(name.replace(/-?\d+$/,'')))));}
 function suggestions(){
  const p=position();$('chord-suggestions').replaceChildren();$('note-suggestions').replaceChildren();
  for(const idea of suggestChords(doc,p)){
   const card=document.createElement('article');card.className='suggestion-card';const title=document.createElement('strong');title.textContent=pretty(idea.symbol);const text=document.createElement('p');text.textContent=idea.description;
   const listen=document.createElement('button');listen.textContent='▶ '+title.textContent;listen.setAttribute('aria-label','Preview '+title.textContent);listen.addEventListener('click',()=>preview(idea.pitches));
   const choose=document.createElement('button');choose.textContent='Add…';choose.addEventListener('click',()=>{chosen=idea.spec;$('chosen-chord').hidden=false;$('chosen-name').textContent=pretty(idea.symbol)+' · '+chordPitches(chosen,position().octave).map(pretty).join(', ');$('tone-picker').hidden=true;refreshChosen();});
   const info=document.createElement('details');info.innerHTML='<summary>Why?</summary>';info.append(text);card.append(title,listen,choose,info);$('chord-suggestions').append(card);
  }
  for(const idea of suggestNotes(doc,p)){
   const card=document.createElement('article');card.className='suggestion-card';const title=document.createElement('strong');title.textContent=pretty(idea.pitch);const text=document.createElement('p');text.textContent=idea.description;const listen=document.createElement('button');listen.textContent='▶ '+title.textContent;listen.setAttribute('aria-label','Preview '+title.textContent);listen.addEventListener('click',()=>preview([idea.pitch]));const add=document.createElement('button');add.textContent='Insert';add.addEventListener('click',()=>insert([idea.pitch]));const info=document.createElement('details');info.innerHTML='<summary>Why?</summary>';info.append(text);card.append(title,listen,add,info);$('note-suggestions').append(card);
  }
  $('chosen-chord').hidden=!chosen;refreshChosen();
 }
 function library(){const selected=$('library').value,items=editableCompositions();$('library').replaceChildren(option('','Choose a saved piece'),...items.map(p=>option(p.id,(isDraftCopy(p.id)?'Draft copy · ':'')+p.title)));$('library').value=items.some(p=>p.id===selected)?selected:'';const none=!$('library').value;for(const id of ['open','duplicate','delete'])$(id).disabled=none;}
 function showMeasure(index){$('score').classList.toggle('show-all',$('show-all').checked);$('score').querySelectorAll('svg').forEach(n=>n.classList.toggle('active-measure',Number(n.dataset.measure)===index));$('score-scroll-hint').hidden=!$('score').querySelector($('show-all').checked?'svg[data-wide=true]':'svg.active-measure[data-wide=true]');}
 function playbackFrame(events,beat){
  showMeasure(beat===null?position().measure:Math.min(doc.measures.length-1,Math.floor(beat/meter(doc.timeSignature).pulses)));highlightScore($('score'),events);
  const pitches=new Set(events.flatMap(e=>e.notes.map(n=>n.midi)));$('keyboard').querySelectorAll('[data-midi]').forEach(key=>key.classList.toggle('sounding',pitches.has(Number(key.dataset.midi))));
  if(beat===null){lastSounding=null;return;}
  const latest=[...events].sort((a,b)=>b.beat-a.beat||(a.hand==='right'?-1:1))[0];
  if(!latest||latest.id===lastSounding)return;lastSounding=latest.id;
  const note=[...$('score').querySelectorAll('[data-score-event]')].find(n=>n.dataset.scoreEvent===latest.id);
  if(note?.closest('svg')?.dataset.wide==='true'){const bounds=$('score').getBoundingClientRect(),rect=note.getBoundingClientRect();if(rect.left<bounds.left||rect.right>bounds.right)$('score').scrollLeft+=rect.left-bounds.left-24;}
 }
 function draw(){
  const previousMeasure=Number($('measure').value)||0;$('measure').replaceChildren(...doc.measures.map((_,i)=>option(i,`Bar ${i+1}`)));$('measure').value=Math.min(previousMeasure,doc.measures.length-1);
  $('title').value=doc.title;$('tempo').value=doc.tempo;$('key').value=doc.key;const m=meter(doc.timeSignature);$('meter').value=m.key;$('metronome').checked=!!doc.metronome;$('tempo-unit').textContent=`BPM · ${m.unit} pulse`;$('counting').textContent=`Count ${m.count}. Tempo counts ${m.unit} pulses.`;
  const p=position(),used=usedBeats(doc,p.measure,p.hand),entries=doc.measures[p.measure][p.hand];
  $('cursor').textContent=`${p.hand==='right'?'Right':'Left'} hand · Measure ${p.measure+1} · ${used>m.quarters?'Overfilled — edit entries below':used===m.quarters?'Measure full':`${capacityLabel(doc.timeSignature,m.quarters-used)} available`}`;
  $('events').replaceChildren(option('','Choose an entry'),...entries.map(e=>option(e.id,`${capacityLabel(doc.timeSignature,e.beat)} from start: ${e.rest?'Rest':e.pitches.map(pretty).join(' + ')} · ${NOTE_VALUES[e.duration].name}`)));
  selectionChanged();$('undo').disabled=!undo.length;$('redo').disabled=!redo.length;$('add-measure').disabled=doc.measures.length>=8;
  const incomplete=incompleteMeasures(doc);$('completeness').textContent=incomplete.length?`${incomplete.length} incomplete hand-measures. Unwritten time stays silent during playback; fill it with notes or rests. Saving does not fill it for you.`:`Every hand and measure fits ${m.key}.`;
  $('score-title').textContent=doc.title;$('score-meta').textContent=`${m.key} · ${doc.tempo} BPM (${m.unit} pulse) · Key context: ${pretty(doc.key)} · Accidentals written per note`;
  $('copy-origin').textContent=doc.copyOf?`Editable ${m.key} copy. Original reference: “${doc.copyOf.title}” (${meter(doc.copyOf.timeSignature).key}).${meter(doc.copyOf.timeSignature).pulseQuarters!==m.pulseQuarters?' The BPM number is kept, but its pulse unit changed, so playback speed changes. Adjust tempo if needed.':''}`:'';
  const issues=compositionIssues(doc);document.body.dataset.compositionValid=String(!issues.length);for(const id of ['play','print','export'])$(id).disabled=!!issues.length;
  $('save').textContent=issues.length?'Save draft':'Save';$('print-warning').hidden=!issues.length;$('meter-issues').replaceChildren();
  for(const issue of issues){const item=document.createElement('li'),button=document.createElement('button');button.textContent=`Measure ${issue.measure+1}, ${issue.hand} hand: ${capacityLabel(doc.timeSignature,issue.excess)} too many. Edit this measure`;button.addEventListener('click',()=>{layout.show('write');$('selection-drawer').open=true;$('measure').value=issue.measure;$('hand').value=issue.hand;$('octave').value=octaves[issue.hand];draw();$('events').focus();});item.append(button);$('meter-issues').append(item);}
  const signature=JSON.stringify(issues);if(signature!==issuesSignature){issuesSignature=signature;if(issues.length){feedback.show('composition',{id:'meter-overflow',kind:'error',text:'This is an editable draft, not a playable score yet. The listed hand-measures exceed the selected meter. Delete or replace entries to make room; no notes have been moved or shortened.'});$('position').textContent='Draft — measures need attention';$('position').dataset.state='Failed';}else {feedback.clear('composition','meter-overflow');feedback.clear('composition','saved');if(!document.querySelector('#composition-feedback .feedback-error')){$('position').textContent='Stopped';$('position').dataset.state='Stopped';}}}
  if(issues.length){$('position').textContent='Draft — measures need attention';$('position').dataset.state='Failed';}
  const scoreEvents=compositionEvents(doc);renderScore($('score'),scoreEvents,{measures:doc.measures.length,labels:$('labels').checked,title:doc.title,timeSignature:doc.timeSignature});showMeasure(p.measure);piano();suggestions();$('score').querySelectorAll('svg').forEach(n=>n.setAttribute('role','group'));$('score').querySelectorAll('[data-score-event]').forEach(n=>{n.setAttribute('tabindex','0');n.setAttribute('role','button');const event=scoreEvents.find(e=>e.id===n.dataset.scoreEvent);n.setAttribute('aria-label',`Select ${event.hand} hand ${event.rest?'rest':event.pitches.map(pretty).join(' + ')}, measure ${event.measure+1}`);const box=n.getBBox(),hit=document.createElementNS('http://www.w3.org/2000/svg','rect');hit.setAttribute('x',box.x-12);hit.setAttribute('y',box.y-8);hit.setAttribute('width',Math.max(44,box.width+24));hit.setAttribute('height',box.height+16);hit.setAttribute('fill','transparent');hit.setAttribute('pointer-events','all');n.prepend(hit);});
  $('tray').textContent=tray.length?tray.map(pretty).join(' + '):'Chord tray empty';
 }
 function switchDocument(next){if(JSON.stringify(next)!==JSON.stringify(doc)&&!confirm('Open a different piece? Your current work is kept as a draft only until it is replaced. Save or download a backup first if needed.'))return;stop('composition');doc=structuredClone(next);undo=[];redo=[];tray=[];chosen=null;saveWorking();draw();library();}
 for(const key of Object.keys(METERS))$('meter').append(option(key));$('duration').replaceChildren(...Object.entries(NOTE_VALUES).sort((a,b)=>Number(a[0])-Number(b[0])).map(([value,meta])=>option(value,meta.name)));$('duration').value='1';
 for(const letter of 'CDEFGAB')$('letter').append(option(letter));for(const root of ROOTS)$('chord-root').append(option(root,pretty(root)));for(const [key,q]of Object.entries(QUALITIES))$('chord-quality').append(option(key,q.name));
 for(const key of ROOTS.flatMap(root=>[root,root+'m']))$('key').append(option(key,pretty(key)));
 $('title').addEventListener('input',()=>{const title=$('title').value.trim();if(title){doc={...doc,title};saveWorking();feedback.clear('composition','saved');}});
 for(const id of ['title','tempo','key','metronome'])$(id).addEventListener('change',()=>guard(()=>{stop('composition');metadata();clear();draw();}));
 for(const id of ['measure','duration','octave','labels','write-taps','show-all'])$(id).addEventListener('change',()=>{if(id==='octave')octaves[$('hand').value]=Number($('octave').value);stop('composition');draw();});
 $('meter').addEventListener('change',()=>{
   const target=$('meter').value.split('/').map(Number);if(target.join('/')===meter(doc.timeSignature).key)return;
   guard(()=>{stop('composition');metadata();const written=doc.measures.some(m=>m.right.length||m.left.length)||editableCompositions().some(p=>p.id===doc.id);
     if(written){const original=preserveMeterOriginal(doc),copy=meterCopy(doc,target,original.id);saveDraftCopy(copy);if(!saveDraft(copy))throw Error('The original and new copy are saved, but the working draft could not be stored. Keep this view open and allow storage before continuing.');doc=copy;undo=[];redo=[];tray=[];chosen=null;clear();draw();library();$('library').value=copy.id;$('library').dispatchEvent(new Event('change'));report('Editable meter copy created. Original preserved in My pieces. Notes and bar lines were kept; the tempo label now identifies the new musical pulse.','info','meter-copy');}
     else commit({...structuredClone(doc),timeSignature:target});
   });$('meter').value=meter(doc.timeSignature).key;
 });
 $('hand').addEventListener('change',()=>{$('octave').value=octaves[$('hand').value];stop('composition');draw();});
 $('events').addEventListener('change',selectionChanged);$('library').addEventListener('change',()=>{const none=!$('library').value;for(const id of ['open','duplicate','delete'])$(id).disabled=none;});
 $('listen-note').addEventListener('click',()=>preview([note()]));$('insert-note').addEventListener('click',()=>insert([note()]));$('rest').addEventListener('click',()=>insert([]));
 $('undo').addEventListener('click',()=>{if(!undo.length)return;stop('composition');redo.push(structuredClone(doc));doc=undo.pop();saveWorking();clear();draw();});
 $('redo').addEventListener('click',()=>{if(!redo.length)return;stop('composition');undo.push(structuredClone(doc));doc=redo.pop();saveWorking();clear();draw();});
 function selectionChanged(){
  const p=position(),entry=doc.measures[p.measure][p.hand].find(e=>e.id===$('events').value);
  $('delete-event').textContent=entry?.pitches.length===1?'Delete Note':entry?.rest?'Delete Rest':'Delete Selection';$('clear-measure').textContent=`Clear ${p.hand==='right'?'RH':'LH'} / measure ${p.measure+1}…`;$('delete-event').disabled=!entry;if(entry)$('selection-drawer').open=true;
  $('selected-tone').replaceChildren(option('','Whole event'),...(entry?.pitches||[]).map(n=>option(n,pretty(n))));
  $('selected-tone').closest('label').hidden=!entry||entry.pitches.length<2;
  $('score').querySelectorAll('[data-score-event]').forEach(n=>n.classList.toggle('score-selected',n.dataset.scoreEvent===entry?.id));
 }
 function selectWritten(target){const node=target.closest('[data-score-event]');if(!node)return;const event=compositionEvents(doc).find(e=>e.id===node.dataset.scoreEvent);if(!event)return;stop('composition');$('hand').value=event.hand;$('octave').value=octaves[event.hand];$('measure').value=event.measure;draw();$('events').value=event.id;selectionChanged();const midi=target.dataset.midi;if(midi&&event.pitches.length>1){$('selected-tone').value=event.pitches.find(n=>toMidi(n)===Number(midi))||'';$('delete-event').textContent='Delete Note';} }
 $('selected-tone').addEventListener('change',()=>{$('delete-event').textContent=$('selected-tone').value?'Delete Note':'Delete Selection';});
 $('score').addEventListener('click',e=>selectWritten(e.target));
 $('score').addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();selectWritten(e.target);$('delete-event').focus();}});
 $('delete-event').addEventListener('click',()=>guard(()=>{const p=position(),id=$('events').value,pitch=$('selected-tone').value;if(!id)throw Error('Select a written note first.');commit(pitch?deletePitch(doc,p.measure,p.hand,id,pitch):deleteEvent(doc,p.measure,p.hand,id));}));
 $('clear-measure').addEventListener('click',()=>{const p=position();if(confirm(`Clear ${p.hand} hand in measure ${p.measure+1}? The other hand and measures stay unchanged. Undo is available.`))guard(()=>commit(clearHandMeasure(doc,p.measure,p.hand)));});
 $('clear-piece').addEventListener('click',()=>{if(confirm('Clear all notes in the working piece? Saved copies stay unchanged. Undo is available.'))guard(()=>{commit(clearPiece(doc));layout.show('write');});});
 $('add-measure').addEventListener('click',()=>guard(()=>{metadata();commit(addMeasure(doc));$('measure').value=doc.measures.length-1;draw();}));
 $('tray-add').addEventListener('click',()=>{if(!tray.some(n=>toMidi(n)===toMidi(note()))&&tray.length<8)tray.push(note());draw();});$('tray-clear').addEventListener('click',()=>{tray=[];draw();});$('tray-insert').addEventListener('click',()=>{if(!tray.length)return report('Add notes to the chord tray first.');if(insert(tray)){tray=[];draw();}});
 const manualChord=()=>chordPitches({root:$('chord-root').value,quality:$('chord-quality').value},position().octave);
 $('chord-listen').addEventListener('click',()=>preview(manualChord()));$('chord-insert').addEventListener('click',()=>insert(manualChord()));
 $('suggestion-whole').addEventListener('click',()=>{if(chosen)insert(chordPitches(chosen,position().octave));});$('choose-tone').addEventListener('click',()=>{$('tone-picker').hidden=false;$('tone-octave').value=position().octave;});
 const selectedTone=()=>$('tone').value+$('tone-octave').value;
 $('tone-listen').addEventListener('click',()=>preview([selectedTone()]));$('tone-insert').addEventListener('click',()=>insert([selectedTone()]));
 $('play').addEventListener('click',()=>guard(()=>{metadata();const plan=compositionPlan(doc);if(!plan.events.some(e=>!e.click))throw Error('Write at least one note before playing. Rests alone are silent.');audition({plan,bpm:doc.tempo,scope:'composition',describeBeat:beat=>positionLabel(doc.timeSignature,Math.min(beat,plan.beats-1e-8)),onFrame:playbackFrame});}));
 $('see-score').addEventListener('click',()=>$('print-area').scrollIntoView({block:'start',behavior:'instant'}));
 $('stop').addEventListener('click',()=>stop('composition'));
 $('save').addEventListener('click',()=>guard(()=>{metadata();const draft=compositionIssues(doc).length;if(draft)saveDraftCopy(doc);else saveComposition(doc);clear();feedback.clear('composition','save');report(draft?'Draft copy saved with measures still needing attention. Fix them before playing, printing or exporting.':'Piece saved.',draft?'warning':'success','saved');library();$('library').value=doc.id;for(const id of ['open','duplicate','delete'])$(id).disabled=false;}));
 $('new').addEventListener('click',()=>switchDocument(newComposition()));$('open').addEventListener('click',()=>{const next=editableCompositions().find(p=>p.id===$('library').value);if(next){switchDocument(next);layout.show('write');}});
 $('duplicate').addEventListener('click',()=>guard(()=>{const source=editableCompositions().find(p=>p.id===$('library').value);if(!source||!confirm(`Duplicate “${source.title}”?`))return;const next={...structuredClone(source),id:newId(),title:(source.title+' (copy)').slice(0,100)};if(compositionIssues(next).length||isDraftCopy(source.id))saveDraftCopy(next);else saveComposition(next);clear();library();report('Saved copy created. Choose it and Open to edit.','success','saved');}));
 $('delete').addEventListener('click',()=>guard(()=>{if(!$('library').value||!confirm('Delete this saved copy? The current working piece stays in the editor.'))return;removeComposition($('library').value);clear();library();report('Saved copy deleted.','success','saved');}));
 $('export').addEventListener('click',()=>guard(()=>{metadata();validateComposition(doc);const url=URL.createObjectURL(new Blob([JSON.stringify(doc,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=(doc.title.replace(/[^\w -]/g,'').trim()||'piano-piece')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}));
 $('import').addEventListener('change',async()=>{const file=$('import').files[0];if(!file)return;try{if(file.size>200000)throw Error('Choose a JSON backup smaller than 200 KB.');switchDocument(importComposition(await file.text()));}catch(error){report(`Could not open backup. ${error.message}`);}finally{$('import').value='';}});
 $('print').addEventListener('click',()=>guard(()=>{metadata();validateComposition(doc);draw();window.print();}));
 library();draw();return {open:()=>{draw();library();}};
}
