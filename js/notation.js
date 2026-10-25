import { pretty } from './theory.js';
const NS='http://www.w3.org/2000/svg';
function el(tag,attrs={},text='') { const node=document.createElementNS(NS,tag); for (const [k,v] of Object.entries(attrs)) node.setAttribute(k,v); if(text)node.textContent=text; return node; }
export function staffPosition(note,clef) {
  const step = note.octave*7+'CDEFGAB'.indexOf(note.letter);
  return (clef==='treble'?106:206)-5*(step-(clef==='treble'?4*7+2:2*7+4));
}
function clef(svg,type,x,y) {
  if (type==='treble') {
    svg.append(el('path',{d:`M ${x+13} ${y+48} C ${x-8} ${y+36}, ${x+4} ${y+19}, ${x+17} ${y+14} C ${x+36} ${y+7}, ${x+27} ${y-16}, ${x+22} ${y-18} C ${x+7} ${y-5}, ${x+21} ${y+29}, ${x+23} ${y+52} C ${x+26} ${y+74}, ${x+7} ${y+72}, ${x+10} ${y+62} M ${x+11} ${y+43} C ${x-1} ${y+24}, ${x+35} ${y+22}, ${x+29} ${y+43} C ${x+24} ${y+56}, ${x+2} ${y+51}, ${x+3} ${y+37}`,fill:'none',stroke:'#25303b','stroke-width':2.7,'stroke-linecap':'round'}));
    svg.append(el('circle',{cx:x+11,cy:y+63,r:3,fill:'#25303b'}));
  } else {
    svg.append(el('path',{d:`M ${x+6} ${y+13} C ${x+3} ${y-1}, ${x+29} ${y-5}, ${x+26} ${y+14} C ${x+24} ${y+28}, ${x+12} ${y+34}, ${x+5} ${y+38}`,fill:'none',stroke:'#25303b','stroke-width':3}));
    svg.append(el('circle',{cx:x+8,cy:y+10,r:4,fill:'#25303b'}));
    for (const dy of [5,15]) svg.append(el('circle',{cx:x+34,cy:y+dy,r:2,fill:'#25303b'}));
  }
}
export function renderNotation(container,notes,{labels=true,figure=false}={}) {
  const svg=el('svg',{viewBox:'0 0 660 268',role:'img','aria-label':`${figure?'Broken chord':'Grand staff'}: ${notes.map(n=>pretty(n.fullName)).join(', ')}`});
  const highest = Math.min(0, ...notes.map(n=>staffPosition(n,n.midi<60?'bass':'treble')-38));
  svg.setAttribute('viewBox', `0 ${highest} 660 ${268-highest}`);
  svg.append(el('title',{},`${notes.map(n=>pretty(n.fullName)).join(', ')}. Middle C is C4.`));
  for(const [type,top] of [['treble',66],['bass',166]]) {
    for(let i=0;i<5;i++) svg.append(el('line',{x1:32,x2:628,y1:top+10*i,y2:top+10*i,stroke:'#8b908e','stroke-width':0.9}));
    clef(svg,type,43,top);
  }
  svg.append(el('path',{d:'M 26 63 Q 8 91 26 132 Q 8 171 26 209',fill:'none',stroke:'#25303b','stroke-width':2}));
  svg.append(el('line',{x1:32,x2:32,y1:66,y2:206,stroke:'#25303b'}));
  svg.append(el('line',{x1:628,x2:628,y1:66,y2:206,stroke:'#25303b'}));
  const groups={treble:[],bass:[]};
  notes.forEach((n,i)=>groups[n.midi<60?'bass':'treble'].push({...n,i}));
  for (const [type,items] of Object.entries(groups)) {
    let prevY=-999, shifted=false;
    const sorted=[...items].sort((a,b)=>staffPosition(b,type)-staffPosition(a,type));
    sorted.forEach((note,index)=>{
      const y=staffPosition(note,type);
      shifted=Math.abs(prevY-y)<10?!shifted:false; prevY=y;
      const x=figure?134+note.i*100:340+(shifted?12:0);
      const top=type==='treble'?66:166, bottom=top+40;
      for(let ly=bottom+10;ly<=y;ly+=10) svg.append(el('line',{x1:x-13,x2:x+13,y1:ly,y2:ly,stroke:'#25303b','stroke-width':1.1}));
      for(let ly=top-10;ly>=y;ly-=10) svg.append(el('line',{x1:x-13,x2:x+13,y1:ly,y2:ly,stroke:'#25303b','stroke-width':1.1}));
      if(note.accidental) {
        const sign=note.accidental>0?'♯'.repeat(note.accidental):'♭'.repeat(-note.accidental);
        svg.append(el('text',{x:figure?x-20:305-index*19,y:y+6,'font-size':23,'text-anchor':'end',fill:'#25303b','font-family':'Georgia, serif'},sign));
      }
      svg.append(el('ellipse',{cx:x,cy:y,rx:7.1,ry:4.7,transform:`rotate(-18 ${x} ${y})`,fill:'#25303b'}));
      svg.append(el('line',{x1:x+6,x2:x+6,y1:y,y2:y-30,stroke:'#25303b','stroke-width':1.4}));
      if(labels) {
        // A separate, aligned reading guide avoids labels obscuring stacked notes.
        const labelX=figure?x:158+note.i*(340/Math.max(notes.length-1,1));
        svg.append(el('text',{x:labelX,y:figure?35:244,'text-anchor':'middle','font-size':15,'font-family':'system-ui',fill:'#685440'},pretty(note.fullName)));
        if(!figure) svg.append(el('text',{x:labelX,y:261,'text-anchor':'middle','font-size':9,'font-family':'system-ui',fill:'#737b80'},String(note.i+1)));
      }
    });
  }
  container.replaceChildren(svg);
}
