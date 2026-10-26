"""Upgrade the actual merged v1.3 shell without clearing personal data."""
import functools,http.server,io,json,shutil,subprocess,tarfile,tempfile,threading
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
ASSETS=['index.html','styles.css','manifest.webmanifest','service-worker.js','js','icons','assets']
class Handler(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
 def end_headers(self):self.send_header('Cache-Control','no-store');super().end_headers()
with tempfile.TemporaryDirectory() as folder,sync_playwright() as p:
 target=Path(folder)/'piano';target.mkdir()
 data=subprocess.check_output(['git','archive','c822d353','--',*ASSETS],cwd=ROOT)
 with tarfile.open(fileobj=io.BytesIO(data)) as archive:archive.extractall(target,filter='data')
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=folder));threading.Thread(target=server.serve_forever,daemon=True).start()
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);context=browser.new_context(viewport={'width':393,'height':852},is_mobile=True,has_touch=True)
 page=context.new_page();url=f'http://127.0.0.1:{server.server_port}/piano/';page.goto(url);page.wait_for_selector('.key');page.wait_for_function('!!navigator.serviceWorker.controller')
 spec={'root':'C','quality':'major','octave':3,'inversion':0,'voicing':'close'}
 piece={'version':1,'id':'phone-upgrade','title':'Keep this piece','tempo':80,'key':'C','timeSignature':[4,4],'measures':[{'right':[{'id':'r1','beat':0,'duration':1,'pitches':['C4'],'rest':False}],'left':[{'id':'l1','beat':0,'duration':4,'pitches':['C3'],'rest':False}]}]}
 stored={'progressions':[{'name':'Keep this progression','key':'C','chords':[spec]}],'preferences':{'spec':spec},'session':[spec],'compositions-v1':[piece],'composition-draft-v1':piece}
 values={'jlk-studio-v1-'+k:json.dumps(v) for k,v in stored.items()}
 page.evaluate('(data)=>Object.entries(data).forEach(([k,v])=>localStorage.setItem(k,v))',values)
 for name in ASSETS:
  source=ROOT/name
  if source.is_dir():shutil.copytree(source,target/name,dirs_exist_ok=True)
  else:shutil.copy2(source,target/name)
 with context.expect_event('serviceworker') as event:page.evaluate('navigator.serviceWorker.getRegistration().then(r=>r.update())')
 worker=event.value;page.wait_for_function('navigator.serviceWorker.getRegistration().then(r=>!!r.waiting)')
 # Existing app remains usable while the downloaded version waits; no forced reload.
 assert page.locator('#composer-open').inner_text()=='Create';assert page.locator('.key').count()>20
 page.close()
 worker.evaluate("() => new Promise((resolve,reject)=>{const deadline=Date.now()+10000;function check(){if(self.registration.active?.state==='activated'&&!self.registration.waiting)return resolve();if(Date.now()>deadline)return reject(Error('activation timeout'));setTimeout(check,25);}check();})")
 fresh=context.new_page();errors=[];fresh.on('pageerror',lambda e:errors.append(str(e)));fresh.goto(url);fresh.wait_for_selector('.key');fresh.wait_for_function("caches.keys().then(k=>k.includes('jlk-studio-v1.3.1')&&!k.includes('jlk-studio-v1.3-b'))")
 fresh.tap('#composer-open');fresh.wait_for_selector('#composition-content',state='visible');assert fresh.locator('#composition-title').input_value()=='Keep this piece';assert fresh.locator('#composition-library option').count()==2
 actual=fresh.evaluate('(keys)=>Object.fromEntries(keys.map(k=>[k,localStorage.getItem(k)]))',list(values));assert actual==values
 context.set_offline(True);fresh.reload();fresh.wait_for_selector('.key');fresh.tap('#composer-open');fresh.wait_for_selector('#composition-content',state='visible');fresh.tap('#composition-play');fresh.wait_for_selector('#composition-score .score-sounding');fresh.tap('#composition-stop')
 assert not errors,errors;print(json.dumps({'upgrade':'actual merged v1.3 to v1.3.1 under repository subpath','waiting':'no forced activation while old client is open','data':'compositions, draft, progression, preferences and session byte-for-byte retained','offline':'new lazy composer opens and plays with new cached assets','errors':errors},indent=2))
 browser.close();server.shutdown();server.server_close()
