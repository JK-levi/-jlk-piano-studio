// Presentation only. Shared score, keyboard and transports keep their existing
// IDs and handlers; navigation never creates a second audio/control instance.
const CONTENT = {
  explore: ['THE CHORD EXPLORER', 'See the harmony.', 'A note on the page. A key beneath your fingers.'],
  studio: ['THE PROGRESSION STUDIO', 'Let one chord lead.', 'Shape a sequence. Hear the space between the notes.'],
  practice: ['YOUR PRACTICE SPACE', 'A little more familiar.', 'Take your time. Read the notes, then find your way.']
};
export function setExperience(mode) {
  document.body.dataset.experience=mode;
  document.querySelectorAll('[data-modes]').forEach(node=>{node.hidden=!node.dataset.modes.split(' ').includes(mode);});
  document.querySelectorAll('[data-mode]').forEach(button=>{
    const active=button.dataset.mode===mode;
    button.classList.toggle('active',active);button.setAttribute('aria-pressed',active);
    if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
  });
  ['experience-kicker','experience-title','experience-description'].forEach((id,i)=>{document.getElementById(id).textContent=CONTENT[mode][i];});
  if(mode!=='explore')document.getElementById('bach-panel').hidden=true;
}
export function openDisclosure(id) {
  const node=document.getElementById(id);node.open=true;
  node.scrollIntoView({block:'nearest',behavior:'instant'});
}
export function bindLayout() {
  const $=id=>document.getElementById(id);
  const sound=open=>{$('sound-settings').hidden=!open;$('sound-settings-toggle').setAttribute('aria-expanded',open);};
  $('sound-settings-toggle').addEventListener('click',()=>sound($('sound-settings').hidden));
  $('close-sound').addEventListener('click',()=>{sound(false);$('sound-settings-toggle').focus();});
  $('edit-chord').addEventListener('click',()=>{openDisclosure('chord-editor');$('edit-chord').setAttribute('aria-expanded','true');$('root').focus({preventScroll:true});});
  $('chord-editor').addEventListener('toggle',()=>{$('edit-chord').setAttribute('aria-expanded',$('chord-editor').open);});
  $('toggle-edit').addEventListener('click',()=>{
    const editing=$('toggle-edit').getAttribute('aria-expanded')!=='true';
    document.body.classList.toggle('editing-progression',editing);
    $('toggle-edit').setAttribute('aria-expanded',editing);$('toggle-edit').textContent=editing?'Done editing':'Edit chords';
  });
  $('open-save').addEventListener('click',()=>{
    const open=$('save-panel').hidden;$('save-panel').hidden=!open;$('open-save').setAttribute('aria-expanded',open);
    if(open)$('save-name').focus({preventScroll:true});
  });
  $('bach-options').addEventListener('click',()=>{$('study-transport').scrollIntoView({block:'center',behavior:'instant'});$('study-tempo').focus({preventScroll:true});});
  // An error inside a collapsed editor must be visible. No timers or observers:
  // the feedback component emits once, only when a message is added.
  document.addEventListener('studio-feedback',event=>{
    const {region,kind}=event.detail;
    if(region.id==='audio-feedback')sound(true);
    if(region.id==='save-feedback'){$('save-panel').hidden=false;$('open-save').setAttribute('aria-expanded','true');}
    if(kind==='error'){
      for(let parent=region.parentElement;parent;parent=parent.parentElement)if(parent.tagName==='DETAILS')parent.open=true;
    }
  });
}
