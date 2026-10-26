// Small independent 4/4 engraver for timed two-hand exercises and short scores.
// Explorer engraving remains unchanged. Explicit accidentals; no key signature.
import { parseNote, pretty, toMidi } from './theory.js';
import { clef } from './notation.js';
const NS='http://www.w3.org/2000/svg';
const node=(tag,attrs={},text='')=>{const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text)n.textContent=text;return n;};
export function writtenY(pitch,hand){const n=parseNote(pitch),step=n.octave*7+'CDEFGAB'.indexOf(n.letter);return (hand==='right'?90:230)-5*(step-(hand==='right'?30:18));}
function rest(svg,x,y,duration,id){
 const g=node('g',{'data-score-event':id,class:'score-rest'});
 if(duration>=2)g.append(node('rect',{x:x-7,y:y+(duration===4?-10:-5),width:14,height:5,fill:'#30312f'}));
 else if(duration===1)g.append(node('path',{d:`M ${x-3} ${y-15} l 8 10 -9 8 9 8 q -13 -5 -7 8`,fill:'none',stroke:'#30312f','stroke-width':3}));
 else {g.append(node('circle',{cx:x-3,cy:y-6,r:4,fill:'#30312f'}));g.append(node('path',{d:`M ${x-3} ${y-6} q 7 5 10 -2 l -7 24`,fill:'none',stroke:'#30312f','stroke-width':2}));}
 svg.append(g);
}
export function renderScore(container,events,{measures=1,labels=true,title='4/4 study'}={}){
 const fragment=document.createDocumentFragment();
 for(let measure=0;measure<measures;measure++){
  const entries=events.filter(e=>e.beat>=measure*4&&e.beat<(measure+1)*4);
  const top=Math.min(0,...entries.filter(e=>e.hand==='right').flatMap(e=>e.pitches.map(p=>writtenY(p,'right')-45)));
  const rightLabels=Math.max(130,...entries.filter(e=>e.hand==='right').flatMap(e=>e.pitches.map(p=>writtenY(p,'right')+23)));
  const maxRight=Math.max(1,...entries.filter(e=>e.hand==='right').map(e=>e.pitches.length)),rightEnd=rightLabels+(maxRight-1)*11;
  const leftMin=Math.min(190,...entries.filter(e=>e.hand==='left').flatMap(e=>e.pitches.map(p=>writtenY(p,'left'))));
  const shift=Math.max(0,rightEnd+30-leftMin),leftLabels=Math.max(270+shift,...entries.filter(e=>e.hand==='left').flatMap(e=>e.pitches.map(p=>writtenY(p,'left')+shift+23)));
  const maxLeft=Math.max(1,...entries.filter(e=>e.hand==='left').map(e=>e.pitches.length));
  const bottom=Math.max(315+shift,leftLabels+maxLeft*11+10);
  const svg=node('svg',{'data-measure':measure,viewBox:`0 ${top} 580 ${bottom-top+12}`,role:'img','aria-label':`${title}, measure ${measure+1}, treble right hand and bass left hand`});
  svg.append(node('title',{},`${title} — measure ${measure+1}. Each column is the same beat in both hands.`));
  svg.append(node('text',{x:24,y:top+18,'font-size':11,fill:'#655a49','font-family':'system-ui'},`MEASURE ${measure+1} · 4/4`));
  for(const [hand,type,y] of [['right','treble',50],['left','bass',190+shift]]){
   for(let i=0;i<5;i++)svg.append(node('line',{x1:24,x2:562,y1:y+i*10,y2:y+i*10,stroke:'#96988f','stroke-width':.8}));
   clef(svg,type,31,y);
   for(const dy of [17,37])svg.append(node('text',{x:91,y:y+dy,'font-size':21,'font-weight':'bold',fill:'#30312f'},'4'));
   const accidentals=new Map();
   for(const event of entries.filter(e=>e.hand===hand).sort((a,b)=>a.beat-b.beat)){
    const x=126+(event.beat-measure*4)*106;
    if(!event.pitches.length){rest(svg,x,y+20,event.duration,event.id);continue;}
    const pitches=[...event.pitches].sort((a,b)=>toMidi(a)-toMidi(b));
    const down=pitches.reduce((sum,p)=>sum+(writtenY(p,hand)+(hand==='left'?shift:0)),0)/pitches.length<y+20;
    let prior=null,stagger=false;
    const group=node('g',{'data-score-event':event.id,class:'score-event'});
    pitches.forEach((pitch,i)=>{
     const p=parseNote(pitch),ny=writtenY(pitch,hand)+(hand==='left'?shift:0);stagger=prior!==null&&Math.abs(prior-ny)<10?!stagger:false;prior=ny;
     const nx=x+(stagger?(down?-11:11):0);
     for(let ly=y+50;ly<=ny;ly+=10)group.append(node('line',{x1:nx-12,x2:nx+12,y1:ly,y2:ly,stroke:'#30312f'}));
     for(let ly=y-10;ly>=ny;ly-=10)group.append(node('line',{x1:nx-12,x2:nx+12,y1:ly,y2:ly,stroke:'#30312f'}));
     const key=p.letter+p.octave,previous=accidentals.get(key)||0;
     if(p.accidental!==previous){group.append(node('text',{x:x-16-i*13,y:ny+6,'font-size':21,'text-anchor':'end',fill:'#30312f'},p.accidental===0?'♮':p.accidental>0?'♯'.repeat(p.accidental):'♭'.repeat(-p.accidental)));accidentals.set(key,p.accidental);}
     group.append(node('ellipse',{cx:nx,cy:ny,rx:event.duration===4?9:7,ry:4.7,transform:`rotate(-15 ${nx} ${ny})`,fill:event.duration>=2?'#f3efe5':'#30312f',stroke:'#30312f','stroke-width':1.5,'data-midi':toMidi(pitch)}));
     if(labels)group.append(node('text',{x,y:(hand==='right'?rightLabels:leftLabels)+i*11,'text-anchor':'middle','font-size':11,fill:'#655a49','font-family':'system-ui'},pretty(pitch)));
    });
    if(event.duration<4){
     const ys=pitches.map(p=>writtenY(p,hand)+(hand==='left'?shift:0)),stemX=x+(down?-6:6),start=down?Math.min(...ys):Math.max(...ys),end=down?Math.max(...ys)+30:Math.min(...ys)-30;
     group.append(node('line',{x1:stemX,x2:stemX,y1:start,y2:end,stroke:'#30312f','stroke-width':1.5}));
     if(event.duration===.5)group.append(node('path',{d:down?`M ${stemX} ${end} q -16 -7 -4 -20`:`M ${stemX} ${end} q 17 7 4 21`,fill:'none',stroke:'#30312f','stroke-width':2}));
    }
    svg.append(group);
   }
  }
  for(const x of [24,562])svg.append(node('line',{x1:x,x2:x,y1:50,y2:230+shift,stroke:'#30312f'}));
  fragment.append(svg);
 }
 container.replaceChildren(fragment);
}
export function highlightScore(container,active){const ids=new Set(active.map(e=>e.id));container.querySelectorAll('[data-score-event]').forEach(n=>n.classList.toggle('score-sounding',ids.has(n.dataset.scoreEvent)));}
