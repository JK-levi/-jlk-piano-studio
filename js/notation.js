import { pretty } from './theory.js';
const NS='http://www.w3.org/2000/svg';
function el(tag,attrs={},text='') { const node=document.createElementNS(NS,tag); for (const [k,v] of Object.entries(attrs)) node.setAttribute(k,v); if(text)node.textContent=text; return node; }
export function staffPosition(note,clef) {
  const step = note.octave*7+'CDEFGAB'.indexOf(note.letter);
  return (clef==='treble'?106:206)-5*(step-(clef==='treble'?4*7+2:2*7+4));
}
export function clef(svg,type,x,y) {
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
  const svg=el('svg',{viewBox:'0 0 540 268',role:'img','aria-label':`${figure?'Broken chord':'Grand staff'}: ${notes.map(n=>pretty(n.fullName)).join(', ')}`});
  const highest = Math.min(0, ...notes.map(n=>staffPosition(n,n.midi<60?'bass':'treble')-38));
  svg.setAttribute('viewBox', `0 ${highest} 540 ${268-highest}`);
  svg.append(el('title',{},`${notes.map(n=>pretty(n.fullName)).join(', ')}. Middle C is C4.`));
  for(const [type,top] of [['treble',66],['bass',166]]) {
    for(let i=0;i<5;i++) svg.append(el('line',{x1:32,x2:508,y1:top+10*i,y2:top+10*i,stroke:'#8b908e','stroke-width':0.9}));
    clef(svg,type,43,top);
  }
  svg.append(el('path',{d:'M 26 63 Q 8 91 26 132 Q 8 171 26 209',fill:'none',stroke:'#25303b','stroke-width':2}));
  svg.append(el('line',{x1:32,x2:32,y1:66,y2:206,stroke:'#25303b'}));
  svg.append(el('line',{x1:508,x2:508,y1:66,y2:206,stroke:'#25303b'}));
  const groups={treble:[],bass:[]};
  notes.forEach((n,i)=>groups[n.midi<60?'bass':'treble'].push({...n,i}));
  for (const [type,items] of Object.entries(groups)) {
    let prevY=-999, shifted=false;
    const sorted=[...items].sort((a,b)=>staffPosition(b,type)-staffPosition(a,type));
    sorted.forEach((note,index)=>{
      const y=staffPosition(note,type);
      shifted=Math.abs(prevY-y)<10?!shifted:false; prevY=y;
      const x=figure?134+note.i*100:280+(shifted?12:0);
      const top=type==='treble'?66:166, bottom=top+40;
      for(let ly=bottom+10;ly<=y;ly+=10) svg.append(el('line',{x1:x-13,x2:x+13,y1:ly,y2:ly,stroke:'#25303b','stroke-width':1.1}));
      for(let ly=top-10;ly>=y;ly-=10) svg.append(el('line',{x1:x-13,x2:x+13,y1:ly,y2:ly,stroke:'#25303b','stroke-width':1.1}));
      if(note.accidental) {
        const sign=note.accidental>0?'♯'.repeat(note.accidental):'♭'.repeat(-note.accidental);
        svg.append(el('text',{x:figure?x-20:245-index*19,y:y+6,'font-size':23,'text-anchor':'end',fill:'#25303b','font-family':'Georgia, serif'},sign));
      }
      svg.append(el('ellipse',{'data-midi':note.midi,class:'notehead',cx:x,cy:y,rx:7.1,ry:4.7,transform:`rotate(-18 ${x} ${y})`,fill:'#25303b'}));
      svg.append(el('line',{x1:x+6,x2:x+6,y1:y,y2:y-30,stroke:'#25303b','stroke-width':1.4}));
      if(labels) {
        // A separate, aligned reading guide avoids labels obscuring stacked notes.
        const labelX=figure?x:130+note.i*(290/Math.max(notes.length-1,1));
        svg.append(el('text',{x:labelX,y:figure?35:244,'text-anchor':'middle','font-size':15,'font-family':'system-ui',fill:'#685440'},pretty(note.fullName)));
        if(!figure) svg.append(el('text',{x:labelX,y:261,'text-anchor':'middle','font-size':9,'font-family':'system-ui',fill:'#737b80'},String(note.i+1)));
      }
    });
  }
  container.replaceChildren(svg);
}

