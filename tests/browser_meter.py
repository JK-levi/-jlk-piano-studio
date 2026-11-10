"""Meter UI, actual oscillator timing, invalid-copy safety and draft recovery."""
import json,math,os,subprocess,tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_helpers import close_tasks
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'docs/screenshots/meter';OUT.mkdir(parents=True,exist_ok=True)
BASE=os.environ.get('JLK_BASE_URL','http://127.0.0.1:8000/')
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);c=browser.new_context(viewport={'width':393,'height':852},is_mobile=True,has_touch=True,accept_downloads=True)
 c.add_init_script("""window.__tones=[];window.__audioContexts=[];const Native=window.AudioContext;window.AudioContext=class extends Native{constructor(...a){super(...a);__audioContexts.push(this);}createOscillator(){const o=super.createOscillator(),start=o.start.bind(o);o.start=at=>{__tones.push({frequency:o.frequency.value,at});start(at);};return o;}};""")
 page=c.new_page();errors=[];downloads=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('download',lambda d:downloads.append(d));page.goto(BASE);page.wait_for_selector('.key');page.click('#composer-open');page.wait_for_selector('#composition-content',state='visible')
 def select(id,value):page.select_option('#composition-'+id,str(value))
 def click(id):page.click('#composition-'+id)
 def doc():return page.evaluate("JSON.parse(localStorage.getItem('jlk-studio-v1-composition-draft-v1'))")
 def saved():return page.evaluate("JSON.parse(localStorage.getItem('jlk-studio-v1-compositions-v1'))||[]")
 def library():
  detail=page.locator('#composition-panel details').last
  if detail.get_attribute('open') is None:detail.locator('summary').click()
 def new_piece():
  library();page.once('dialog',lambda d:d.accept());click('new');assert page.locator('#composition-meter').input_value()=='4/4';select('hand','right');select('octave',4);select('duration',1)
 def pitch(letter,octave,accidental=''):
  select('letter',letter);select('octave',octave);select('accidental',accidental)
 def title(value):page.fill('#composition-title',value);page.locator('#composition-title').dispatch_event('change')
 def print_text(name):
  path=Path(tempfile.gettempdir())/name;page.pdf(path=str(path),format='A4',print_background=False);return subprocess.check_output(['pdftotext',str(path),'-'],text=True)
 title('October 27 study');identity=doc()['id']
 for signature in ['3/4','6/8','12/8','4/4']:
  select('meter',signature);assert doc()['id']==identity;assert doc()['timeSignature']==[int(v)for v in signature.split('/')];assert not saved()
 select('meter','3/4');select('duration',1);pitch('C',4);click('insert-note');select('duration',2);pitch('E',4);click('insert-note');select('hand','left');pitch('B',2);select('duration',3);click('insert-note')
 assert page.locator('#composition-score .time-signature').all_text_contents()==['3','4','3','4'];assert page.locator('#composition-score .duration-dot').count()==1
 assert '1–2–3' in page.locator('#composition-counting').inner_text();assert 'quarter-note pulse' in page.locator('#composition-tempo-unit').inner_text()
 click('save');original=doc();dated_id=original['id'];select('meter','6/8');assert doc()['id']!=original['id'];assert doc()['measures']==original['measures'];assert saved()[0]==original;assert doc()['copyOf']['id']==original['id'];assert page.locator('#composition-play').is_enabled()
 assert 'BPM number is kept' in page.locator('#composition-copy-origin').inner_text();assert 'dotted-quarter' in page.locator('#composition-tempo-unit').inner_text();assert '6/8' in page.locator('#composition-score-meta').inner_text()
 # A filled 4/4 source becomes an overflow copy without modifying or re-barring it.
 new_piece();title('Legacy original')
 for bar in range(2):
  if bar:click('add-measure')
  for hand,letter,octave in [('right','C' if bar==0 else 'D',4),('left','B' if bar==0 else 'A',2)]:
   select('hand',hand);pitch(letter,octave);select('duration',4);click('insert-note')
 click('save');original=doc();stored_before=page.evaluate("localStorage.getItem('jlk-studio-v1-compositions-v1')")
 select('meter','3/4');copy=doc();copy_id=copy['id'];assert copy_id!=original['id'];assert copy['measures']==original['measures'];assert copy['copyOf']['id']==original['id']
 assert page.evaluate("localStorage.getItem('jlk-studio-v1-compositions-v1')")==stored_before;assert page.locator('#composition-meter-issues button').count()==4;assert page.locator('#composition-score svg[data-overflow=true]').count()==2
 assert page.locator('#composition-score [data-score-event]').count()==4;assert page.locator('#composition-score svg[data-measure="0"] [data-score-event]').count()==2
 for id in ['play','print','export']:assert page.locator('#composition-'+id).is_disabled()
 assert 'Draft' in page.locator('#composition-position').inner_text();click('save');assert 'Draft copy saved' in page.locator('#composition-feedback').inner_text()
 # Guard handlers too: even a synthetic click cannot schedule or export an invalid score.
 before_tones=page.evaluate('__tones.length');page.evaluate('() => {window.__prints=0;window.print=()=>window.__prints++;}')
 for id in ['play','print','export']:page.dispatch_event('#composition-'+id,'click')
 assert page.evaluate('__tones.length')==before_tones;assert not downloads;assert page.evaluate('__prints')==0
 text=print_text('jlk-invalid-meter-draft.pdf');assert 'not ready to print as sheet music' in text and 'C4' not in text and 'Legacy original' not in text
 close_tasks(page);page.reload();page.wait_for_selector('.key');page.click('#composer-open');page.wait_for_selector('#composition-content',state='visible');assert doc()['id']==copy_id;assert doc()['measures']==original['measures'];assert page.locator('#composition-play').is_disabled()
 library();assert any('Draft copy' in text for text in page.locator('#composition-library option').all_text_contents())
 # Repair only through explicit entry operations; the original remains intact.
 for bar in range(2):
  for hand,letter,octave in [('right','C' if bar==0 else 'D',4),('left','B' if bar==0 else 'A',2)]:
   page.locator('#composition-meter-issues button').filter(has_text=f'Measure {bar+1}, {hand} hand:').click();page.select_option('#composition-events',index=1);click('delete-event');pitch(letter,octave);select('duration',3);click('insert-note')
 assert page.locator('#composition-meter-issues button').count()==0;assert page.locator('#composition-play').is_enabled();assert 'Draft — measures need attention' not in page.locator('#composition-position').inner_text();assert page.locator('#composition-score .duration-dot').count()==4
 click('undo');click('undo');assert page.locator('#composition-play').is_disabled();page.select_option('#composition-events',index=1);click('delete-event');select('duration',3);click('insert-note');assert page.locator('#composition-play').is_enabled()
 click('save');assert page.locator('#composition-save').inner_text()=='Save piece';assert next(p for p in saved()if p['id']==original['id'])==original;assert not any(p['id']==copy_id for p in page.evaluate("JSON.parse(localStorage.getItem('jlk-studio-v1-composition-meter-drafts-v1'))||[]"))
 select('measure',0);click('see-score');page.screenshot(path=str(OUT/'three-four-iphone.png'));text=print_text('jlk-three-four-score.pdf');assert '3/4' in text and 'quarter-note pulse' in text;assert saved()[0]['title']=='October 27 study'
 # Compound pulse audio and both-hand visual advancement across measures.
 new_piece();select('meter','6/8');title('Two dotted pulses');select('hand','right');pitch('C',4);select('duration',.5)
 for _ in range(6):click('insert-note')
 select('hand','left');pitch('B',2);select('duration',3);click('insert-note');click('add-measure');select('hand','right');pitch('E',4);select('duration',1.5);click('insert-note');click('rest');select('hand','left');pitch('B',2);select('duration',3);click('insert-note');select('hand','right');select('octave',4);select('measure',0)
 assert page.locator('#composition-score svg[data-measure="0"] .score-beam').evaluate_all('(n)=>n.map(x=>Number(x.dataset.count))')==[3,3]
 assert page.locator('#composition-score svg[data-measure="1"] .score-rest .duration-dot').count()==1
 page.fill('#composition-tempo','120');page.locator('#composition-tempo').dispatch_event('change');page.check('#composition-metronome')
 page.evaluate("() => {window.__positions=[];new MutationObserver(()=>__positions.push(document.querySelector('#composition-position').textContent)).observe(document.querySelector('#composition-position'),{childList:true,subtree:true});}")
 start=page.evaluate('__tones.length');click('play');page.wait_for_selector('#composition-score .score-sounding');assert page.locator('#composition-keyboard .sounding').count()>0
 page.wait_for_function("document.querySelector('#composition-score svg.active-measure').dataset.measure==='1'",timeout=6000);page.wait_for_function("document.querySelector('#composition-position').textContent==='Complete'",timeout=6000)
 tones=page.evaluate(f'__tones.slice({start})');right=[n for n in tones if math.isclose(n['frequency'],261.6255653,rel_tol=1e-6)];bass=[n for n in tones if math.isclose(n['frequency'],123.4708253,rel_tol=1e-6)];assert len(right)==6 and len(bass)==2,(right,bass)
 for i,n in enumerate(right):assert math.isclose(n['at']-right[0]['at'],i/6,abs_tol=1e-7)
 assert math.isclose(right[0]['at'],bass[0]['at'],abs_tol=1e-7);assert math.isclose(bass[1]['at']-bass[0]['at'],1,abs_tol=1e-7)
 statuses=page.evaluate('__positions');assert any('Measure 2' in s for s in statuses);assert any('-la' in s or '-li' in s for s in statuses);assert all('3 of 2' not in s for s in statuses);assert page.locator('#composition-score .score-sounding').count()==0
 select('measure',0);click('see-score');page.screenshot(path=str(OUT/'six-eight-iphone.png'));click('save');text=print_text('jlk-six-eight-score.pdf');assert '6/8' in text and 'dotted-quarter' in text and 'B2' in text and 'C4' in text;assert 'What Comes Next' not in text
 # 12/8 needs twelve eighth-note entries and four beams, with contained score scrolling.
 new_piece();select('meter','12/8');title('Four groups of three');pitch('C',4);select('duration',.5)
 for _ in range(12):click('insert-note')
 assert len(doc()['measures'][0]['right'])==12;assert page.locator('#composition-score .score-beam').evaluate_all('(nodes)=>nodes.map(n=>Number(n.dataset.count))')==[3,3,3,3]
 before=doc();click('insert-note');assert doc()==before;assert 'Only 0 eighth-note units' in page.locator('#composition-feedback').inner_text()
 select('hand','left');pitch('C',3);select('duration',6);click('insert-note');assert page.locator('#composition-score .duration-dot').count()==1
 assert page.locator('#composition-score .time-signature').all_text_contents()==['12','8','12','8'];assert '4-la-li' in page.locator('#composition-counting').inner_text();click('save');twelve_id=doc()['id']
 for width,height in [(320,844),(375,812),(390,844),(393,852),(430,932),(844,390),(1440,900)]:
  page.set_viewport_size({'width':width,'height':height})
  for scale in [1,2]:
   page.evaluate('(s)=>document.documentElement.style.fontSize=(15*s)+"px"',scale);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,scale);assert page.locator('#task-body').evaluate('(n)=>n.scrollWidth<=n.clientWidth'),(width,scale)
 page.evaluate('document.documentElement.style.fontSize="15px"');page.set_viewport_size({'width':393,'height':852});click('see-score');page.screenshot(path=str(OUT/'twelve-eight-iphone.png'));assert page.locator('#composition-score').evaluate('(n)=>n.scrollWidth>n.clientWidth')
 text=print_text('jlk-twelve-eight-score.pdf');assert '12/8' in text and 'C3' in text and 'dotted-quarter' in text;assert 'Long measure' not in text;library()
 with page.expect_download() as download:click('export')
 backup=Path(download.value.path()).read_text();assert json.loads(backup)['timeSignature']==[12,8]
 page.once('dialog',lambda d:d.accept());click('new');page.once('dialog',lambda d:d.accept());page.set_input_files('#composition-import',{'name':'meter.json','mimeType':'application/json','buffer':backup.encode()});page.wait_for_function("id=>JSON.parse(localStorage.getItem('jlk-studio-v1-composition-draft-v1'))?.id===id",arg=twelve_id);assert doc()['id']==twelve_id
 close_tasks(page);page.wait_for_function('!!navigator.serviceWorker.controller');c.set_offline(True);page.reload();page.wait_for_selector('.key');page.click('#composer-open');page.wait_for_selector('#composition-content',state='visible');assert doc()['timeSignature']==[12,8];assert len(doc()['measures'][0]['right'])==12
 click('play');page.wait_for_selector('#composition-score .score-sounding');page.wait_for_function("document.querySelector('#composition-score').scrollLeft>0",timeout=6000);click('stop');assert page.locator('#composition-score .score-sounding').count()==0;assert page.evaluate('__audioContexts.length')==1
 library();select('library',dated_id);page.once('dialog',lambda d:d.accept());click('open');assert page.locator('#composition-title').input_value()=='October 27 study';assert 'October 27 study' in print_text('jlk-user-dated-title.pdf')
 assert not errors,errors
 c.close()
 faults=browser.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True,service_workers='block');q=faults.new_page();q.goto(BASE);q.wait_for_selector('.key');q.click('#composer-open');q.wait_for_selector('#composition-content',state='visible');q.click('#composition-insert-note');working=q.evaluate("JSON.parse(localStorage.getItem('jlk-studio-v1-composition-draft-v1'))")
 q.evaluate("() => {const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k.endsWith('composition-meter-drafts-v1'))throw Error('write fixture');return set.call(this,k,v);};}")
 q.select_option('#composition-meter','3/4');assert q.locator('#composition-meter').input_value()=='4/4';assert q.evaluate("JSON.parse(localStorage.getItem('jlk-studio-v1-composition-draft-v1')).id")==working['id'];assert 'Could not save this draft copy' in q.locator('#composition-feedback').inner_text();assert q.evaluate("JSON.parse(localStorage.getItem('jlk-studio-v1-compositions-v1'))[0].measures")==working['measures'];faults.close()
 print(json.dumps({'copy':'originals preserved, no re-barring/duration change, recoverable overflow drafts and explicit repair/Undo','meters':'new-piece 3/4, 6/8, 12/8 with correct capacities, beams, dotted notes/rests, pulse units and both-hand audio timing','safety':'invalid playback/print/export blocked including guarded handlers and browser print output','persistence':'save/draft/reload, repaired draft promotion, JSON export/import and offline 12/8 playback','layout':'all requested phone widths, landscape/desktop and 200% text, contained long-measure scrolling','errors':errors},indent=2));browser.close()
