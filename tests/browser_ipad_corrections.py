"""Current user journeys, including history across reloads and real score editing."""
import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE=os.environ.get('JLK_BASE_URL','http://127.0.0.1:8003/')
OUT=Path(os.environ.get('JLK_SCREENSHOTS','/tmp/jlk-review'));OUT.mkdir(parents=True,exist_ok=True)
DRAFT='jlk-studio-v1-composition-draft-v1'
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for name,w,h in [('ipad',960,1280),('landscape',1280,960),('iphone',390,844)]:
  context=browser.new_context(viewport={'width':w,'height':h},has_touch=True,is_mobile=True)
  context.add_init_script('window.__tones=0;const Native=window.AudioContext;window.AudioContext=class extends Native{createOscillator(){const o=super.createOscillator(),start=o.start.bind(o);o.start=(...args)=>{__tones++;return start(...args)};return o}}')
  page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.set_default_timeout(10000)
  def shot(label):page.screenshot(path=str(OUT/f'after-{name}-{label}.png'),animations='disabled')
  def menu(dest):
   page.click('#studio-menu-open');page.click(f'[data-destination="{dest}"]')
  def tab(dest):page.click(f'[data-composer-tab="{dest}"]')
  def click(id):page.click('#composition-'+id)
  def select(id,value):page.select_option('#composition-'+id,value=value)
  def doc():return page.evaluate('(key)=>JSON.parse(localStorage.getItem(key))',DRAFT)
  def no_overflow():
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),name
   if page.locator('#task-view').evaluate('(n)=>n.open'):assert page.locator('#task-body').evaluate('(n)=>n.scrollWidth<=n.clientWidth'),name
  page.goto(BASE);page.wait_for_selector('.record-label');assert 'JLK' in page.title();assert page.evaluate('__tones')==0
  assert page.locator('#studio-audio-status').inner_text()==''
  assert page.evaluate('document.body.getBoundingClientRect().height>=innerHeight')
  shot('home');no_overflow()
  # Home -> latest -> archive -> Home; refresh does not break this ancestry.
  page.click('.record-label');page.wait_for_selector('#lesson-score svg');page.select_option('#weekly-step','2');page.click('[data-shape="2"]');page.reload();page.wait_for_selector('#lesson-score svg');assert page.locator('#weekly-step').input_value()=='2';shot('lesson')
  page.click('[data-action=exercise-play]');page.wait_for_selector('#lesson-score .score-sounding');page.click('[data-action=stop]');assert page.locator('#lesson-score .score-sounding').count()==0
  page.click('[data-action=back]');page.wait_for_selector('#weekly-search');assert page.locator('#weekly-results .weekly-card').count()==18;shot('archive')
  ids=page.locator('[data-lesson]').evaluate_all('(nodes)=>nodes.map(n=>n.dataset.lesson)')
  for id in ids:
   page.click(f'[data-lesson="{id}"]');page.wait_for_selector('.weekly-section');assert '' not in page.locator('#weekly-home').inner_text();page.click('[data-action=back]');page.wait_for_selector('#weekly-search')
  page.click('[data-action=back]');page.wait_for_selector('.record-label')
  menu('studio');page.click('#open-save');page.reload();page.wait_for_selector('#save-panel',state='visible');page.click('#task-back');page.wait_for_selector('#studio-panel',state='visible');page.click('#area-back');page.wait_for_selector('.record-label')
  # Composer editing, scoped deletion, Undo/Redo, save/reopen.
  page.click('[data-go=create]');page.wait_for_selector('#composition-content',state='visible');page.fill('#composition-title','Evening study');page.locator('#composition-title').dispatch_event('change')
  for n in ['C','E','G']:select('letter',n);click('insert-note')
  before=doc();assert page.get_by_role('button',name='Select right hand E4, measure 1').count()==1;page.get_by_role('button',name='Select right hand E4, measure 1').focus();page.keyboard.press('Enter');assert page.locator('#composition-delete-event').is_enabled();shot('selection');click('delete-event');assert [e['pitches'] for e in doc()['measures'][0]['right']]==[['C4'],['G4']];click('undo');assert doc()==before;click('redo');assert len(doc()['measures'][0]['right'])==2;click('undo');page.locator('#composition-selection-drawer>summary').click();page.locator('.composer-title').scroll_into_view_if_needed();shot('composer');no_overflow()
  click('save');saved_id=doc()['id']
  # Clear only selected hand, Undo restores notes; chord-tone removal preserves timing.
  page.locator('#composition-selection-drawer>summary').click();page.once('dialog',lambda d:d.accept());click('clear-measure');assert doc()['measures'][0]['right']==[];shot('cleared-measure');click('undo');assert doc()==before
  click('add-measure');page.locator('#composition-tray-add').locator('..').locator('summary').click();select('chord-root','C');select('chord-quality','major');click('chord-insert')
  chord_before=doc();page.locator('#composition-score .active-measure [data-score-event]').first.click();select('selected-tone','E4');click('delete-event');assert doc()['measures'][1]['right'][0]['pitches']==['C4','G4'];assert doc()['measures'][1]['right'][0]['duration']==1;click('undo');assert doc()==chord_before
  # Preview must never insert; Add is a separate action.
  tab('suggestions');snapshot=doc();tones=page.evaluate('__tones');page.locator('#composition-chord-suggestions button').first.click();assert doc()==snapshot;page.wait_for_function(f'__tones>{tones}')
  page.locator('#composition-chord-suggestions article').first.get_by_role('button',name='Add…').click();assert doc()==snapshot;click('suggestion-whole');assert len(doc()['measures'][1]['right'])==2
  snapshot=doc();page.locator('#composition-note-suggestions button').first.click();assert doc()==snapshot;page.locator('#composition-note-suggestions article').first.get_by_role('button',name='Insert',exact=True).click();assert len(doc()['measures'][1]['right'])==3;shot('suggestions')
  # Piece Settings stays secondary, changes tempo persist when returning to score.
  tab('settings');page.fill('#composition-tempo','120');page.locator('#composition-tempo').dispatch_event('change');assert doc()['tempo']==120;shot('piece-settings');page.locator('#composition-settings').get_by_role('button',name='← Score').click();assert page.locator('#composition-score').is_visible()
  click('play');page.wait_for_selector('#composition-score .score-sounding');click('stop');click('save');saved=doc()
  tab('pieces');shot('my-pieces');page.once('dialog',lambda d:d.accept());click('new');select('library',saved_id);page.once('dialog',lambda d:d.accept());click('open');assert doc()==saved;assert page.locator('#composition-score').is_visible()
  tab('settings');page.once('dialog',lambda d:d.accept());click('clear-piece');assert all(not m['right'] and not m['left'] for m in doc()['measures']);click('undo');assert doc()==saved
  # Done then reload preserve recoverable working notes and invoking Home.
  page.click('#task-done');page.wait_for_selector('.record-label');page.click('[data-go=create]');page.wait_for_selector('#composition-content',state='visible');page.reload();page.wait_for_selector('#composition-content',state='visible');assert doc()==saved
  # Menu open/close must preserve a score selection; recovery stays in editor.
  page.locator('#composition-score .active-measure [data-score-event]').first.click();selection=page.locator('#composition-events').input_value();page.click('#studio-menu-open');shot('menu');page.go_back();assert page.locator('#composition-events').input_value()==selection
  page.click('#studio-recover');page.wait_for_function("document.querySelector('#studio-audio-status').textContent==='Audio recovered'");assert page.locator('#composition-content').is_visible();page.wait_for_function("document.querySelector('#studio-audio-status').textContent===''")
  page.click('#task-back');page.wait_for_selector('.record-label')
  for dest in ['explore','studio','practice','guided','browse','saved','book','archive']:
   menu(dest);page.click('#studio-menu-open');page.locator('#studio-menu [data-close]').click();page.wait_for_function('!document.querySelector("#studio-menu").open');assert page.locator('#studio-recover').is_visible();no_overflow();menu('home');page.wait_for_selector('.record-label')
  menu('explore');shot('explore-contrast');menu('studio');page.click('#view-voicing');n=page.evaluate('__tones');page.click('#detail-next');assert page.locator('#detail-position').inner_text()=='2 of 4';assert page.evaluate('__tones')==n;shot('selected-chord');menu('home');page.wait_for_selector('.record-label')
  # Root and all cached JS/data remain available after a complete offline reload.
  page.wait_for_function('!!navigator.serviceWorker.controller');assert page.evaluate("navigator.serviceWorker.controller.scriptURL.endsWith('service-worker.js')")
  context.set_offline(True);page.reload();page.wait_for_selector('.record-label');menu('archive');assert page.locator('#weekly-results .weekly-card').count()==18;menu('create');page.wait_for_selector('#composition-content',state='visible');assert doc()==saved
  assert not errors,errors
  print(name,'all journeys passed',flush=True);context.close()
 browser.close()
