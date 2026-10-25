import { parseNote, toMidi } from './theory.js';
const notes=pitches=>pitches.map(fullName=>({...parseNote(fullName),fullName,midi:toMidi(fullName)}));
const e=(id,hand,beat,duration,pitches)=>({id,hand,beat,duration,pitches,notes:notes(pitches)});
function pattern(id,bars,basses=[]){const events=[];bars.forEach((bar,m)=>{bar.forEach((p,i)=>events.push(e(`${id}-r${m}-${i}`,'right',m*4+i*.5,.5,[p])));events.push(e(`${id}-l${m}`,'left',m*4,4,basses[m]?[basses[m]]:[]));});return events;}
export const STUDIES=[
 {id:'shape',name:'Find the Shape',tempo:64,goal:'Hear a C major shape unfold, one note at a time.',notice:'Listen once. Follow the warm key highlights, then try the right hand slowly.',events:pattern('shape',[['C4','E4','G4','C5','G4','E4','G4','E4']]),measures:1},
 {id:'feeling',name:'A Change of Feeling',tempo:66,goal:'Hear the same phrase turn from bright to more reflective.',notice:'The E changes to E-flat in the second measure. Try changing just that note.',events:pattern('feeling',[['C4','E4','G4','E4','C5','G4','E4','G4'],['C4','Eb4','G4','Eb4','C5','G4','Eb4','G4']]),measures:2},
 {id:'hands',name:'Two Hands Together',tempo:56,goal:'Hold one low note while the right hand keeps moving.',notice:'Try the right hand alone first. Then add the long left-hand notes on each first beat.',events:pattern('hands',[['C4','E4','G4','E4','C5','G4','E4','G4'],['F4','A4','C5','A4','F4','C5','A4','C5'],['G4','B4','D5','B4','G4','D5','B4','D5'],['C4','E4','G4','E4','C5','G4','E4','C4']],['C3','F2','G2','C3']),measures:4},
 {id:'bach',name:'A Moment with Bach',tempo:60,goal:'Let a flowing pattern travel through four different harmonies.',notice:'Original Bach-inspired arrangement, not a transcription of BWV 846. The harmony moves C–Am–Dm–G7; eighth notes replace Bach’s original sixteenth-note texture.',events:pattern('bach',[['C4','E4','G4','C5','E5','G4','C5','E5'],['A3','C4','E4','A4','C5','E4','A4','C5'],['D4','F4','A4','D5','F5','A4','D5','F5'],['G3','B3','D4','F4','B4','D4','F4','B4']],['C3','A2','D3','G2']),measures:4}
];
export function studyPlan(study){return {beats:study.measures*4,events:study.events.filter(e=>e.notes.length).sort((a,b)=>a.beat-b.beat)};}
