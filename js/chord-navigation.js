import {chord,pretty} from './theory.js';

// A view of the existing sequence/selection, never a second chord model.
export function chordNavigation({previous,next,position,strip,onSelect}) {
  let signature='',buttons=[];
  previous.addEventListener('click',()=>onSelect(-1));
  next.addEventListener('click',()=>onSelect(1));
  return ({progression,selected,activeIndex})=>{
    const fresh=JSON.stringify(progression);
    if(signature!==fresh){
      signature=fresh;
      buttons=progression.map((spec,i)=>{
        const button=document.createElement('button');button.type='button';
        button.className='detail-chord';button.dataset.index=i;
        const title=document.createElement('strong');title.textContent=pretty(chord(spec).symbol);
        const number=document.createElement('span');number.textContent=`${i+1}`;
        const status=document.createElement('small');status.textContent='Playing';status.hidden=true;
        button.append(number,title,status);button.setAttribute('aria-label',`Inspect chord ${i+1}: ${title.textContent}`);
        button.addEventListener('click',()=>onSelect(0,i));return button;
      });
      strip.replaceChildren(...buttons);
    }
    position.textContent=progression.length?`${selected+1} of ${progression.length}`:'No chords loaded';
    previous.disabled=!progression.length||selected<=0;next.disabled=!progression.length||selected>=progression.length-1;
    for(const [i,button] of buttons.entries()){
      button.setAttribute('aria-pressed',String(i===selected));
      button.classList.toggle('current',i===selected);button.classList.toggle('playing',i===activeIndex);
      button.querySelector('small').hidden=i!==activeIndex;
    }
    const target=buttons[selected];
    if(target&&strip.getClientRects().length){
      const t=target.getBoundingClientRect(),s=strip.getBoundingClientRect();
      if(t.left<s.left||t.right>s.right)strip.scrollLeft+=t.left-s.left-(s.width-t.width)/2;
    }
  };
}
