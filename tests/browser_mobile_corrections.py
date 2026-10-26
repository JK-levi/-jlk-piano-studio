"""Public mobile navigation, create failure paths and cache isolation checks."""
import json,os,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_helpers import close_tasks
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'docs/screenshots/mobile-corrections';OUT.mkdir(parents=True,exist_ok=True)
BASE=os.environ.get('JLK_BASE_URL','http://127.0.0.1:8000/')
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':393,'height':852},has_touch=True,is_mobile=True)
 context.add_init_script("window.__toneStarts=0;const Native=window.AudioContext;window.AudioContext=class extends Native{createOscillator(){const o=super.createOscillator(),start=o.start.bind(o);o.start=(...a)=>{__toneStarts++;return start(...a)};return o}};")
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(BASE);page.wait_for_selector('.key')
 assert page.locator('.header-motto').count()==0 and page.locator('.app-header button').count()==0
 assert page.locator('#composer-open').inner_text().startswith('Create Sheet Music')
 for width,height in [(320,844),(375,812),(390,844),(393,852),(430,932),(844,390),(1440,900)]:
  page.set_viewport_size({'width':width,'height':height})
  for scale in [1,1.5,2]:
   page.evaluate('(s)=>document.documentElement.style.fontSize=(15*s)+"px"',scale)
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,scale)
   for selector in ['.brand','#composer-open','#sound-settings-toggle','[data-mode=explore]','[data-mode=studio]','[data-mode=practice]']:
    r=page.locator(selector).bounding_box();assert r['x']>=0 and r['x']+r['width']<=width+1,(width,scale,selector,r)
    if selector!='.brand':assert r['height']>=44
   assert page.locator('#composer-open').evaluate('(n)=>{const r=n.getBoundingClientRect();return n.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}')
  page.evaluate('document.documentElement.style.fontSize="15px"')
 page.set_viewport_size({'width':393,'height':852});page.screenshot(path=str(OUT/'header-iphone.png'))
 # Previous/next and all sequence entries inspect without audio initialization.
 page.get_by_role('button',name='Progressions',exact=True).tap();page.tap('#view-voicing')
 assert page.locator('#detail-position').inner_text()=='1 of 4';assert page.locator('#detail-previous').is_disabled()
 for i,name,pitches in [(1,'Am',[57,60,64]),(2,'F',[53,57,60]),(3,'G',[55,59,62]),(0,'C',[48,52,55])]:
  page.locator('#detail-chords button').nth(i).tap();assert page.locator('#detail-position').inner_text()==f'{i+1} of 4';assert page.locator('#chord-heading').inner_text().startswith(name)
  actual=page.locator('#keyboard .selected').evaluate_all('(nodes)=>nodes.map(n=>Number(n.dataset.midi)).sort((a,b)=>a-b)');assert actual==pitches,(actual,pitches)
  assert page.locator('#notation .notehead').evaluate_all('(nodes)=>[...new Set(nodes.map(n=>Number(n.dataset.midi)))].sort((a,b)=>a-b)')==pitches
 assert page.evaluate('__toneStarts')==0
 page.tap('#detail-next');assert page.locator('#detail-position').inner_text()=='2 of 4';page.tap('#detail-previous');assert page.locator('#detail-position').inner_text()=='1 of 4'
 # Touch focus is quiet; Tab restores a visible keyboard indicator.
 assert page.locator('#task-back').evaluate('(n)=>getComputedStyle(n).outlineStyle')=='none'
 page.keyboard.press('Tab');assert page.locator(':focus-visible').count()>0
 assert page.locator(':focus-visible').first.evaluate('(n)=>getComputedStyle(n).outlineStyle')!='none'
 page.locator('#detail-chords button').nth(1).tap();page.screenshot(path=str(OUT/'selected-chord-iphone.png'))
 page.fill('#tempo','180');page.locator('#tempo').dispatch_event('change');page.tap('#sequence-play');page.wait_for_selector('#detail-chords .playing')
 page.locator('#detail-chords button').nth(3).tap();assert page.locator('#detail-position').inner_text()=='4 of 4'
 page.wait_for_function("document.querySelector('#detail-chords .playing')?.dataset.index==='1'",timeout=5000)
 assert page.locator('#detail-position').inner_text()=='4 of 4';assert page.locator('#chord-heading').inner_text().startswith('G');assert page.locator('#position').inner_text().startswith('Playing')
 page.tap('#sequence-pause');assert page.locator('#position').inner_text().startswith('Paused');page.tap('#sequence-play');page.wait_for_selector('#detail-chords .playing');page.tap('#sequence-stop');assert page.locator('#detail-chords .playing').count()==0
 close_tasks(page);page.tap('#toggle-edit')
 for _ in range(8):page.get_by_role('button',name='Duplicate chord 1',exact=True).tap()
 close_tasks(page);page.tap('#view-voicing');assert page.locator('#detail-chords button').count()==12
 page.locator('#detail-chords button').last.tap();assert page.locator('#detail-position').inner_text()=='12 of 12';assert page.locator('#detail-next').is_disabled()
 assert page.locator('#task-body').evaluate('(n)=>n.scrollWidth<=n.clientWidth');assert page.locator('#detail-chords').evaluate('(n)=>n.scrollWidth>n.clientWidth')
 close_tasks(page);page.tap('#composer-open');page.wait_for_selector('#composition-content',state='visible');page.wait_for_timeout(400);assert page.locator('#task-view').evaluate('(n)=>n.open')
 page.fill('#composition-title','Phone sketch');page.locator('#composition-title').dispatch_event('change');page.tap('#composition-insert-note');page.tap('#composition-save');assert 'saved' in page.locator('#composition-feedback').inner_text()
 page.tap('#composition-play');page.wait_for_selector('#composition-score .score-sounding');page.tap('#composition-stop');page.locator('#composition-print-area').scroll_into_view_if_needed();page.screenshot(path=str(OUT/'create-iphone.png'))
 page.tap('#task-back');page.wait_for_function("!document.querySelector('#task-view').open");assert page.locator('#studio-panel').is_visible();page.go_forward();page.wait_for_selector('#composition-content',state='visible');assert page.locator('#composition-title').input_value()=='Phone sketch';close_tasks(page)
 page.wait_for_function('!!navigator.serviceWorker.controller');context.set_offline(True);page.reload();page.wait_for_selector('.key');page.tap('#composer-open');page.wait_for_selector('#composition-content',state='visible');assert page.locator('#composition-title').input_value()=='Phone sketch';assert page.locator('#composition-library option').count()==2
 assert not errors,errors;context.close()
 # Initialization/import failures are caught inside the existing editor; no data writes.
 for fixture in ['init','module','stale-layout','bad-draft','app-start']:
  c=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,service_workers='block');q=c.new_page();faults=[];q.on('pageerror',lambda e:faults.append(str(e)))
  raw='{bad JSON' if fixture=='bad-draft' else '{"kept":"saved data fixture"}'
  c.add_init_script('(function(){localStorage.setItem("jlk-studio-v1-composition-draft-v1",'+json.dumps(raw)+');localStorage.setItem("jlk-studio-v1-compositions-v1","[]");})();')
  if fixture=='init':q.route('**/js/composer.js',lambda route:route.fulfill(content_type='application/javascript',body='export function setupComposer(){throw Error("init fixture")}'))
  if fixture=='module':q.route('**/js/composer.js',lambda route:route.abort())
  if fixture=='stale-layout':
   old=subprocess.check_output(['git','show','76a0268:js/layout.js'],cwd=ROOT,text=True);q.route('**/js/layout.js',lambda route:route.fulfill(content_type='application/javascript',body=old))
  if fixture=='app-start':q.route('**/js/app.js',lambda route:route.fulfill(content_type='application/javascript',body='throw Error("startup fixture")'))
  q.goto(BASE)
  if fixture=='app-start':q.wait_for_selector('#startup-error',state='visible')
  else:q.wait_for_selector('.key');q.tap('#composer-open')
  if fixture in ['init','module']:
   q.wait_for_selector('#composition-feedback [role=alert]');assert 'have not been deleted' in q.locator('#composition-feedback').inner_text();assert q.locator('#composition-content').is_hidden();close_tasks(q);assert q.locator('#workspace').is_visible()
  elif fixture=='stale-layout':q.wait_for_selector('#startup-error',state='visible');assert not q.locator('#task-view').evaluate('(n)=>n.open')
  elif fixture=='bad-draft':q.wait_for_selector('#composition-content',state='visible')
  assert q.evaluate('localStorage.getItem("jlk-studio-v1-composition-draft-v1")')==raw;assert not faults,faults;c.close()
 # A generic browser-wide cache entry must not supply another version's module.
 c=browser.new_context(has_touch=True);q=c.new_page();q.route(BASE,lambda route:route.fulfill(content_type='text/html',body='<title>cache fixture</title>'));q.goto(BASE)
 q.evaluate("async()=>{const cache=await caches.open('legacy-module-fixture');await cache.put(new URL('./js/composer.js',location.href),new Response('throw Error(\"wrong cached version\")',{headers:{'Content-Type':'application/javascript'}}));}")
 q.unroute(BASE);q.goto(BASE);q.wait_for_selector('.key');q.wait_for_function('!!navigator.serviceWorker.controller');q.tap('#composer-open');q.wait_for_selector('#composition-content',state='visible');assert q.locator('#composition-feedback [role=alert]').count()==0;c.close()
 browser.close();print(json.dumps({'chords':'manual selection and synchronized score/keys, independent playing marker, transport, 12-card strip','header':'320/375/390/393/430, landscape, desktop and 150/200% text','create':'entry/save/play, Back/Done/Forward, draft and offline reopening','failures':'init/import/stale navigation visibly explained, corrupt draft retained','focus':'touch quiet, keyboard visible','cache':'worker-local lookup excludes wrong-version generic cache'},indent=2))
