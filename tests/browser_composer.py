import os,json,math,subprocess,tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_helpers import close_tasks
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'docs/screenshots/v1.3-b';OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);context=browser.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True,accept_downloads=True)
 context.add_init_script("""window.__tones=[];window.__contexts=[];const Native=window.AudioContext;window.AudioContext=class extends Native{constructor(...args){super(...args);__contexts.push(this);}createOscillator(){const osc=super.createOscillator(),start=osc.start.bind(osc);osc.start=at=>{__tones.push({frequency:osc.frequency.value,at});start(at);};return osc;}};""")
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(os.environ.get('JLK_BASE_URL','http://127.0.0.1:8000/'));page.wait_for_selector('.key');page.click('#composer-open');assert page.locator('#task-title').inner_text()=='Create sheet music'
 def doc():return page.evaluate("JSON.parse(localStorage.getItem('jlk-studio-v1-composition-draft-v1'))")
 def select(id,value):page.select_option('#composition-'+id,value)
 def click(id):page.click('#composition-'+id)
 def pitch(letter,octave,accidental=''):
  select('letter',letter);select('octave',str(octave));select('accidental',accidental)
 page.fill('#composition-title','Small windows');page.locator('#composition-title').dispatch_event('change')
 snapshot=doc();page.locator('#composition-chord-suggestions article').first.get_by_role('button',name='Listen',exact=True).click();assert doc()==snapshot
 page.locator('#composition-note-suggestions article').first.get_by_role('button',name='Listen',exact=True).click();assert doc()==snapshot
 page.locator('#composition-keyboard button').first.click();assert doc()==snapshot
 assert page.locator('#composition-chord-suggestions article').count()==3 and page.locator('#composition-note-suggestions article').count()==3
 page.check('#composition-write-taps');page.locator('#composition-keyboard button').first.click();assert doc()['measures'][0]['right'][0]['pitches']==['C4'];click('undo');page.uncheck('#composition-write-taps')
 page.locator('#composition-panel details').first.locator('summary').click()
 for letter in ['E','G']:pitch(letter,4);click('tray-add')
 assert not doc()['measures'][0]['right'];click('tray-insert');assert doc()['measures'][0]['right'][0]['pitches']==['E4','G4'];click('undo')
 page.locator('#composition-panel details').first.locator('summary').click()
 for n in ['C','D','E','F']:pitch(n,4);click('insert-note')
 assert len(doc()['measures'][0]['right'])==4
 snapshot=doc();click('insert-note');assert doc()==snapshot;assert 'Only 0 beats' in page.locator('#composition-feedback').inner_text()
 assert page.locator('#composition-feedback [role=alert]').is_visible()
 click('undo');assert len(doc()['measures'][0]['right'])==3
 page.locator('#composition-chord-suggestions article').first.get_by_role('button',name='Choose chord').click()
 assert not page.locator('#composition-chosen-chord').is_hidden();assert page.locator('#composition-chosen-name').inner_text().startswith(page.locator('#composition-chord-suggestions strong').first.inner_text());snapshot=doc()
 select('duration','2');click('suggestion-whole');assert doc()==snapshot
 select('duration','1');click('suggestion-whole');assert len(doc()['measures'][0]['right'][-1]['pitches'])==3
 click('undo');click('choose-tone');select('tone-octave','5');snapshot=doc();click('tone-listen');assert doc()==snapshot;click('tone-insert');assert doc()['measures'][0]['right'][-1]['pitches'][0].endswith('5')
 select('hand','left');pitch('C',3);select('duration','4');click('insert-note');assert doc()['measures'][0]['left'][0]['duration']==4
 assert len(doc()['measures'][0]['right'])==4
 click('add-measure');select('hand','right');select('duration','2');click('rest')
 page.locator('#composition-panel details').first.locator('summary').click();select('chord-root','F');select('chord-quality','major');click('chord-listen');click('chord-insert')
 select('hand','left');pitch('C',3);select('duration','2');click('insert-note');pitch('G',2);click('insert-note')
 assert doc()['measures'][1]['right'][0]['rest']
 assert [e['beat'] for e in doc()['measures'][1]['left']]==[0,2]
 select('hand','right');select('measure','0');page.select_option('#composition-events',index=1);before=doc();click('delete-event');assert len(doc()['measures'][0]['right'])==3;click('undo');assert doc()==before
 page.fill('#composition-tempo','180');page.locator('#composition-tempo').dispatch_event('change');count=page.evaluate('__tones.length');click('play');page.wait_for_selector('#composition-score .score-sounding')
 page.wait_for_function("document.querySelector('#composition-position').textContent==='Complete'",timeout=7000)
 events=page.evaluate(f'__tones.slice({count})');assert math.isclose(events[0]['frequency'],261.6255653,rel_tol=1e-6);assert math.isclose(events[4]['frequency'],130.81278265,rel_tol=1e-6);assert events[0]['at']==events[4]['at'];assert page.evaluate('__contexts.length')==1
 assert page.locator('#composition-score .score-sounding').count()==0
 click('save');assert 'Piece saved' in page.locator('#composition-feedback').inner_text()
 select('measure','1');click('see-score');page.screenshot(path=str(OUT/'create-score-mobile.png'))
 page.locator('#composition-chord-suggestions').scroll_into_view_if_needed();page.screenshot(path=str(OUT/'what-comes-next-mobile.png'))
 page.locator('#composition-panel details').last.locator('summary').click()
 with page.expect_download() as download:click('export')
 path=download.value.path();backup=Path(path).read_text();assert json.loads(backup)['title']=='Small windows'
 page.once('dialog',lambda d:d.accept());click('duplicate');assert page.locator('#composition-library option').count()==3
 page.select_option('#composition-library',index=2);page.once('dialog',lambda d:d.accept());click('open');assert doc()['title'].endswith('(copy)')
 page.once('dialog',lambda d:d.accept());click('delete');assert page.locator('#composition-library option').count()==2
 page.once('dialog',lambda d:d.accept());click('new');assert not doc()['measures'][0]['right']
 page.once('dialog',lambda d:d.accept());page.set_input_files('#composition-import',{'name':'backup.json','mimeType':'application/json','buffer':backup.encode()});page.wait_for_function("document.querySelector('#composition-title').value==='Small windows'")
 snapshot=doc();page.set_input_files('#composition-import',{'name':'bad.json','mimeType':'application/json','buffer':b'{bad'});page.wait_for_function("document.querySelector('#composition-feedback').textContent.includes('Could not open backup')");assert doc()==snapshot;assert page.locator('#composition-position').inner_text()=='Failed'
 assert len(doc()['measures'])==2
 # Print UI calls browser printing; headless PDF verifies actual print CSS output.
 page.evaluate('() => {window.__printCalls=0;window.print=()=>window.__printCalls++;}');click('print');assert page.evaluate('__printCalls')==1
 page.emulate_media(media='print');pdf=Path(tempfile.gettempdir())/'jlk-composition-print.pdf';page.pdf(path=str(pdf),format='A4',print_background=False)
 text=subprocess.check_output(['pdftotext',str(pdf),'-'],text=True);assert 'Small windows' in text;assert 'What Comes Next' not in text and 'Write the next event' not in text;assert 'C3' in text and 'G2' in text
 assert page.locator('#composition-score svg').count()==2
 page.emulate_media(media='screen')
 for width in [320,390,768,1440]:
  page.set_viewport_size({'width':width,'height':900});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert page.locator('#task-body').evaluate('(n)=>n.scrollWidth<=n.clientWidth'),page.locator('#task-body').evaluate('(n)=>({width:innerWidth,scroll:n.scrollWidth,client:n.clientWidth,wide:[...n.querySelectorAll("*")].filter(e=>e.getBoundingClientRect().right>n.getBoundingClientRect().right).map(e=>[e.tagName,e.id,e.getBoundingClientRect().width]).slice(0,12)})')
 # Eight bars and explicit duration validation; no silently filled measures.
 for _ in range(6):click('add-measure')
 assert page.locator('#composition-add-measure').is_disabled()
 assert len(doc()['measures'])==8
 close_tasks(page);page.wait_for_function('!!navigator.serviceWorker.controller');context.set_offline(True);page.reload();page.wait_for_selector('.key');page.click('#composer-open');assert len(doc()['measures'])==8
 assert page.locator('#composition-library option').count()==2
 page.select_option('#composition-key','F#m');snapshot=doc();page.locator('#composition-note-suggestions article').first.get_by_role('button',name='Listen',exact=True).click();assert doc()==snapshot
 page.locator('#composition-chord-suggestions article').first.get_by_role('button',name='Choose chord').click();select('duration','0.5');select('measure','7');click('suggestion-whole');assert doc()['measures'][7]['right'][0]['duration']==.5
 assert not errors,errors
 print(json.dumps({'entry':'manual notes/rests/chords, fit errors, undo/delete and independent hands','suggestions':'three each, previews immutable, explicit whole-chord or chosen-tone insertion, key/octave context','audio':'single engine, aligned RH/LH starts, rhythm and highlights','storage':'save/open/duplicate/delete confirmations, backup import/export, reload/offline','print':'actual Chromium PDF text contains both hands and excludes controls; physical Safari unverified','errors':errors},indent=2))
 context.close();browser.close()
