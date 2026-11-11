// Presentation only: imported titles, instructions and musical records stay untouched.
export const REGISTER_KEY='jlk-weekly-registers-v1';
export const lessonTitle=title=>title.replace(/^Week\s+\d+\s*[—–:-]\s*/i,'');
export const lessonGoal=lesson=>(lesson.goal||lesson.style||'').replace(/^(?:Today's goal|Goal):\s*/i,'');
export function practiceRegisters(raw){
 let saved;try{saved=JSON.parse(raw);}catch{}
 return Object.fromEntries(Object.entries({lh:3,rh:4}).map(([hand,fallback])=>[hand,Number.isInteger(saved?.[hand])&&saved[hand]>=2&&saved[hand]<=5?saved[hand]:fallback]));
}
export function instructionBlocks(section){
 // Exact instructions remain accessible in the full lesson. Suppress only explicit
 // LH/RH lines duplicated by the paired playable rows, never narrative guidance.
 const text=section.instructions.split('\n').filter(line=>!(section.rows?.length&&/^\s*(?:\d+[.)]\s*)?(?:LH|RH):/.test(line))).join('\n');
 return text.split(/\n\s*\n/).map(s=>s.trim()).filter(Boolean);
}
