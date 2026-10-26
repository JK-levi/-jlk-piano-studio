from browser_helpers import open_chord_editor, open_sound, open_settings, open_save, edit_sequence, close_tasks, inspect_progression, choose_preset
from playwright.sync_api import sync_playwright
import json
import os
import tempfile
from pathlib import Path
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox','--autoplay-policy=user-gesture-required'])
    context=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=1,has_touch=True,is_mobile=True)
    context.add_init_script("""
      window.__audioProbe = { contexts: 0, starts: [], stops: 0 };
      const NativeAudioContext = window.AudioContext;
      window.AudioContext = class extends NativeAudioContext {
        constructor(...args) { super(...args); window.__audioProbe.contexts++; }
        createOscillator() {
          const osc = super.createOscillator();
          const start = osc.start.bind(osc), stop = osc.stop.bind(osc);
          osc.start = (...args) => { window.__audioProbe.starts.push(osc.frequency.value); return start(...args); };
          osc.stop = (...args) => { window.__audioProbe.stops++; return stop(...args); };
          return osc;
        }
      };
    """)
    page=context.new_page()
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    response=page.goto(os.environ.get('JLK_BASE_URL','http://127.0.0.1:8000/'))
    assert response.status==200
    page.wait_for_selector('.key.selected')
    assert page.locator('.key.selected').count()==3
    assert page.locator('#note-summary').inner_text()=='C4 · E4 · G4'
    page.screenshot(path=str(Path(tempfile.gettempdir())/'jlk-mobile.png'),full_page=True)
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    open_chord_editor(page)
    page.select_option('#root','Bb');page.select_option('#quality','minor9')
    assert page.locator('#note-summary').inner_text()=='B♭4 · D♭5 · F5 · A♭5 · C6'
    assert page.locator('.key.selected').count()==5
    page.select_option('#inversion','4')
    assert page.locator('#note-summary').inner_text()=='C6 · D♭6 · F6 · A♭6 · B♭6'
    assert page.evaluate('window.__audioProbe.contexts')==0
    # Unlock audio with actual buttons and inspect context errors through pageerror.
    close_tasks(page)
    page.click('#play-chord');page.click('#play-arpeggio');page.locator('.key.white').first.click()
    assert page.evaluate('window.__audioProbe.starts.length')>0
    assert page.evaluate('window.__audioProbe.stops')>0
    page.get_by_role('button',name='Practice',exact=True).click()
    assert page.locator('.key.selected').count()==0
    page.click('#reveal');assert page.locator('.key.selected').count()==5
    page.click('#reveal');assert page.locator('.key.selected').count()==0
    page.get_by_role('button',name='Progressions',exact=True).click()
    assert page.locator('.chord-select').count()==4
    open_chord_editor(page)
    page.click('#add-chord');assert page.locator('.chord-select').count()==5
    edit_sequence(page)
    page.get_by_role('button',name='Duplicate chord 1',exact=True).click();assert page.locator('.chord-select').count()==6
    page.get_by_role('button',name='Move chord 1 later',exact=True).click()
    page.get_by_role('button',name='Remove chord 6',exact=True).click();assert page.locator('.chord-select').count()==5
    open_save(page)
    page.fill('#save-name','Evening <study>');page.click('#save-progression')
    assert 'saved on this device' in page.locator('#save-feedback').inner_text()
    open_settings(page)
    page.click('#clear-progression');assert page.locator('.chord-select').count()==0
    open_save(page);page.click('#load-saved');assert page.locator('.chord-select').count()==5
    open_settings(page)
    page.click('#transpose-down');page.click('#transpose-up')
    close_tasks(page)
    page.fill('#tempo','180');page.locator('#tempo').dispatch_event('change')
    open_settings(page)
    page.check('#metronome');page.select_option('#pattern','broken')
    close_tasks(page)
    page.click('#sequence-play');page.wait_for_function("document.querySelector('#position').textContent.includes('Beat')")
    page.click('#sequence-pause');assert 'Paused' in page.locator('#position').inner_text()
    page.click('#sequence-play');page.wait_for_timeout(400);page.click('#sequence-stop')
    assert page.locator('#position').inner_text()=='Stopped'
    # A full single-chord playthrough at 180 BPM takes 1.34 seconds.
    open_settings(page)
    page.click('#clear-progression');open_chord_editor(page);page.click('#add-chord');close_tasks(page);page.click('#sequence-play')
    page.wait_for_function("document.querySelector('#position').textContent==='Complete'",timeout=5000)
    page.reload();page.wait_for_selector('.key');assert page.locator('.chord-select').count()==1
    page.get_by_role('button',name='Progressions',exact=True).click();open_save(page);page.select_option('#saved','0');page.click('#load-saved');assert page.locator('.chord-select').count()==5
    close_tasks(page)
    page.get_by_role('button',name='Explore',exact=True).click()
    page.click('#bach');page.select_option('#study-picker','bach');page.click('#play-bach');assert page.locator('#bach-notation svg').count()==4
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.set_viewport_size({'width':320,'height':740})
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.set_viewport_size({'width':390,'height':844})
    page.wait_for_function('!!navigator.serviceWorker.controller')
    cache=page.evaluate('caches.keys()');assert 'jlk-studio-v1.3-b' in cache
    context.set_offline(True);page.reload();page.wait_for_selector('.key');assert page.locator('.key').count()>20
    assert 'OFFLINE' in page.locator('#connection').inner_text()
    context.set_offline(False)
    page.set_viewport_size({'width':1440,'height':1100});page.reload();page.wait_for_selector('.key')
    page.screenshot(path=str(Path(tempfile.gettempdir())/'jlk-desktop.png'),full_page=True)
    assert not errors,errors
    print(json.dumps({'browser':'Chromium','mobile':'390px, no overflow','playback':'chord/arpeggio/sequence/pause/resume/stop/complete','storage':'save/load/reload','PWA':'service worker controls page, offline reload works','page_errors':errors,'cache':cache},indent=2))
    browser.close()