// Deliberately small exercise engraver: one bar of eight beamed eighth notes per
// responsive system. No horizontal score scrolling or miniature multi-bar page.
export function renderExercise(container, events, { labels = true } = {}) {
  const fragment = document.createDocumentFragment();
  const bars = Math.ceil(events.length / 8);
  for (let bar = 0; bar < bars; bar++) {
    const slice = events.slice(bar * 8, bar * 8 + 8);
    const notes = slice.map(event => event.notes[0]);
    const highest = Math.min(0, ...notes.map(n => staffPosition(n,n.midi < 60 ? 'bass' : 'treble') - 55));
    const svg = el('svg', { viewBox:`0 ${highest} 660 ${264-highest}`, role:'img', 'aria-label':`Measure ${bar+1}, 4/4, eight eighth notes: ${notes.map(n=>pretty(n.fullName)).join(', ')}` });
    svg.append(el('title', {}, '4/4 • eighth-note study • four beats per measure'));
    for (const [type, top] of [['treble',66],['bass',166]]) {
      for (let line=0;line<5;line++) svg.append(el('line',{x1:32,x2:638,y1:top+line*10,y2:top+line*10,stroke:'#8b908e','stroke-width':0.9}));
      clef(svg,type,40,top);
      for (const y of [top+17,top+37]) svg.append(el('text',{x:96,y,'font-size':22,'font-weight':'bold','text-anchor':'middle',fill:'#25303b'},'4'));
      if (!notes.some(note=>(note.midi<60?'bass':'treble')===type)) svg.append(el('rect',{x:331,y:top+10,width:16,height:5,fill:'#25303b'}));
    }
    for (const x of [32,638]) svg.append(el('line',{x1:x,x2:x,y1:66,y2:206,stroke:'#25303b'}));
    svg.append(el('text',{x:36,y:highest+20,'font-size':11,fill:'#685440','font-family':'system-ui'},`MEASURE ${bar+1} · EIGHTH NOTES`));
    const positions = notes.map((note,i) => ({x:147+i*64,y:staffPosition(note,note.midi<60?'bass':'treble'),note,i}));
    // Beam pairs only within one clef. Clef crossings get individual flags.
    for (let pair=0;pair<positions.length;pair+=2) {
      const parts=positions.slice(pair,pair+2), same=parts.length===2&&(parts[0].note.midi<60)===(parts[1].note.midi<60);
      const beamY=Math.min(...parts.map(p=>p.y))-30;
      parts.forEach(({x,y,note,i})=>{
        const group=el('g',{'data-event-index':bar*8+i});
        const top=note.midi<60?166:66;
        for(let ly=top+50;ly<=y;ly+=10)group.append(el('line',{x1:x-12,x2:x+12,y1:ly,y2:ly,stroke:'#25303b'}));
        for(let ly=top-10;ly>=y;ly-=10)group.append(el('line',{x1:x-12,x2:x+12,y1:ly,y2:ly,stroke:'#25303b'}));
        if(note.accidental) group.append(el('text',{x:x-12,y:y+6,'font-size':22,'text-anchor':'end',fill:'#25303b'},note.accidental>0?'♯'.repeat(note.accidental):'♭'.repeat(-note.accidental)));
        group.append(el('ellipse',{'data-midi':note.midi,'data-event-index':bar*8+i,class:'notehead',cx:x,cy:y,rx:7,ry:4.7,transform:`rotate(-18 ${x} ${y})`,fill:'#25303b'}));
        group.append(el('line',{x1:x+6,x2:x+6,y1:y,y2:same?beamY:y-30,stroke:'#25303b','stroke-width':1.4}));
        if(!same)group.append(el('path',{d:`M ${x+6} ${y-30} q 16 8 3 20`,fill:'none',stroke:'#25303b','stroke-width':2}));
        if(labels)group.append(el('text',{x,y:242,'text-anchor':'middle','font-size':14,fill:'#685440','font-family':'system-ui'},pretty(note.fullName)));
        group.append(el('text',{x,y:260,'text-anchor':'middle','font-size':10,fill:'#737b80','font-family':'system-ui'},i%2===0?String(i/2+1):'&'));
        svg.append(group);
      });
      if(same)svg.append(el('line',{x1:parts[0].x+6,x2:parts[1].x+6,y1:beamY,y2:beamY,stroke:'#25303b','stroke-width':4}));
    }
    fragment.append(svg);
  }
  container.replaceChildren(fragment);
}
