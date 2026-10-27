// Bounded two-hand engraver. Explorer notation keeps its existing renderer.
import {parseNote,pretty,toMidi} from './theory.js';
import {clef} from './notation.js';
import {meter,NOTE_VALUES} from './meter.js';
const NS='http://www.w3.org/2000/svg';
const node=(tag,attrs={},text='')=>{const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text)n.textContent=text;return n;};
export function writtenY(pitch,hand){const n=parseNote(pitch),step=n.octave*7+'CDEFGAB'.indexOf(n.letter);return (hand==='right'?90:230)-5*(step-(hand==='right'?30:18));}
function rest(svg,x,y,duration,id){
 const meta=NOTE_VALUES[duration],base=meta.base,g=node('g',{'data-score-event':id,class:'score-rest'});
 if(base>=2)g.append(node('rect',{x:x-7,y:y+(base===4?-10:-5),width:14,height:5,fill:'#30312f'}));
 else if(base===1)g.append(node('path',{d:`M ${x-3} ${y-15} l 8 10 -9 8 9 8 q -13 -5 -7 8`,fill:'none',stroke:'#30312f','stroke-width':3}));
 else {g.append(node('circle',{cx:x-3,cy:y-6,r:4,fill:'#30312f'}));g.append(node('path',{d:`M ${x-3} ${y-6} q 7 5 10 -2 l -7 24`,fill:'none',stroke:'#30312f','stroke-width':2}));}
 if(meta.dotted)g.append(node('circle',{class:'duration-dot',cx:x+15,cy:y-5,r:2.3,fill:'#30312f'}));svg.append(g);
}
function beamedGroups(entries,groupSize,local,yOf,midline){
 const groups=[];let current=[];
 for(const e of entries){
  if(e.duration!==.5||!e.pitches.length){current=[];continue;}
  const last=current.at(-1),same=last&&Math.abs(local(last)+last.duration-local(e))<1e-8&&Math.floor((local(last)+1e-8)/groupSize)===Math.floor((local(e)+1e-8)/groupSize);
  if(!same){current=[];groups.push(current);}current.push(e);
 }
 const map=new Map();for(const events of groups.filter(g=>g.length>1)){
  const ys=events.flatMap(e=>e.pitches.map(yOf)),down=ys.reduce((sum,y)=>sum+y,0)/ys.length<midline,level=down?Math.max(...ys)+30:Math.min(...ys)-30;
  const group={events,down,level};events.forEach(e=>map.set(e.id,group));
 }
 return map;
}
export function renderScore(container,events,{measures=1,labels=true,title='4/4 study',timeSignature=[4,4]}={}){
 const m=meter(timeSignature),span=m.quarters,fragment=document.createDocumentFragment();
 for(let measure=0;measure<measures;measure++){
  // Explicit ownership keeps overflowing draft notes in their original bar.
  const entries=events.filter(e=>e.measure===undefined?e.beat>=measure*span&&e.beat<(measure+1)*span:e.measure===measure);
  const local=e=>e.localBeat??e.beat-measure*span,occupied=Math.max(span,...entries.map(e=>local(e)+e.duration)),overflow=occupied>span;
  const width=occupied>4?760:580,left=158,right=width-20,scale=(right-left)/occupied,barEnd=left+span*scale;
  const top=Math.min(0,...entries.filter(e=>e.hand==='right').flatMap(e=>e.pitches.map(p=>writtenY(p,'right')-45)));
  const rightLabels=Math.max(130,...entries.filter(e=>e.hand==='right').flatMap(e=>e.pitches.map(p=>writtenY(p,'right')+45)));
  const maxRight=Math.max(1,...entries.filter(e=>e.hand==='right').map(e=>e.pitches.length)),rightEnd=rightLabels+(maxRight-1)*11;
  const leftMin=Math.min(190,...entries.filter(e=>e.hand==='left').flatMap(e=>e.pitches.map(p=>writtenY(p,'left'))));
  const shift=Math.max(0,rightEnd+30-leftMin),leftLabels=Math.max(270+shift,...entries.filter(e=>e.hand==='left').flatMap(e=>e.pitches.map(p=>writtenY(p,'left')+shift+45)));
  const maxLeft=Math.max(1,...entries.filter(e=>e.hand==='left').map(e=>e.pitches.length)),bottom=Math.max(315+shift,leftLabels+maxLeft*11+10);
  const svg=node('svg',{'data-measure':measure,'data-meter':m.key,'data-wide':width>580,'data-overflow':overflow,viewBox:`0 ${top} ${width} ${bottom-top+12}`,role:'img','aria-label':`${title}, ${m.key}, measure ${measure+1}, treble right hand and bass left hand${overflow?', overfilled draft':''}`});
  svg.append(node('title',{},`${title} — measure ${measure+1}, ${m.key}. ${m.pulses} ${m.unit} pulses.${overflow?' Overfilled draft: notes have not been moved.':''}`));
  svg.append(node('text',{x:24,y:top+18,'font-size':11,fill:'#655a49','font-family':'system-ui'},`MEASURE ${measure+1} · ${m.key}${overflow?' · OVERFILLED DRAFT':''}`));
  if(overflow)svg.append(node('rect',{class:'overflow-region',x:barEnd,y:35,width:right-barEnd+10,height:220+shift,fill:'#9c442b18'}));
  for(const [hand,type,y] of [['right','treble',50],['left','bass',190+shift]]){
   for(let i=0;i<5;i++)svg.append(node('line',{x1:24,x2:right,y1:y+i*10,y2:y+i*10,stroke:'#96988f','stroke-width':.8}));
   clef(svg,type,31,y);
   for(const [dy,value]of [[17,m.numerator],[37,m.denominator]])svg.append(node('text',{class:'time-signature',x:91,y:y+dy,'font-size':21,'font-weight':'bold',fill:'#30312f'},String(value)));
   const accidentals=new Map(),voice=entries.filter(e=>e.hand===hand).sort((a,b)=>local(a)-local(b)),yOf=p=>writtenY(p,hand)+(hand==='left'?shift:0),beams=beamedGroups(voice,m.pulseQuarters,local,yOf,y+20);
   for(const event of voice){
    const x=left+local(event)*scale;
    if(!event.pitches.length){rest(svg,x,y+20,event.duration,event.id);continue;}
    const meta=NOTE_VALUES[event.duration],pitches=[...event.pitches].sort((a,b)=>toMidi(a)-toMidi(b)),beam=beams.get(event.id);
    const down=beam?beam.down:pitches.reduce((sum,p)=>sum+yOf(p),0)/pitches.length<y+20;
    let prior=null,stagger=false;const dots=new Set(),group=node('g',{'data-score-event':event.id,class:'score-event','data-duration':event.duration});
    pitches.forEach((pitch,i)=>{
     const p=parseNote(pitch),ny=yOf(pitch);stagger=prior!==null&&Math.abs(prior-ny)<10?!stagger:false;prior=ny;const nx=x+(stagger?(down?-11:11):0);
     for(let ly=y+50;ly<=ny;ly+=10)group.append(node('line',{x1:nx-12,x2:nx+12,y1:ly,y2:ly,stroke:'#30312f'}));
     for(let ly=y-10;ly>=ny;ly-=10)group.append(node('line',{x1:nx-12,x2:nx+12,y1:ly,y2:ly,stroke:'#30312f'}));
     const key=p.letter+p.octave,previous=accidentals.get(key)||0;
     if(p.accidental!==previous){group.append(node('text',{x:x-16-i*13,y:ny+6,'font-size':21,'text-anchor':'end',fill:'#30312f'},p.accidental===0?'♮':p.accidental>0?'♯'.repeat(p.accidental):'♭'.repeat(-p.accidental)));accidentals.set(key,p.accidental);}
     group.append(node('ellipse',{cx:nx,cy:ny,rx:meta.base===4?9:7,ry:4.7,transform:`rotate(-15 ${nx} ${ny})`,fill:meta.base>=2?'#f3efe5':'#30312f',stroke:'#30312f','stroke-width':1.5,'data-midi':toMidi(pitch)}));
     if(meta.dotted)dots.add(Math.round((ny-y)/5)%2===0?ny-5:ny);
     if(labels)group.append(node('text',{x,y:(hand==='right'?rightLabels:leftLabels)+i*11,'text-anchor':'middle','font-size':11,fill:'#655a49','font-family':'system-ui'},pretty(pitch)));
    });
    for(const cy of dots)group.append(node('circle',{class:'duration-dot',cx:x+21,cy,r:2.3,fill:'#30312f'}));
    if(meta.base<4){
     const ys=pitches.map(yOf),stemX=x+(down?-6:6),start=down?Math.min(...ys):Math.max(...ys),end=beam?beam.level:down?Math.max(...ys)+30:Math.min(...ys)-30;
     group.append(node('line',{class:'note-stem',x1:stemX,x2:stemX,y1:start,y2:end,stroke:'#30312f','stroke-width':1.5}));
     if(meta.base===.5&&!beam)group.append(node('path',{d:down?`M ${stemX} ${end} q -16 -7 -4 -20`:`M ${stemX} ${end} q 17 7 4 21`,fill:'none',stroke:'#30312f','stroke-width':2}));
    }
    svg.append(group);
   }
   for(const beam of new Set(beams.values()))svg.append(node('line',{class:'score-beam','data-count':beam.events.length,'data-pulse':Math.floor(local(beam.events[0])/m.pulseQuarters),x1:left+local(beam.events[0])*scale+(beam.down?-6:6),x2:left+local(beam.events.at(-1))*scale+(beam.down?-6:6),y1:beam.level,y2:beam.level,stroke:'#30312f','stroke-width':4}));
  }
  for(const x of [24,barEnd])svg.append(node('line',{class:'bar-line',x1:x,x2:x,y1:50,y2:230+shift,stroke:overflow&&x===barEnd?'#923f2b':'#30312f','stroke-width':overflow&&x===barEnd?2:1}));
  for(let pulse=0;pulse<m.pulses;pulse++)svg.append(node('text',{class:'pulse-guide',x:left+pulse*m.pulseQuarters*scale,y:bottom,'font-size':10,'text-anchor':'middle',fill:'#655a49','font-family':'system-ui'},m.denominator===8?`${pulse+1}-la-li`:String(pulse+1)));
  fragment.append(svg);
 }
 container.replaceChildren(fragment);
}
export function highlightScore(container,active){const ids=new Set(active.map(e=>e.id));container.querySelectorAll('[data-score-event]').forEach(n=>n.classList.toggle('score-sounding',ids.has(n.dataset.scoreEvent)));}
