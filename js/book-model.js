// Source reference only. Pitch names are not converted to invented octaves or
// durations and never pass through the progression voicing generator.
const GROUPS=[['EASY_PAGES','Easy Chords','chords'],['TECHNIQUE_PAGES','Techniques','technique'],['MORE_PROGRESSIONS','More Progressions','chords'],['MOOD_PAGES','Mood Loops','chords'],['SONG_PAGES','Song Vibes','chords']];
const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export const CORRECTIONS={
 'CIRCLE-OF-FIFTHS SEQUENCE':'Theory correction: C–G–D–A moves by ascending fifths. Continue through the written keys and return to C; reversing the sequence gives descending fifths. The original footer reverses these directions.',
 'SORDID AFFAIR':'Theory correction: in F-sharp major, B-flat minor is enharmonic A-sharp minor (iii). A-flat/G-sharp major is the non-diatonic chord here. The written progression and hand notes are preserved.'
};
export const TECHNIQUE_NOTES={
 'BLOCK CHORDS vs. BROKEN CHORDS':'Alternative voicing example: these try-it patterns use C–E–G–B. Late-Night Melt keeps G–B–C–E. Both original written orders are preserved; the examples do not specify a single fixed octave.',
 'INVERSIONS & SMOOTH VOICE LEADING':'Alternative voicing example: this exercise uses C–E–G–B for Cmaj7, while Late-Night Melt prints G–B–C–E. Compare the two hand shapes; neither reference has been silently rewritten.',
 'PEDALING TECHNIQUES':'Pedaling clarification: lift as the new harmony lands, then press down again promptly after the old harmony clears—typically a fraction of a second. Waiting a full beat is a different, delayed effect. The original exercise’s “a beat later” wording is retained below so this correction is explicit.'
};
export function buildBook(snapshot){
 if(snapshot?.format!==1||!snapshot.collections||!snapshot.frontMatterSource)throw Error('The reference edition could not be read.');
 const pages=[{id:'cover',type:'front',num:1,title:'Keyboard Progression Book',template:'renderCover'},{id:'how-to',type:'front',num:2,title:'How to use it',template:'renderHowTo'}],sections=[];
 let num=4;
 for(const [key,name,type] of GROUPS){
  const data=snapshot.collections[key];if(!Array.isArray(data)||!data.length)throw Error('The reference edition is incomplete.');
  if(key==='SONG_PAGES')pages.push({id:'song-vibes',type:'front',num:num++,title:'Favorite Song Vibes',template:'renderDivider'});
  const items=data.map(source=>({id:`${key.toLowerCase()}-${slug(source.title)}`,type,num:num++,title:source.title,section:name,source}));
  sections.push({name,items});pages.push(...items);
 }
 pages.push({id:'keep-playing',type:'front',num,title:'Keep playing',template:'renderKeepPlaying'});
 const byTitle=new Map(pages.map(p=>[p.title,p])),inversions=byTitle.get('INVERSIONS & SMOOTH VOICE LEADING')?.num,bass=byTitle.get('LEFT-HAND BASS PATTERNS')?.num;
 function text(page,value){
  return value.replaceAll('{page}',String(byTitle.get(page.source?.refTitle)?.num??'?')).replaceAll('{tech_page}',String(page.title.startsWith('STILL D.R.E')?bass:inversions));
 }
 return {pages,sections,text,edition:snapshot.edition||'Second Edition',provenance:snapshot.provenance,front:snapshot.frontMatterSource};
}
