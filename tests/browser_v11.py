from browser_helpers import open_chord_editor, open_sound, open_settings, open_save, edit_sequence, close_tasks, inspect_progression, choose_preset
"""Optional Chromium integration checks; run alongside the static preview server."""
import functools
import http.server
import json
import os
from pathlib import Path
import shutil
import tempfile
import threading
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get('JLK_BASE_URL', 'http://127.0.0.1:8000/')
PROBE = """
window.__contexts = [];
const Native = window.AudioContext;
window.AudioContext = class extends Native {
  constructor(...args) { super(...args); window.__contexts.push(this); }
  get state() { return this.simulatedState || super.state; }
  resume() { if (this.blockResume) return Promise.resolve(); this.simulatedState = null; return super.resume(); }
  createGain() { const node = super.createGain(); this.output ||= node; return node; }
};
"""
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium'), args=['--no-sandbox', '--autoplay-policy=user-gesture-required'])
    context = browser.new_context(viewport={'width':390,'height':844}, is_mobile=True, has_touch=True)
    context.add_init_script(PROBE)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(BASE)
    assert page.evaluate('window.__contexts.length') == 0
    open_sound(page)
    page.tap('#test-sound')
    page.wait_for_function("document.querySelector('#audio-feedback').textContent.includes('Test notes scheduled')")
    # Observe a nonzero synthesized waveform, without claiming device audibility.
    page.evaluate("""() => { const c = window.__contexts.at(-1); window.__analyser = c.createAnalyser(); c.output.connect(window.__analyser); }""")
    page.wait_for_function("""() => { const data = new Float32Array(window.__analyser.fftSize); window.__analyser.getFloatTimeDomainData(data); return data.some(value => Math.abs(value) > .0001); }""")
    page.evaluate('window.__contexts.at(-1).suspend()')
    page.wait_for_function("window.__contexts.at(-1).state === 'suspended'")
    close_tasks(page)
    page.tap('#play-chord')
    page.wait_for_function("window.__contexts.at(-1).state === 'running'")
    page.wait_for_selector('.key.sounding')
    close_tasks(page)
    page.tap('#study-stop')
    assert page.locator('.sounding').count() == 0
    # Simulate Safari resolving resume while remaining interrupted.
    page.evaluate("""() => { const c=window.__contexts.at(-1); c.simulatedState='interrupted'; c.blockResume=true; }""")
    close_tasks(page)
    page.tap('#play-chord')
    page.wait_for_function("!!document.querySelector('#study-feedback [role=alert]')")
    assert 'Recover audio' in page.locator('#study-feedback').inner_text()
    assert 'interrupted' in page.locator('#audio-status').inner_text()
    open_sound(page)
    page.tap('#recover-audio')
    page.wait_for_function('window.__contexts.length === 2')
    open_sound(page)
    page.tap('#test-sound')
    page.wait_for_function("document.querySelector('#audio-feedback').textContent.includes('Test notes scheduled')")
    close_tasks(page)
    page.tap('#study-stop')
    page.fill('#study-tempo', '180');page.locator('#study-tempo').dispatch_event('change')
    page.tap('#play-arpeggio')
    page.wait_for_selector('#notation .notehead.sounding')
    # Staff and piano identify the same currently sounding note.
    def synchronized():
        return page.evaluate("""() => {
          const keys=[...document.querySelectorAll('.key.sounding')].map(n=>n.dataset.midi).sort();
          const heads=[...document.querySelectorAll('#notation .notehead.sounding')].map(n=>n.dataset.midi).sort();
          return keys.length === 1 && JSON.stringify(keys) === JSON.stringify(heads);
        }""")
    assert synchronized()
    page.wait_for_timeout(200)
    assert synchronized()
    page.wait_for_function("document.querySelector('#study-position').textContent === 'Complete'")
    assert page.locator('.sounding').count() == 0
    page.check('#study-loop');page.tap('#replay')
    page.wait_for_timeout(1800)
    assert 'Loop' in page.locator('#study-position').inner_text()
    close_tasks(page)
    page.tap('#study-stop');assert page.locator('.sounding').count() == 0
    page.uncheck('#study-loop')
    page.tap('#bach');page.select_option('#study-picker','bach');page.tap('#play-bach')
    page.wait_for_selector('#bach-notation .score-sounding')
    assert page.locator('#bach-notation svg').count() == 4
    page.screenshot(path=str(Path(tempfile.gettempdir())/'jlk-v11-mobile.png'), full_page=True)
    page.tap('#stop-bach');close_tasks(page)
    page.get_by_role('button',name='Practice',exact=True).tap()
    page.tap('#practice-hint');assert 'C4' in page.locator('#practice-progress').inner_text()
    page.locator('.key[data-midi="61"]').tap()
    assert '0 of 3' in page.locator('#practice-progress').inner_text()
    for midi in [60,60,64,67]: page.locator(f'.key[data-midi="{midi}"]').tap()
    assert 'Chord complete' in page.locator('#practice-progress').inner_text()
    assert page.locator('.key.selected').count() == 0
    page.tap('#practice-reset');assert '0 of 3' in page.locator('#practice-progress').inner_text()
    page.get_by_role('button',name='Progressions',exact=True).tap()
    open_save(page)
    choose_preset(page,'4')
    assert page.locator('.roman').all_text_contents() == ['i','VI','iv','V7']
    close_tasks(page)
    page.fill('#tempo','180');page.locator('#tempo').dispatch_event('change')
    open_settings(page)
    page.tap('#clear-progression');open_chord_editor(page);page.tap('#add-chord');close_tasks(page);page.check('#sequence-loop')
    page.tap('#sequence-play');page.wait_for_timeout(1800)
    assert 'Loop' in page.locator('#position').inner_text()
    assert not page.locator('#sequence-pause').is_disabled()
    page.tap('#sequence-stop');assert page.locator('.sounding').count() == 0
    for width in [320,390,768,1440]:
        page.set_viewport_size({'width':width,'height':900})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), width
    assert not errors, errors
    context.close()

    # Upgrade fixture: keep an old worker/tab open, install the new worker, close
    # old clients, then verify activation, old-cache cleanup and offline modules.
    class Handler(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *args): pass
        def end_headers(self):
            self.send_header('Cache-Control','no-store')
            super().end_headers()
    with tempfile.TemporaryDirectory() as directory:
        dest = Path(directory)
        (dest/'index.html').write_text("""<!doctype html><title>Previous cached shell</title><script>navigator.serviceWorker.register('./service-worker.js')</script>""")
        (dest/'service-worker.js').write_text("""const C='jlk-studio-v1';self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(['./','./index.html']))));self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));""")
        server = http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=directory))
        thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
        upgrade=browser.new_context()
        old=upgrade.new_page();url=f'http://127.0.0.1:{server.server_port}/'
        old.goto(url);old.wait_for_function('!!navigator.serviceWorker.controller')
        legacy=[{'name':'From version 1','chords':[{'root':'C','quality':'major','octave':4,'inversion':0,'voicing':'close'}]}]
        old.evaluate('(saves)=>localStorage.setItem("jlk-studio-v1-progressions",JSON.stringify(saves))',legacy)
        for name in ['index.html','styles.css','manifest.webmanifest','service-worker.js','js','icons','assets']:
            source=ROOT/name
            if source.is_dir(): shutil.copytree(source,dest/name,dirs_exist_ok=True)
            else: shutil.copy2(source,dest/name)
        with upgrade.expect_event('serviceworker') as worker_event:
            old.evaluate('navigator.serviceWorker.getRegistration().then(r=>r.update())')
        new_worker=worker_event.value
        old.wait_for_function('navigator.serviceWorker.getRegistration().then(r=>!!r.waiting)')
        old.close()
        new_worker.evaluate("""() => new Promise(resolve => {
          const worker=self.registration.waiting || self.registration.active;
          if(worker.state==='activated') return resolve();
          worker.addEventListener('statechange',()=>{if(worker.state==='activated')resolve();});
        })""")
        new_worker.evaluate("""() => new Promise((resolve,reject) => {
          const deadline=Date.now()+10000;
          async function check() {
            const keys=await caches.keys();
            if(keys.includes('jlk-studio-v1.3-b')&&!keys.includes('jlk-studio-v1'))return resolve();
            if(Date.now()>deadline)return reject(new Error('New worker did not finish cache cleanup'));
            setTimeout(check,25);
          }
          check();
        })""")
        fresh=upgrade.new_page();fresh.goto(url)
        fresh.wait_for_selector('#test-sound',state='attached')
        fresh.wait_for_function("caches.keys().then(keys=>keys.includes('jlk-studio-v1.3-b')&&!keys.includes('jlk-studio-v1'))")
        fresh.get_by_role('button',name='Progressions',exact=True).click()
        assert fresh.locator('#saved option').all_text_contents() == ['Choose a saved progression','From version 1']
        open_save(fresh);fresh.select_option('#saved','0');fresh.click('#load-saved')
        assert fresh.locator('.chord-select').count() == 1
        upgrade.set_offline(True);fresh.reload();fresh.wait_for_selector('#test-sound',state='attached')
        open_sound(fresh);fresh.click('#test-sound');fresh.wait_for_selector('.key.sounding')
        upgrade.close();server.shutdown();server.server_close()
    browser.close()
    print(json.dumps({'audio':'nonzero waveform, suspend/resume, rejected interrupted state and recovery', 'visuals':'staff/keyboard synchronized, repeat and stop cleanup', 'practice':'octave attempts, duplicate rejection, hints and reset', 'layout':'320/390/768/1440 px without page overflow', 'offline':'old worker update, new cache, legacy saves and offline audio', 'page_errors':errors},indent=2))
