import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {buildBook,CORRECTIONS,TECHNIQUE_NOTES} from '../js/book-model.js';
const source=readFileSync(new URL('../docs/sources/keyboard-progression-book-october-05.html.txt',import.meta.url));
const snapshot=JSON.parse(readFileSync(new URL('../data/keyboard-book-october-05.json',import.meta.url),'utf8'));
test('October reference snapshot has exact provenance and independent content counts',()=>{
 assert.equal(source.length,48613);assert.equal(createHash('sha256').update(source).digest('hex'),snapshot.provenance.sha256);
 assert.equal(snapshot.provenance.sha256,'69448b6ab35ca49567dadc66e8a331bc9fdba73c9ecc31afec6199ece4a04730');
 const pages=Object.entries(snapshot.collections).filter(([name])=>name!=='TECHNIQUE_PAGES').flatMap(([,pages])=>pages),blocks=pages.flatMap(p=>p.loops);
 assert.equal(pages.length,37);assert.equal(snapshot.collections.TECHNIQUE_PAGES.length,6);assert.equal(blocks.length,113);assert.equal(blocks.flatMap(([,rows])=>rows).length,444);
});
test('reader preserves book order, printed numbering and every repeated hand tuple',()=>{
 const original=JSON.stringify(snapshot),book=buildBook(snapshot);
 assert.equal(book.pages.length,47);assert.deepEqual(book.pages.map(p=>p.num),[1,2,...Array.from({length:45},(_,i)=>i+4)]);
 assert.deepEqual(book.sections.map(s=>s.items.length),[3,6,4,20,10]);assert.equal(book.pages.at(-1).num,48);
 for(const section of book.sections)for(const p of section.items)assert.equal(p.source.title,p.title);
 const dre=book.pages.find(p=>p.title==='STILL D.R.E. CONNECTION');
 assert.deepEqual(dre.source.loops[1][1][1],['Bbsus4','F - Bb - Eb','F']);assert.equal(dre.source.loops[2][1][0][2],"Eb+Eb'");
 const sordid=book.pages.find(p=>p.title==='SORDID AFFAIR');assert.deepEqual(sordid.source.loops[1][1],sordid.source.loops[2][1]);assert.equal(JSON.stringify(snapshot),original);
});
test('reference links resolve from source titles without mutating placeholders',()=>{
 const book=buildBook(snapshot),technique=book.pages.find(p=>p.title==='LEFT-HAND BASS PATTERNS'),jazz=book.pages.find(p=>p.title==='ii-V-I JAZZ TURNAROUND'),dre=book.pages.find(p=>p.title==='STILL D.R.E. CONNECTION');
 assert.match(book.text(technique,technique.source.tryIntro),/page 28/);assert.match(book.text(jazz,jazz.source.note),/page 8/);assert.match(book.text(dre,dre.source.loops[1][0]),/p\. 9/);
 assert.match(jazz.source.note,/\{tech_page\}/);assert.match(technique.source.tryIntro,/\{page\}/);
});
test('theory corrections remain separate from supplied footers and notes',()=>{
 const book=buildBook(snapshot),circle=book.pages.find(p=>p.title==='CIRCLE-OF-FIFTHS SEQUENCE'),sordid=book.pages.find(p=>p.title==='SORDID AFFAIR');
 assert.match(circle.source.footer,/descending in fifths/);assert.match(CORRECTIONS[circle.title],/ascending fifths/);
 assert.match(sordid.source.footer,/not diatonic/);assert.match(CORRECTIONS[sordid.title],/enharmonic A-sharp minor/);
 assert.deepEqual(sordid.source.loops[0][1].map(r=>r[0]),['F#','D#m','Bbm','Ab']);
});

test('October 13 adds exactly Viva La Vida and updates the cover without changing earlier material',()=>{
 const raw=readFileSync(new URL('../docs/sources/keyboard-progression-book-october-13.html.txt',import.meta.url)),latest=JSON.parse(readFileSync(new URL('../data/keyboard-book-october-13.json',import.meta.url),'utf8'));
 assert.equal(raw.length,49267);assert.equal(createHash('sha256').update(raw).digest('hex'),latest.provenance.sha256);
 assert.equal(latest.provenance.sha256,'5a9b8886566c602057635ce352f4b2d1d4bd0f90309c0d2d783c154917b440c8');
 for(const key of ['EASY_PAGES','TECHNIQUE_PAGES','MORE_PROGRESSIONS','MOOD_PAGES'])assert.deepEqual(latest.collections[key],snapshot.collections[key]);
 assert.deepEqual(latest.collections.SONG_PAGES.slice(0,-1),snapshot.collections.SONG_PAGES);
 assert.deepEqual(latest.constants,snapshot.constants);for(const key of ['renderHowTo','renderDivider','renderKeepPlaying'])assert.equal(latest.frontMatterSource[key],snapshot.frontMatterSource[key]);
 const book=buildBook(latest),song=book.pages.find(p=>p.title==='VIVA LA VIDA');assert.equal(book.pages.length,48);assert.equal(book.pages.at(-1).num,49);assert.equal(book.sections.at(-1).items.length,11);
 assert.deepEqual(latest.counts,{chordPages:38,techniques:6,blocks:116,rows:456});
 assert.deepEqual(song.source.loops.map(([label,rows])=>rows.map(([symbol])=>symbol)),[['Db','Eb','Ab','Fm'],['Db','Eb','Fm','Ab'],['Bbm','Db','Eb','Ab']]);
 assert.deepEqual(song.source.loops[0][1][0],['Db','Ab - Db - F','Db']);assert.equal(book.pages[book.pages.indexOf(song)-1].title,'I DREAMED A DREAM');
});

test('technique clarification preserves alternative voicings and explicitly resolves pedal delay wording',()=>{
 const book=buildBook(snapshot),pedal=book.pages.find(p=>p.title==='PEDALING TECHNIQUES'),block=book.pages.find(p=>p.title==='BLOCK CHORDS vs. BROKEN CHORDS');
 assert.match(TECHNIQUE_NOTES[pedal.title],/fraction of a second/);assert.match(TECHNIQUE_NOTES[pedal.title],/full beat/);assert.match(pedal.source.trySteps[1],/a beat later/);
 assert.match(TECHNIQUE_NOTES[block.title],/Alternative voicing/);assert.match(block.source.tryIntro,/G - B - C - E/);assert.match(block.source.trySteps[1],/C, E, G, B/);
});

test('app-facing edition labels use ordinals while source dates remain internal provenance',()=>{
 const latest=JSON.parse(readFileSync(new URL('../data/keyboard-book-october-13.json',import.meta.url),'utf8'));assert.equal(buildBook(latest).edition,'Second Edition');assert.equal(buildBook(snapshot).edition,'Second Edition');assert.match(latest.provenance.label,/October 13/);assert.equal(buildBook({...latest,edition:'Third Edition'}).edition,'Third Edition');
});
