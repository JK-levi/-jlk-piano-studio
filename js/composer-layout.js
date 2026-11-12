// Reorganize the existing controls without cloning IDs, handlers or musical state.
export function organizeComposer(){
 const $=id=>document.getElementById('composition-'+id),root=$('content');
 const create=(tag,cls)=>{const n=document.createElement(tag);n.className=cls;return n;};
 const metadata=$('title').closest('.settings-grid'),entry=$('hand').closest('.entry-panel'),suggestions=$('chord-suggestions').closest('.entry-panel'),selection=$('events').closest('.entry-panel'),library=$('library').closest('details');
 const title=create('div','composer-title');title.append($('title').closest('label'));
 const nav=create('nav','composer-tabs');nav.setAttribute('aria-label','Composer working areas');
 const workspace=create('div','composer-workspace'),score=create('div','composer-score-column'),editor=create('div','composer-editor');
 workspace.id='composition-workspace';
 const settings=create('section','composer-settings'),pieces=create('section','composer-pieces');settings.id='composition-settings';pieces.id='composition-pieces';
 const controls=create('div','composer-toolbar');controls.setAttribute('aria-label','Playback and saving');
 for(const id of ['play','stop','undo','save'])controls.append($(id));
 const redo=create('button','');redo.id='composition-redo';redo.textContent='Redo';controls.insertBefore(redo,controls.querySelector('#composition-save'));
 const help=create('details','disclosure');help.innerHTML='<summary>Meter & playback help</summary>';
 for(const n of [...root.children])if(n.matches('p.fine-print'))help.append(n);
 settings.append(metadata,$('print'),$('labels').closest('label'),$('show-all').closest('label'),help);
 const clearPiece=create('button','');clearPiece.id='composition-clear-piece';clearPiece.textContent='Clear working piece…';settings.append(clearPiece);
 library.open=true;library.querySelector('summary').remove();pieces.append(...library.childNodes);library.remove();
 entry.querySelector('h3').textContent='Write notes';entry.querySelector('.subtle').remove();suggestions.querySelector('h3').textContent='Suggestions';suggestions.querySelector('.subtle').remove();
 const helpDelete=selection.querySelector('.fine-print');helpDelete.textContent='Delete removes the selected event and closes its gap in this hand only. Undo restores it.';
 const deleteHelp=create('details','selection-help');deleteHelp.innerHTML='<summary>Editing help</summary>';deleteHelp.append(helpDelete);selection.append(deleteHelp);
 $('delete-event').textContent='Delete Selection';controls.querySelector('#composition-play').textContent='Play';controls.querySelector('#composition-save').textContent='Save';for(const option of $('hand').options)option.textContent=option.value==='left'?'LH':'RH';
 const toneLabel=create('label','selection-tone');toneLabel.innerHTML='Note within chord<select id="composition-selected-tone"><option value="">Whole event</option></select>';
 const clearMeasure=create('button','');clearMeasure.id='composition-clear-measure';clearMeasure.textContent='Clear hand / measure…';
 selection.append(toneLabel,clearMeasure);selection.classList.add('composer-selection');
 const selectionDrawer=create('details','composer-selection-drawer');selectionDrawer.id='composition-selection-drawer';selectionDrawer.innerHTML='<summary>Edit selection / clear measure</summary>';selectionDrawer.append(selection);
 score.append($('print-area'),controls,$('position'),selectionDrawer);
 editor.append(entry,suggestions);workspace.append(score,editor);
 root.querySelector(':scope > .eyebrow')?.remove();root.querySelector(':scope > .catalogue-actions')?.remove();
 root.append(title,nav,$('meter-issues'),workspace,settings,pieces);
 $('see-score').hidden=true;
 const views={write:[workspace,entry],suggestions:[workspace,suggestions],settings:[settings],pieces:[pieces]};
 function show(name){for(const n of [workspace,entry,suggestions,settings,pieces])n.hidden=!views[name].includes(n);nav.querySelectorAll('button').forEach(n=>n.setAttribute('aria-pressed',String(n.dataset.composerTab===name)));document.getElementById('task-body').scrollTop=0;}
 for(const [name,label]of Object.entries({write:'Notes',suggestions:'Suggestions',settings:'Piece Settings',pieces:'My Pieces / Backups'})){
  const b=create('button','');b.textContent=label;b.dataset.composerTab=name;b.onclick=()=>show(name);nav.append(b);
 }
 for(const panel of [settings,pieces]){const back=create('button','');back.textContent='← Score';back.onclick=()=>show('write');panel.prepend(back);}
 show('write');return {show};
}
