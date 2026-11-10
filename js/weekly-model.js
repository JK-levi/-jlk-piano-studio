// Source content and personal practice records deliberately have separate keys.
export const CONTENT_KEY='jlk-weekly-content-v1', PROGRESS_KEY='jlk-weekly-progress-v1';
export const HISTORICAL_DATES=Array.from({length:18},(_,i)=>new Date(Date.UTC(2026,6,12+i*7)).toISOString().slice(0,10));
const pitch=/^([A-G])([#b♯♭]{0,2})([0-8])?$/;
export function validateLesson(value){
 const errors=[],warnings=[];const l=value;
 if(!l||typeof l!=='object')return {errors:['Lesson must be an object.'],warnings};
 if(l.schemaVersion!==1)errors.push('schemaVersion must be 1.');
 if(typeof l.id!=='string'||!/^weekly-[a-zA-Z0-9-]+$/.test(l.id))errors.push('Use a stable ID beginning weekly-.');
 if(typeof l.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(l.date)||!Number.isFinite(Date.parse(l.date))||new Date(l.date).toISOString().slice(0,10)!==l.date)errors.push('Use a valid publication date YYYY-MM-DD.');
 for(const k of ['title','originalText'])if(typeof l[k]!=='string'||!l[k].trim())errors.push(`${k} is required.`);
 if(!l.source||!['complete','substantially-complete','partial'].includes(l.source.completeness)||typeof l.source.description!=='string'||!l.source.description.trim())errors.push('Source description and completeness are required.');
 if(l.bpm!=null&&(!Number.isFinite(l.bpm)||l.bpm<40||l.bpm>180))errors.push('BPM must be 40–180, or null when unknown.');
 if(l.durationMinutes!=null&&(!Number.isFinite(l.durationMinutes)||l.durationMinutes<=0))errors.push('Duration must be positive or null.');
 if(l.style!=null&&typeof l.style!=='string')errors.push('Style must be text.');
 if(!Array.isArray(l.sections)||!l.sections.length||l.sections.length>100)errors.push('Provide 1–100 ordered sections.');
 const ids=new Set();
 for(const s of Array.isArray(l.sections)?l.sections:[]){
  if(!s||typeof s.id!=='string'||!s.id||ids.has(s.id)){errors.push('Section IDs must be unique.');continue;}ids.add(s.id);
  if(typeof s.title!=='string'||typeof s.instructions!=='string')errors.push(`${s.id}: title and instructions must be text.`);
  if(s.pattern&&!['sequence','synth-pop'].includes(s.pattern))errors.push(`${s.id}: unsupported rhythm; preserve it as readable instructions.`);
  if(s.rows!=null&&!Array.isArray(s.rows))errors.push(`${s.id}: rows must be an array.`);
  for(const r of Array.isArray(s.rows)?s.rows:[]){
   for(const hand of ['lh','rh',...(r?.variation?['variation']:[])]){
    if(!Array.isArray(r?.[hand])){errors.push(`${s.id}: ${hand} must be an explicit note array (empty for silence).`);continue;}
    for(const n of r[hand])if(typeof n!=='string'||!pitch.test(n))errors.push(`${s.id}: invalid note ${String(n)}.`);else if(!pitch.exec(n)[3])warnings.push(`${s.id}: ${n} has no source octave. Choose practice registers before hearing it.`);
   }
  }
  if(s.rows?.length&&!s.pattern)warnings.push(`${s.id}: exact timing unspecified; chord audition only.`);
  if(s.pattern==='sequence')warnings.push(`${s.id}: source rhythm unspecified; note audition only.`);
 }
 return {errors,warnings:[...new Set(warnings)]};
}
export function parseImport(text,meta={}){
 if(text.length>1000000)throw Error('Lesson exceeds the 1 MB limit.');
 let lesson;
 if(text.trim().startsWith('{')){try{lesson=JSON.parse(text);}catch{throw Error('Invalid JSON. Check commas and quotation marks.');}}
 else {lesson={schemaVersion:1,id:meta.id||`weekly-${meta.date}`,date:meta.date,title:meta.title,durationMinutes:null,bpm:null,style:meta.style||'',source:{description:meta.source,completeness:meta.completeness||'partial'},originalText:text,sections:[{id:'original',title:'Original lesson',instructions:text,rows:[]}]};}
 const report=validateLesson(lesson);if(report.errors.length)throw Error(report.errors.join('\n'));
 return {lesson,warnings:report.warnings};
}
export function upsert(lessons,lesson){const report=validateLesson(lesson);if(report.errors.length)throw Error(report.errors.join('\n'));const collision=lessons.find(l=>l.date===lesson.date&&l.id!==lesson.id);if(collision)throw Error(`This date already uses ID ${collision.id}. Use that ID to update it.`);return [...lessons.filter(l=>l.id!==lesson.id),lesson].sort((a,b)=>b.date.localeCompare(a.date));}
export function noteForPractice(text,octave){const m=pitch.exec(text);if(!m)throw Error('Invalid note.');if(!m[3]&&!Number.isInteger(octave))throw Error('Choose a practice register. Source octaves are unspecified.');const accidental=[...m[2]].reduce((n,c)=>n+('#♯'.includes(c)?1:-1),0),o=m[3]?Number(m[3]):octave;return {letter:m[1],accidental,octave:o,midi:(o+1)*12+({C:0,D:2,E:4,F:5,G:7,A:9,B:11}[m[1]])+accidental,name:text,fullName:m[1]+m[2]+o};}
export function rhythmPlan(section,registers,{variation=false,countIn=true}={}){
 if(section.pattern!=='synth-pop')throw Error('This source has no exact playable rhythm.');
 const events=[],offset=countIn?4:0;
 if(countIn)for(let i=0;i<4;i++)events.push({beat:i,duration:0.1,click:true,accent:i===0});
 section.rows.forEach((row,i)=>{const beat=offset+i*4,notes=(hand)=>row[hand].map(n=>noteForPractice(n,registers[hand]));if(row.lh.length)events.push({beat,duration:3.5,notes:notes('lh'),hand:'lh'});[0,1.5,3].forEach((hit,j)=>{const ns=variation&&j===2&&row.variation?row.variation.map(n=>noteForPractice(n,registers.rh)):notes('rh');if(ns.length)events.push({beat:beat+hit,duration:0.5,notes:ns,hand:'rh'});});});
 return {beats:offset+section.rows.length*4,events:events.sort((a,b)=>a.beat-b.beat)};
}
export function completeSection(record,lesson,index,now=new Date().toISOString()){
 const next=structuredClone(record||{index:0,completed:[],runs:[],favorite:false});next.completed=[...new Set([...(next.completed||[]),lesson.sections[index].id])];next.index=Math.min(index+1,lesson.sections.length-1);
 if(lesson.sections.every(s=>next.completed.includes(s.id))&&!next.finished){next.runs=[...(next.runs||[]),{at:now,sections:[...next.completed]}];next.finished=true;}return next;
}
export function restart(record){return {...record,index:0,completed:[],finished:false};}
