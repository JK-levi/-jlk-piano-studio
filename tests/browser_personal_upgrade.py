"""Import through the actual base UI, then upgrade a same-date personal archive."""
import functools,http.server,io,json,os,re,shutil,subprocess,tarfile,tempfile,threading
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_helpers import studio_destination,wait_for_waiting_worker,wait_for_cache
ROOT=Path(__file__).resolve().parents[1];OUT=Path(os.environ.get('JLK_REVIEW_OUTPUT','/tmp/jlk-pr18-review'));OUT.mkdir(parents=True,exist_ok=True)
BASE='7e8a2bc8948f82c29928723e77805436986d35d6';TARGET=os.environ.get('JLK_UPGRADE_TARGET')
ASSETS=['index.html','styles.css','studio.css','manifest.webmanifest','service-worker.js','js','icons','assets','data','docs']
CONTENT='jlk-weekly-content-v1';PROGRESS='jlk-weekly-progress-v1'
PERSONAL={'schemaVersion':1,'id':'weekly-my-august-practice','date':'2026-08-09','title':'My August bass study','goal':'My own two-hand voicing.','source':{'description':'Personal handwritten practice','completeness':'complete'},'originalText':'My notes: LH D♭3 + A♭3 | RH F4 + C5. Repeat gently.','sections':[{'id':'my-shape','title':'My shape','instructions':'My exact voicing.','rows':[{'lh':['D♭3','A♭3'],'rh':['F4','C5']}]},{'id':'my-repeat','title':'My repeat','instructions':'Repeat gently.','rows':[{'lh':['E♭3'],'rh':['G4','B♭4']}]}]}
class Handler(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
 def end_headers(self):self.send_header('Cache-Control','no-store');super().end_headers()
def unpack(ref,target):
 data=subprocess.check_output(['git','archive',ref,'--',*ASSETS],cwd=ROOT)
 with tarfile.open(fileobj=io.BytesIO(data)) as archive:archive.extractall(target,filter='data')
with tempfile.TemporaryDirectory() as folder,sync_playwright() as p:
 target=Path(folder)/'piano';target.mkdir();unpack(BASE,target)
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=folder));threading.Thread(target=server.serve_forever,daemon=True).start()
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);context=browser.new_context(viewport={'width':960,'height':1280},has_touch=True,is_mobile=True)
 page=context.new_page();page.set_default_timeout(12000);url=f'http://127.0.0.1:{server.server_port}/piano/';page.goto(url);page.wait_for_selector('.record-label')
 studio_destination(page,'archive');assert page.locator('#weekly-results .weekly-card').count()==12
 page.locator('.weekly-extra>summary').click();page.click('[data-action=import]');page.fill('#weekly-import-text',json.dumps(PERSONAL));page.click('[data-action=validate]');page.click('[data-action=save-import]');page.wait_for_selector('#weekly-search')
 assert page.locator('#weekly-results .weekly-card').count()==13
 page.click('[data-lesson="weekly-my-august-practice"]');page.click('[data-action=favorite]');page.click('[data-action=next]');assert page.locator('#weekly-step').input_value()=='1'
 def stored(pg):return pg.evaluate('(keys)=>Object.fromEntries(keys.map(k=>[k,localStorage.getItem(k)]))',[CONTENT,PROGRESS])
 before=stored(page);personal_progress=json.loads(before[PROGRESS])[PERSONAL['id']]
 assert personal_progress['favorite'] and personal_progress['completed']==['my-shape'];assert personal_progress['index']==1
 assert next(l for l in json.loads(before[CONTENT]) if l['id']==PERSONAL['id'])==PERSONAL
 (OUT/'personal-before-upgrade.json').write_text(json.dumps(before,indent=2));page.screenshot(path=str(OUT/'personal-base-progress.png'))
 page.wait_for_function('!!navigator.serviceWorker.controller')
 if TARGET:unpack(TARGET,target)
 else:
  for name in ASSETS:
   source=ROOT/name
   if source.is_dir():shutil.copytree(source,target/name,dirs_exist_ok=True)
   else:shutil.copy2(source,target/name)
 cache=re.search(r"const CACHE='([^']+)'",(target/'service-worker.js').read_text())[1]
 with context.expect_event('serviceworker') as event:page.evaluate('navigator.serviceWorker.getRegistration().then(r=>r.update())')
 worker=event.value;wait_for_waiting_worker(page);worker.evaluate('globalThis.__upgradeTarget=self.registration.waiting');page.close()
 worker.evaluate("() => new Promise((resolve,reject)=>{const deadline=Date.now()+10000;function check(){if(__upgradeTarget?.state==='activated')return resolve();if(Date.now()>deadline)return reject(Error('activation timeout'));setTimeout(check,25)}check()})")
 fresh=context.new_page();fresh.set_default_timeout(12000);errors=[];fresh.on('pageerror',lambda e:errors.append(str(e)));fresh.goto(url);fresh.wait_for_selector('#weekly-home')
 fresh.wait_for_function("document.querySelector('.record-label') || document.querySelector('#weekly-home').textContent.includes('could not fully load')");fresh.screenshot(path=str(OUT/'upgrade-startup.png'))
 assert 'could not fully load' not in fresh.locator('#weekly-home').inner_text(),fresh.locator('#weekly-home').inner_text()
 fresh.wait_for_selector('.record-label');wait_for_cache(fresh,cache,'jlk-studio-v2-1');assert stored(fresh)==before
 studio_destination(fresh,'archive');assert fresh.locator('#weekly-results .weekly-card').count()==19
 def open_personal(expected=PERSONAL):
  fresh.click('[data-lesson="weekly-my-august-practice"]');assert fresh.locator('#weekly-home>h2').inner_text()==expected['title'];assert fresh.locator('#weekly-step').input_value()=='1';assert '✓' in fresh.locator('#weekly-step option').first.inner_text();assert fresh.locator('[data-action=favorite]').get_attribute('aria-pressed')=='true';assert 'E♭3' in fresh.locator('#selected-hands').inner_text();fresh.click('[data-action=back]');fresh.wait_for_selector('#weekly-search')
 open_personal();fresh.click('[data-lesson="weekly-2026-08-09"]');assert fresh.locator('#weekly-home>h2').inner_text()=='One melody, changing ground';assert fresh.locator('[data-action=favorite]').get_attribute('aria-pressed')=='false';assert '✓' not in fresh.locator('#weekly-step').inner_text();assert 'G♭' in fresh.locator('#selected-hands').inner_text();fresh.click('[data-action=back]');fresh.wait_for_selector('#weekly-search')
 assert stored(fresh)==before
 fresh.reload();fresh.wait_for_selector('#weekly-search');assert fresh.locator('#weekly-results .weekly-card').count()==19;open_personal();assert stored(fresh)==before
 # Canonical progress is independent, keyed to the canonical ID.
 fresh.click('[data-lesson="weekly-2026-08-09"]');fresh.click('[data-action=favorite]');fresh.click('[data-action=next]');canonical_step=fresh.locator('#weekly-step').input_value();after=stored(fresh)
 assert after[CONTENT]==before[CONTENT];assert json.loads(after[PROGRESS])[PERSONAL['id']]==personal_progress;assert json.loads(after[PROGRESS])['weekly-2026-08-09']['favorite']
 fresh.click('[data-action=back]');fresh.wait_for_selector('#weekly-search');fresh.screenshot(path=str(OUT/'personal-and-canonical-archive.png'))
 context.set_offline(True);fresh.reload();fresh.wait_for_selector('#weekly-search');assert fresh.locator('#weekly-results .weekly-card').count()==19;open_personal();fresh.click('[data-lesson="weekly-2026-08-09"]');assert fresh.locator('#weekly-step').input_value()==canonical_step;assert fresh.locator('[data-action=favorite]').get_attribute('aria-pressed')=='true';assert stored(fresh)==after
 (OUT/'personal-after-offline.json').write_text(json.dumps(after,indent=2));assert not errors,errors
 # Revise the personal member of the same-date pair through the real import form.
 # The raw read-only upgrade assertions above remain before this intentional edit.
 fresh.get_by_text('Lesson options & full text',exact=True).click();fresh.get_by_text('Full original lesson & source',exact=True).click()
 canonical_display=fresh.locator('.weekly-original').inner_text();assert canonical_display.strip()
 context.set_offline(False);fresh.click('[data-action=back]');fresh.wait_for_selector('#weekly-search')
 revised=json.loads(json.dumps(PERSONAL));revised['title']='My August bass study, revised';revised['sections'][1]['instructions']='Hold LH and repeat RH slowly.'
 bundled=json.loads((target/'data/weekly-lessons.json').read_text());canonical=next(l for l in bundled if l['id']=='weekly-2026-08-09')
 expected_records={l['id']:l for l in bundled};expected_records.update({l['id']:l for l in json.loads(after[CONTENT])});expected_records[PERSONAL['id']]=revised
 fresh.locator('.weekly-extra>summary').click();fresh.click('[data-action=import]');fresh.fill('#weekly-import-text',json.dumps(revised));fresh.get_by_role('button',name='Review Import',exact=True).click()
 assert fresh.locator('[data-action=save-import]').count()==1,fresh.locator('#weekly-status').inner_text()
 assert 'Updates this existing ID' in fresh.locator('#weekly-preview').inner_text()
 fresh.get_by_role('button',name='Import Reviewed Lesson',exact=True).click();fresh.wait_for_selector('#weekly-search')
 assert 'Lesson imported' in fresh.locator('#weekly-status').inner_text()
 def check_revised_storage():
  saved=stored(fresh);records=json.loads(saved[CONTENT])
  assert len(records)==19;assert {l['id']:l for l in records}==expected_records
  assert saved[PROGRESS]==after[PROGRESS] # Both independent progress records untouched.
  assert next(l for l in records if l['id']==canonical['id'])==canonical
  return saved
 def check_revised_ui():
  assert fresh.locator('#weekly-results .weekly-card').count()==19
  open_personal(revised)
  fresh.click('[data-lesson="weekly-my-august-practice"]');fresh.locator('.lesson-tips>summary').click()
  assert revised['sections'][1]['instructions'] in fresh.locator('.weekly-instructions').inner_text()
  assert fresh.evaluate('history.state.route.lessonId')==PERSONAL['id']
  fresh.click('[data-action=back]');fresh.wait_for_selector('#weekly-search')
  fresh.click('[data-lesson="weekly-2026-08-09"]')
  assert fresh.evaluate('history.state.route.lessonId')==canonical['id']
  assert fresh.locator('#weekly-home>h2').inner_text()=='One melody, changing ground'
  assert fresh.locator('#weekly-step').input_value()==canonical_step
  assert fresh.locator('[data-action=favorite]').get_attribute('aria-pressed')=='true'
  assert '✓' in fresh.locator('#weekly-step').inner_text()
  fresh.get_by_text('Lesson options & full text',exact=True).click();fresh.get_by_text('Full original lesson & source',exact=True).click()
  # The complete original remains the same; source-export tokens are presentation-only.
  assert fresh.locator('.weekly-original').inner_text()==canonical_display
  fresh.click('[data-action=back]');fresh.wait_for_selector('#weekly-search')
 check_revised_ui();reimported=check_revised_storage()
 (OUT/'personal-after-reimport.json').write_text(json.dumps(reimported,indent=2))
 context.set_offline(True);fresh.reload();fresh.wait_for_selector('#weekly-search');check_revised_ui();assert check_revised_storage()==reimported
 (OUT/'personal-revised-after-offline.json').write_text(json.dumps(stored(fresh),indent=2));assert not errors,errors
 context.close()
 clean=browser.new_context();pg=clean.new_page();pg.goto(url);pg.wait_for_selector('.record-label');studio_destination(pg,'archive');assert pg.locator('#weekly-results .weekly-card').count()==18;assert pg.locator('[data-lesson]').first.get_attribute('data-lesson')=='weekly-2026-11-08';clean.close()
 browser.close();server.shutdown();server.server_close()
 print('Base UI accepts 13; upgrade/reload/offline retain 19; clean install has 18. Read-only storage unchanged; personal revision imported; bundled content and both progress records intact offline.')
