// Presentation only: imported titles, instructions and musical records stay untouched.
export const REGISTER_KEY='jlk-weekly-registers-v1';
export const lessonTitle=title=>title.replace(/^Week\s+\d+\s*[—–:-]\s*/i,'');
export const lessonGoal=lesson=>readableLessonText(lesson.goal||lesson.style||'').replace(/^(?:Today's goal|Goal):\s*/i,'');
export function practiceRegisters(raw){
 let saved;try{saved=JSON.parse(raw);}catch{}
 return Object.fromEntries(Object.entries({lh:3,rh:4}).map(([hand,fallback])=>[hand,Number.isInteger(saved?.[hand])&&saved[hand]>=2&&saved[hand]<=5?saved[hand]:fallback]));
}
export function instructionBlocks(section){
 // Exact instructions remain accessible in the full lesson. Suppress only explicit
 // LH/RH lines duplicated by the paired playable rows, never narrative guidance.
 const text=section.instructions.split('\n').filter(line=>!(section.rows?.length&&!section.rows.some(row=>row.variation)&&/^\s*(?:\d+[.)]\s*)?(?:LH|RH):/.test(line))).join('\n');
 return text.split(/\n\s*\n/).map(s=>s.trim()).filter(Boolean);
}
// Export tokens are archival data, not readable lesson prose. Keep names and
// media descriptions; never turn unresolved citation IDs into fabricated URLs.
export function readableLessonText(text){
 return String(text||'').replace(/entity(\[[\s\S]*?\])/g,(_,raw)=>{try{return JSON.parse(raw)[1]||'';}catch{return '';}})
 .replace(/video([^]+)(?:[^]*)?/g,'$1')
 .replace(/[^]*/g,'').replace(/^#{1,6}\s+/gm,'').replace(/\*\*([^*]+)\*\*/g,'$1').replace(/`([^`]+)`/g,'$1').replace(/^---+\s*$/gm,'').trim();
}
