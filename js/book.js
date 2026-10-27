import {read,write} from './storage.js';
import {buildBook,CORRECTIONS,TECHNIQUE_NOTES} from './book-model.js';

export async function setupBook({feedback}){
 const response=await fetch(new URL('../data/keyboard-book-october-13.json',import.meta.url));
 if(!response.ok)throw Error('Reference download failed.');
 const book=buildBook(await response.json()),$=id=>document.getElementById('book-'+id);
 const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 let indexFocus=null,printDetails=[];
 let current=book.pages.find(p=>p.id===read('keyboard-book-position-v1',null))||book.pages[0],indexScroll=0;
 function linked(text){
  const part=document.createDocumentFragment();let end=0;
  for(const match of text.matchAll(/\b(page|p\.)\s?(\d{1,2})\b/gi)){
   part.append(document.createTextNode(text.slice(end,match.index)));
   const target=book.pages.find(p=>p.num===Number(match[2]));
   if(target){const link=node('button',match[0],'book-reference');link.type='button';link.addEventListener('click',()=>show(target));part.append(link);}
   else part.append(document.createTextNode(match[0]));
   end=match.index+match[0].length;
  }
  part.append(document.createTextNode(text.slice(end)));return part;
 }
 function paragraph(text,cls){const p=node('p',undefined,cls);p.append(linked(text));return p;}
 function front(page,area){
  // Read inert template data, then copy text and permitted formatting into new
  // nodes. Never attach source elements, styles, scripts or event attributes.
  const template=document.createElement('template');template.innerHTML=book.front[page.template];
  function copy(source,dest){
   for(const child of source.childNodes){
    if(child.nodeType===Node.TEXT_NODE)dest.append(document.createTextNode(child.textContent));
    else if(child.nodeName==='BR')dest.append(document.createElement('br'));
    else if(['DIV','B','STRONG'].includes(child.nodeName)){
     const tag=child.classList.contains('cover-h1')||child.classList.contains('title')?'h3':child.nodeName==='DIV'?'div':'strong',target=node(tag);
     copy(child,target);dest.append(target);
    }
   }
  }
  const target=node('div',undefined,'book-front');copy(template.content,target);area.append(target);
  if(page.id==='how-to')area.append(paragraph('In this studio, use Contents and Previous/Next below. Pages scroll normally and zoom stays available.','book-note'));
 }
 function render(page){
  $('page-label').textContent=`Book page ${page.num} · Screen ${book.pages.indexOf(page)+1} of ${book.pages.length}`;
  $('edition').textContent=book.edition;
  const area=$('page');area.replaceChildren();
  if(page.type==='front')front(page,area);
  else {
   area.append(node('p',page.section,'eyebrow'),node('h3',page.title));
   const d=page.source;
   if(page.type==='technique'){
    area.append(paragraph(d.subtitle,'subtle'));if(TECHNIQUE_NOTES[page.title])area.append(paragraph(TECHNIQUE_NOTES[page.title],'book-correction book-technique-note'));const bullets=node('ul');for(const line of d.bullets)bullets.append(node('li',line));area.append(bullets,node('h4','Try it · original reference'),paragraph(book.text(page,d.tryIntro)));
    const steps=node('ol');for(const line of d.trySteps)steps.append(node('li',line));area.append(steps);
   }else{
    area.append(paragraph(d.mood,'subtle'),paragraph(`GO:KEYS 3 patch · ${d.patch}`,'book-patch'),paragraph(book.text(page,d.note),'book-instruction'));
    if(page.section==='Song Vibes')area.append(paragraph('Reference sketches and practice variants, not verified song sections, recording keys or note-for-note transcriptions.','book-note'));
    area.append(paragraph('RH = right hand, in the written order. LH = left-hand bass. Absolute octaves are unspecified; an apostrophe marks the octave above.','fine-print'));
    for(const [label,rows] of d.loops){
     const section=node('section',undefined,'book-loop'),heading=node('h4');heading.append(linked(book.text(page,label)));section.append(heading);
     const table=node('table'),caption=node('caption',book.text(page,label));caption.className='sr-only';table.append(caption);
     const head=node('thead'),tr=node('tr');for(const title of ['Chord','LH · bass','RH · notes']){const th=node('th',title);th.scope='col';tr.append(th);}head.append(tr);table.append(head);
     const body=node('tbody');for(const [chord,rh,lh]of rows){const tr=node('tr');const title=node('th',chord);title.scope='row';tr.append(title,node('td',lh),node('td',rh));body.append(tr);}table.append(body);section.append(table);area.append(section);
    }
    if(CORRECTIONS[page.title]){
     area.append(paragraph(CORRECTIONS[page.title],'book-correction'));
     const original=node('details',undefined,'book-original');original.append(node('summary','Original reference footer'),paragraph(book.text(page,d.footer)));area.append(original);
    }else area.append(paragraph(book.text(page,d.footer),'book-footer'));
   }
  }
  const i=book.pages.indexOf(page);$('previous').disabled=i===0;$('next').disabled=i===book.pages.length-1;
 }
 function show(page){
  if(!$('index').hidden){indexScroll=document.getElementById('task-body').scrollTop;indexFocus=document.activeElement;}
  current=page;render(page);$('index').hidden=true;$('reader').hidden=false;
  if(!write('keyboard-book-position-v1',page.id))feedback.show('book',{id:'storage',kind:'warning',text:'This page still works, but your reading place could not be saved on this device.'});else feedback.clear('book','storage');
  document.getElementById('task-body').scrollTop=0;$('page-label').tabIndex=-1;$('page-label').focus({preventScroll:true});$('continue').textContent=`Continue · ${page.title}`;
 }
 function contents(){
  $('reader').hidden=true;$('index').hidden=false;document.getElementById('task-body').scrollTop=indexScroll;if(indexFocus?.isConnected)indexFocus.focus({preventScroll:true});
 }
 $('numbering').textContent=`Original book labels skip page 3 (Contents). This reader has ${book.pages.length} screens; the closing page is labeled ${book.pages.at(-1).num}.`;
 $('continue').textContent=`Continue · ${current.title}`;$('continue').addEventListener('click',()=>show(current));
 for(const page of book.pages.filter(p=>p.type==='front')){const button=node('button',page.title);button.addEventListener('click',()=>show(page));$('front').append(button);}
 const groups=[];
 for(const section of book.sections){
  const option=node('option',section.name);option.value=section.name;$('section').append(option);
  const group=node('section',undefined,'book-section');group.append(node('h3',section.name));const list=node('ol');
  for(const page of section.items){const item=node('li'),button=node('button',`${page.title} · p. ${page.num}`);button.dataset.page=page.num;button.addEventListener('click',()=>show(page));item.append(button);list.append(item);}group.append(list);$('sections').append(group);groups.push({section,group});
 }
 function filter(){
   const query=$('search').value.trim().toLowerCase();let total=0;
   for(const {section,group}of groups){let matches=0;section.items.forEach((page,i)=>{const haystack=[page.title,page.source.mood,page.source.patch,page.source.subtitle].filter(Boolean).join(' ').toLowerCase(),match=(!$('section').value||$('section').value===section.name)&&haystack.includes(query);group.querySelectorAll('li')[i].hidden=!match;if(match)matches++;});group.hidden=!matches;total+=matches;}
   $('matches').textContent=total?`${total} reference pages`:'No matches. Clear the search or choose All sections.';
 }
 $('section').addEventListener('change',filter);$('search').addEventListener('input',filter);filter();
 $('contents').addEventListener('click',contents);
 $('previous').addEventListener('click',()=>show(book.pages[book.pages.indexOf(current)-1]));$('next').addEventListener('click',()=>show(book.pages[book.pages.indexOf(current)+1]));
 window.addEventListener('beforeprint',()=>{if(document.body.dataset.task!=='book-panel')return;printDetails=[...$('page').querySelectorAll('details')].map(n=>[n,n.open]);for(const [n]of printDetails)n.open=true;});
 window.addEventListener('afterprint',()=>{for(const [n,open]of printDetails)n.open=open;printDetails=[];});
 let touch=null;
 $('page').addEventListener('touchstart',event=>{
   const t=event.touches[0];touch=event.touches.length===1&&t.clientX>30&&t.clientX<innerWidth-30&&!event.target.closest('button,a,summary')?{x:t.clientX,y:t.clientY}:null;
 },{passive:true});
 $('page').addEventListener('touchmove',event=>{if(event.touches.length!==1)touch=null;},{passive:true});
 $('page').addEventListener('touchcancel',()=>{touch=null;},{passive:true});
 $('page').addEventListener('touchend',event=>{
   if(!touch||!event.changedTouches[0])return;const t=event.changedTouches[0],dx=t.clientX-touch.x,dy=t.clientY-touch.y;touch=null;
   if(Math.abs(dx)<75||Math.abs(dx)<Math.abs(dy)*1.5)return;const next=book.pages[book.pages.indexOf(current)+(dx<0?1:-1)];if(next)show(next);
 },{passive:true});
 $('print').addEventListener('click',()=>window.print());
 return {open:()=>{$('section').value=document.getElementById('book-panel').dataset.section||'';$('search').value='';filter();contents();}};
}
