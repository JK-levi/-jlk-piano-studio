import { ROOTS,QUALITIES,parseNote,pretty,toMidi,midiName } from './theory.js';
import { newComposition,newId,validateComposition,insertEvent,deleteEvent,addMeasure,usedBeats,compositionEvents,compositionPlan,incompleteMeasures,importComposition } from './composition-model.js';
import { compositions,saveComposition,removeComposition,loadDraft,saveDraft } from './composition-storage.js';
import { suggestChords,suggestNotes,chordPitches } from './suggestions.js';
import { renderScore,highlightScore } from './score-renderer.js';
export function setupComposer({audition,stop,feedback}){
 const $=id=>document.getElementById('composition-'+id),option=(value,label=value)=>{const n=document.createElement('option');n.value=value;n.textContent=label;return n;};
 let doc=loadDraft()||newComposition(),undo=[],tray=[],chosen=null;const octaves={right:4,left:3};
 const position=()=>({hand:$('hand').value,measure:Number($('measure').value)||0,octave:Number($('octave').value)});
 const duration=()=>Number($('duration').value);
 const note=()=>$('letter').value+$('accidental').value+$('octave').value;
 const report=(text,kind='error',id='edit')=>{feedback.show('composition',{text,kind,id});if(kind==='error'){stop('composition');$('position').textContent='Failed';$('position').dataset.state='Failed';document.getElementById('composition-feedback').scrollIntoView({block:'nearest',behavior:'instant'});}};
 const clear=()=>feedback.clear('composition','edit');
 function guard(fn){try{return fn();}catch(error){report(error.message);return false;}}
 function metadata(){const next={...doc,title:$('title').value.trim(),tempo:Number($('tempo').value),key:$('key').value};validateComposition(next);doc=next;saveWorking();}
 function saveWorking(){if(!saveDraft(doc))report('Working changes could not be stored. Download a JSON backup before closing this page.','warning','storage');else feedback.clear('composition','storage');}
 function commit(next){stop('composition');undo.push(structuredClone(doc));if(undo.length>100)undo.shift();doc=next;saveWorking();clear();draw();}
 function insert(pitches){return guard(()=>{metadata();const p=position();commit(insertEvent(doc,{...p,pitches,duration:duration()}));report('Entry inserted. Undo is available.','success','inserted');return true;});}
 function preview(pitches){guard(()=>{if(!pitches.length)throw Error('Choose a note or chord first.');audition({scope:'composition',bpm:100,plan:{beats:1,events:[{id:'preview',beat:0,duration:1,notes:pitches.map(fullName=>({...parseNote(fullName),fullName,midi:toMidi(fullName)}))}]}});});}
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
   const listen=document.createElement('button');listen.textContent='Listen';listen.addEventListener('click',()=>preview(idea.pitches));
   const choose=document.createElement('button');choose.textContent='Choose chord';choose.addEventListener('click',()=>{chosen=idea.spec;$('chosen-chord').hidden=false;$('chosen-name').textContent=pretty(idea.symbol)+' · '+chordPitches(chosen,position().octave).map(pretty).join(', ');$('tone-picker').hidden=true;refreshChosen();});
   card.append(title,text,listen,choose);$('chord-suggestions').append(card);
  }
  for(const idea of suggestNotes(doc,p)){
   const card=document.createElement('article');card.className='suggestion-card';const title=document.createElement('strong');title.textContent=pretty(idea.pitch);const text=document.createElement('p');text.textContent=idea.description;const listen=document.createElement('button');listen.textContent='Listen';listen.addEventListener('click',()=>preview([idea.pitch]));const add=document.createElement('button');add.textContent='Insert note';add.addEventListener('click',()=>insert([idea.pitch]));card.append(title,text,listen,add);$('note-suggestions').append(card);
  }
  $('chosen-chord').hidden=!chosen;refreshChosen();
 }
 function library(){const selected=$('library').value;$('library').replaceChildren(option('','Choose a saved piece'),...compositions().map(p=>option(p.id,p.title)));$('library').value=compositions().some(p=>p.id===selected)?selected:'';const none=!$('library').value;for(const id of ['open','duplicate','delete'])$(id).disabled=none;}
 function showMeasure(index){$('score').classList.toggle('show-all',$('show-all').checked);$('score').querySelectorAll('svg').forEach(n=>n.classList.toggle('active-measure',Number(n.dataset.measure)===index));}
 function draw(){
  const previousMeasure=Number($('measure').value)||0;$('measure').replaceChildren(...doc.measures.map((_,i)=>option(i,`Measure ${i+1}`)));$('measure').value=Math.min(previousMeasure,doc.measures.length-1);
  $('title').value=doc.title;$('tempo').value=doc.tempo;$('key').value=doc.key;
  const p=position(),used=usedBeats(doc,p.measure,p.hand),entries=doc.measures[p.measure][p.hand];
  $('cursor').textContent=`${p.hand==='right'?'Right':'Left'} hand · Measure ${p.measure+1} · ${used===4?'Measure full':`Next beat ${used+1} · ${4-used} beats available`}`;
  $('events').replaceChildren(option('','Choose an entry'),...entries.map(e=>option(e.id,`Beat ${e.beat+1}: ${e.rest?'Rest':e.pitches.map(pretty).join(' + ')} · ${e.duration} beats`)));
  $('delete-event').disabled=!$('events').value;$('undo').disabled=!undo.length;$('add-measure').disabled=doc.measures.length>=8;
  const incomplete=incompleteMeasures(doc);$('completeness').textContent=incomplete.length?`${incomplete.length} incomplete hand-measures. Unwritten time stays silent during playback; fill it with notes or rests. Saving does not fill it for you.`:'Every hand and measure has four beats.';
  $('score-title').textContent=doc.title;$('score-meta').textContent=`4/4 · ${doc.tempo} BPM · Key context: ${pretty(doc.key)} · Accidentals written per note`;
  renderScore($('score'),compositionEvents(doc),{measures:doc.measures.length,labels:$('labels').checked,title:doc.title});showMeasure(p.measure);piano();suggestions();
  $('tray').textContent=tray.length?tray.map(pretty).join(' + '):'Chord tray empty';
 }
 function switchDocument(next){if(JSON.stringify(next)!==JSON.stringify(doc)&&!confirm('Open a different piece? Your current work is kept as a draft only until it is replaced. Save or download a backup first if needed.'))return;stop('composition');doc=structuredClone(next);undo=[];tray=[];chosen=null;saveWorking();draw();library();}
 for(const letter of 'CDEFGAB')$('letter').append(option(letter));for(const root of ROOTS)$('chord-root').append(option(root,pretty(root)));for(const [key,q]of Object.entries(QUALITIES))$('chord-quality').append(option(key,q.name));
 for(const key of ROOTS.flatMap(root=>[root,root+'m']))$('key').append(option(key,pretty(key)));
 for(const id of ['title','tempo','key'])$(id).addEventListener('change',()=>guard(()=>{stop('composition');metadata();clear();draw();}));
 for(const id of ['measure','duration','octave','labels','write-taps','show-all'])$(id).addEventListener('change',()=>{if(id==='octave')octaves[$('hand').value]=Number($('octave').value);stop('composition');draw();});
 $('hand').addEventListener('change',()=>{$('octave').value=octaves[$('hand').value];stop('composition');draw();});
 $('events').addEventListener('change',()=>{$('delete-event').disabled=!$('events').value;});$('library').addEventListener('change',()=>{const none=!$('library').value;for(const id of ['open','duplicate','delete'])$(id).disabled=none;});
 $('listen-note').addEventListener('click',()=>preview([note()]));$('insert-note').addEventListener('click',()=>insert([note()]));$('rest').addEventListener('click',()=>insert([]));
 $('undo').addEventListener('click',()=>{if(!undo.length)return;stop('composition');doc=undo.pop();saveWorking();clear();draw();});
 $('delete-event').addEventListener('click',()=>guard(()=>{const p=position();if(!$('events').value)throw Error('Choose an entry to delete.');commit(deleteEvent(doc,p.measure,p.hand,$('events').value));}));
 $('add-measure').addEventListener('click',()=>guard(()=>{metadata();commit(addMeasure(doc));$('measure').value=doc.measures.length-1;draw();}));
 $('tray-add').addEventListener('click',()=>{if(!tray.some(n=>toMidi(n)===toMidi(note()))&&tray.length<8)tray.push(note());draw();});$('tray-clear').addEventListener('click',()=>{tray=[];draw();});$('tray-insert').addEventListener('click',()=>{if(!tray.length)return report('Add notes to the chord tray first.');if(insert(tray)){tray=[];draw();}});
 const manualChord=()=>chordPitches({root:$('chord-root').value,quality:$('chord-quality').value},position().octave);
 $('chord-listen').addEventListener('click',()=>preview(manualChord()));$('chord-insert').addEventListener('click',()=>insert(manualChord()));
 $('suggestion-whole').addEventListener('click',()=>{if(chosen)insert(chordPitches(chosen,position().octave));});$('choose-tone').addEventListener('click',()=>{$('tone-picker').hidden=false;$('tone-octave').value=position().octave;});
 const selectedTone=()=>$('tone').value+$('tone-octave').value;
 $('tone-listen').addEventListener('click',()=>preview([selectedTone()]));$('tone-insert').addEventListener('click',()=>insert([selectedTone()]));
 $('play').addEventListener('click',()=>guard(()=>{metadata();const plan=compositionPlan(doc);if(!plan.events.length)throw Error('Write at least one note before playing. Rests alone are silent.');audition({plan,bpm:doc.tempo,scope:'composition',onFrame:(events,beat)=>{showMeasure(beat===null?position().measure:Math.min(doc.measures.length-1,Math.floor(beat/4)));highlightScore($('score'),events);const pitches=new Set(events.flatMap(e=>e.notes.map(n=>n.midi)));$('keyboard').querySelectorAll('[data-midi]').forEach(key=>key.classList.toggle('sounding',pitches.has(Number(key.dataset.midi))));}});}));
 $('see-score').addEventListener('click',()=>$('print-area').scrollIntoView({block:'start',behavior:'instant'}));
 $('stop').addEventListener('click',()=>stop('composition'));
 $('save').addEventListener('click',()=>guard(()=>{metadata();saveComposition(doc);clear();feedback.clear('composition','save');report('Piece saved on this device. Download a backup to keep another copy.','success','saved');library();$('library').value=doc.id;for(const id of ['open','duplicate','delete'])$(id).disabled=false;}));
 $('new').addEventListener('click',()=>switchDocument(newComposition()));$('open').addEventListener('click',()=>{const next=compositions().find(p=>p.id===$('library').value);if(next)switchDocument(next);});
 $('duplicate').addEventListener('click',()=>guard(()=>{const source=compositions().find(p=>p.id===$('library').value);if(!source||!confirm(`Duplicate “${source.title}”?`))return;const next={...structuredClone(source),id:newId(),title:(source.title+' (copy)').slice(0,100)};saveComposition(next);clear();library();report('Saved copy created. Choose it and Open to edit.','success','saved');}));
 $('delete').addEventListener('click',()=>guard(()=>{if(!$('library').value||!confirm('Delete this saved copy? The current working piece stays in the editor.'))return;removeComposition($('library').value);clear();library();report('Saved copy deleted.','success','saved');}));
 $('export').addEventListener('click',()=>guard(()=>{metadata();const url=URL.createObjectURL(new Blob([JSON.stringify(doc,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=(doc.title.replace(/[^\w -]/g,'').trim()||'piano-piece')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}));
 $('import').addEventListener('change',async()=>{const file=$('import').files[0];if(!file)return;try{if(file.size>200000)throw Error('Choose a JSON backup smaller than 200 KB.');switchDocument(importComposition(await file.text()));}catch(error){report(`Could not open backup. ${error.message}`);}finally{$('import').value='';}});
 $('print').addEventListener('click',()=>guard(()=>{metadata();draw();window.print();}));
 library();draw();return {open:()=>{draw();library();}};
}
