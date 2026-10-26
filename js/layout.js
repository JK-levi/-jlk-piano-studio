// Lightweight task navigation. Panels and musical controls are moved, never
// cloned; all application state and audio handlers keep their original owners.
const CONTENT={
  explore:['THE CHORD EXPLORER','See the harmony.','A note on the page. A key beneath your fingers.'],
  studio:['THE PROGRESSION STUDIO','Let one chord lead.','A sequence, a tempo, a little room to play.'],
  practice:['YOUR PRACTICE SPACE','A little more familiar.','Read the notes. Find each key. Take your time.']
};
const TITLES={'chord-editor':'Chord editor','theory-details':'Theory & intervals','bach-panel':'Guided studies','sequence-editor':'Edit progression','save-panel':'Progression library','sound-settings':'Sound settings','voicing-view':'Selected chord','browse-panel':'Browse & Play','composition-panel':'Create sheet music'};
const $=id=>document.getElementById(id);
let frames=[],registry=new Map(),serial=0,loans=[],returnScroll=0,returnFocus=null,rootURL,session,closing=false;
export const currentView=()=>frames.at(-1)?.id||null;
function loan(id,parent,prepend=false){
  const node=$(id);loans.push({node,parent:node.parentNode,next:node.nextSibling,hidden:node.hidden});node.hidden=false;
  if(prepend)parent.prepend(node);else parent.append(node);
}
function restoreLoans(){
  for(const item of loans.reverse()){
    item.parent.insertBefore(item.node,item.next?.parentNode===item.parent?item.next:null);item.node.hidden=item.hidden;
  }
  loans=[];
}
function mount(next){
  const previous=currentView(),old=frames.at(-1),dialog=$('task-view');
  if(old)old.scroll=$('task-body').scrollTop;
  restoreLoans();
  if(old)$('task-dock').append($(old.id));
  frames=next;
  const frame=frames.at(-1),id=frame?.id||null;
  document.body.dataset.task=id||'';
  document.body.classList.toggle('editing-progression',id==='sequence-editor');
  $('edit-chord').setAttribute('aria-expanded',id==='chord-editor');
  $('toggle-edit').setAttribute('aria-expanded',id==='sequence-editor');
  $('open-save').setAttribute('aria-expanded',id==='save-panel');
  $('sound-settings-toggle').setAttribute('aria-expanded',id==='sound-settings');
  if(frame){
    $('task-title').textContent=TITLES[id];$('task-body').append($(id));
    if(id==='sequence-editor'){loan('progression',$('edit-cards-slot'));loan('studio-feedback',$('edit-feedback-slot'));}
    if(id==='browse-panel')loan('studio-feedback',$('browse-feedback-slot'));
    if(id==='save-panel')loan('studio-feedback',$('library-feedback-slot'));
    if(id==='voicing-view'){loan('musical-visuals',$('voicing-visuals-slot'));loan('sequence-transport',$('voicing-transport-slot'));}
    if(id==='bach-panel'){
      loan('keyboard-panel',$('bach-keyboard-slot'));loan('study-transport',$('bach-transport-slot'));
      loan('stop-bach',$('study-transport').querySelector('.play-actions'),true);
      loan('play-bach',$('study-transport').querySelector('.play-actions'),true);
    }
    if(!dialog.open){
      document.body.style.top=`-${returnScroll}px`;document.body.classList.add('task-open');dialog.showModal();
    }
    $('task-body').scrollTop=frame.scroll;
    const focus=frame.focus?.isConnected&&frame.focus.closest('#task-body')?frame.focus:id==='chord-editor'?$('root'):$('task-back');
    focus.focus({preventScroll:true});
  }else if(dialog.open){
    dialog.close();document.body.classList.remove('task-open');document.body.style.top='';
    window.scrollTo({top:returnScroll,behavior:'instant'});
    const trigger=returnFocus?.isConnected&&returnFocus.getClientRects().length?returnFocus:document.querySelector('[data-mode].active');
    trigger?.focus({preventScroll:true});
  }
  document.dispatchEvent(new CustomEvent('studio-view-change',{detail:{previous,next:id}}));
}
export function openView(id){
  if(!TITLES[id])throw new Error(`Unknown task: ${id}`);
  if(currentView()===id||closing)return;
  const retained=new Set(frames.map(frame=>frame.key));
  for(const key of registry.keys())if(!retained.has(key))registry.delete(key);
  if(!frames.length){returnScroll=window.scrollY;returnFocus=document.activeElement;}
  else frames.at(-1).focus=document.activeElement;
  const frame={id,key:++serial,scroll:0,focus:null};registry.set(frame.key,frame);
  const next=[...frames,frame];
  history.pushState({...history.state,jlkTaskSession:session,jlkTasks:next.map(f=>f.key)},'',`${rootURL}#${id}`);
  mount(next);
}
export function returnToWorkspace(){if(frames.length&&!closing){closing=true;history.go(-frames.length);}}
export function closeView(){if(frames.length&&!closing){closing=true;history.back();}}
export function setExperience(mode){
  document.body.dataset.experience=mode;
  document.querySelectorAll('[data-modes]').forEach(node=>{node.hidden=!node.dataset.modes.split(' ').includes(mode);});
  $('workspace').hidden=mode==='studio';
  document.querySelectorAll('[data-mode]').forEach(button=>{
    const active=button.dataset.mode===mode;button.classList.toggle('active',active);button.setAttribute('aria-pressed',active);
    if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
  });
  ['experience-kicker','experience-title','experience-description'].forEach((id,i)=>{$(id).textContent=CONTENT[mode][i];});
}
export function bindLayout(){
  document.addEventListener('pointerdown',()=>{document.body.dataset.input='pointer';},true);
  document.addEventListener('keydown',event=>{if(!event.metaKey&&!event.ctrlKey&&!event.altKey)document.body.dataset.input='keyboard';},true);
  session=`jlk-${Date.now()}`;rootURL=location.pathname+location.search;
  history.replaceState({...history.state,jlkTaskSession:session,jlkTasks:[]},'',rootURL);
  window.addEventListener('popstate',event=>{
    closing=false;
    const keys=event.state?.jlkTaskSession===session?event.state.jlkTasks:[];
    mount((keys||[]).map(key=>registry.get(key)).filter(Boolean));
  });
  $('task-back').addEventListener('click',closeView);$('task-done').addEventListener('click',closeView);
  $('task-view').addEventListener('cancel',event=>{event.preventDefault();closeView();});
  $('task-view').addEventListener('keydown',event=>{
    if(event.key!=='Tab'||event.ctrlKey||event.metaKey||event.altKey)return;
    const controls=[...$('task-view').querySelectorAll('button,input,select,textarea,summary,a[href],[tabindex]')].filter(node=>!node.disabled&&node.tabIndex>=0&&node.getClientRects().length);
    const first=controls[0],last=controls.at(-1),active=document.activeElement;
    if(event.shiftKey&&(active===first||!$('task-view').contains(active))){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&(active===last||!$('task-view').contains(active))){event.preventDefault();first?.focus();}
  });
  for(const [button,view] of Object.entries({'composer-open':'composition-panel','browse-open':'browse-panel','edit-chord':'chord-editor','theory-open':'theory-details','bach':'bach-panel','toggle-edit':'sequence-editor','open-save':'save-panel','sound-settings-toggle':'sound-settings','view-voicing':'voicing-view','new-progression-chord':'chord-editor','voicing-edit':'chord-editor'}))
    $(button).addEventListener('click',()=>openView(view));
  document.addEventListener('studio-feedback',event=>{
    const region=event.detail.region;
    if(region.id==='audio-feedback')openView('sound-settings');
    if(region.id==='save-feedback')openView('save-panel');
  });
}
