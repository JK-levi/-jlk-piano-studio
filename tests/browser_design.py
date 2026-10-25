"""v1.2 screen/disclosure/control regression and review screenshot capture."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUTPUT=Path(os.environ.get('JLK_SCREENSHOT_DIR',str(ROOT/'docs'/'screenshots')))
OUTPUT.mkdir(parents=True,exist_ok=True)
BASE=os.environ.get('JLK_BASE_URL','http://127.0.0.1:8000/')
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox','--autoplay-policy=user-gesture-required'])
    context=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=1,has_touch=True,is_mobile=True)
    page=context.new_page();errors=[];external=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('request',lambda request:external.append(request.url) if not request.url.startswith(BASE.split('/',3)[0]+'//'+BASE.split('/')[2]) else None)
    page.goto(BASE);page.wait_for_selector('.key')
    page.wait_for_function('!!navigator.serviceWorker.controller')
    assert page.locator('body').get_attribute('data-experience')=='explore'
    assert page.locator('#studio-panel').is_hidden() and page.locator('#practice-banner').is_hidden()
    assert page.locator('#sound-settings').is_hidden()
    assert not page.locator('#chord-editor').evaluate('(n)=>n.open')
    assert page.locator('#notation').bounding_box()['y']<550
    assert page.locator('#play-chord').is_visible()
    # Real editor action, all fields, both label switches, and theory.
    page.tap('#edit-chord');assert page.locator('#chord-editor').evaluate('(n)=>n.open')
    assert page.locator('#edit-chord').get_attribute('aria-expanded')=='true'
    assert page.locator('#quality option').count()==13
    assert page.locator('#root option').count()==17
    page.select_option('#root','Ab');page.select_option('#quality','major7')
    page.select_option('#inversion','1');page.select_option('#octave','3');page.select_option('#voicing','open')
    assert 'A♭maj7/C' in page.locator('#chord-heading').inner_text()
    page.locator('#theory-details summary').click();assert '1 · 3 · 5 · 7' in page.locator('#formula').inner_text()
    assert 'A♭, C, E♭, G' in page.locator('#explanation').inner_text()
    page.uncheck('#staff-labels');page.check('#staff-labels');page.uncheck('#key-labels');page.check('#key-labels')
    page.select_option('#root','C');page.select_option('#quality','major7');page.select_option('#inversion','0');page.select_option('#octave','4');page.select_option('#voicing','close')
    page.locator('#chord-editor summary').click();page.locator('#theory-details summary').click()
    # Sound is explicitly available, compact by default, and can be closed by keyboard.
    page.tap('#sound-settings-toggle');page.tap('#test-sound');page.wait_for_selector('#audio-feedback .feedback-message')
    page.tap('#recover-audio');page.wait_for_function("document.querySelector('#audio-feedback').textContent.includes('Audio engine running')")
    page.tap('#close-sound');assert page.locator('#sound-settings').is_hidden()
    page.tap('#play-chord');page.wait_for_selector('.key.sounding');page.tap('#study-stop')
    page.fill('#study-tempo','180');page.locator('#study-tempo').dispatch_event('change')
    page.tap('#play-arpeggio');page.wait_for_selector('#notation .notehead.sounding')
    assert page.evaluate("""() => {const key=document.querySelector('.key.sounding'),note=document.querySelector('#notation .notehead.sounding');return key&&note&&key.dataset.midi===note.dataset.midi;}""")
    page.tap('#study-stop');page.check('#study-loop');page.tap('#replay');page.wait_for_selector('.key.sounding');page.tap('#study-stop');page.uncheck('#study-loop')
    page.tap('#play-chord');page.wait_for_function("document.querySelector('#study-position').textContent==='Complete'")
    page.fill('#study-tempo','0');page.locator('#study-tempo').dispatch_event('change')
    assert page.locator('#study-position').inner_text()=='Failed'
    assert page.locator('#study-feedback [role=alert]').is_visible()
    page.wait_for_timeout(100);assert page.locator('#study-feedback [role=alert]').count()==1
    page.locator('#study-feedback button',has_text='Dismiss').click()
    page.fill('#study-tempo','80');page.locator('#study-tempo').dispatch_event('change')
    assert page.locator('#study-position').inner_text()=='Stopped'
    # Bach stays a real study, and closes/stops cleanly without hidden controls.
    page.tap('#bach');page.tap('#play-bach');page.wait_for_selector('#bach-notation .notehead.sounding')
    page.tap('#stop-bach');assert page.locator('.sounding').count()==0
    page.tap('#bach-options');assert page.locator('#study-tempo').evaluate('(n)=>document.activeElement===n')
    page.tap('#close-bach');assert page.locator('#bach-panel').is_hidden()
    page.locator('.key[data-midi="60"]').tap();page.tap('#study-stop')
    # Fresh display captures: actual data and no fabricated library/history.
    page.tap('#play-chord');page.tap('#study-stop');page.evaluate('window.scrollTo(0,0)')
    page.screenshot(path=str(OUTPUT/'explore-mobile.png'),full_page=True)
    page.set_viewport_size({'width':1440,'height':1100});page.screenshot(path=str(OUTPUT/'explore-desktop.png'),full_page=True)
    page.set_viewport_size({'width':390,'height':844})
    # Dedicated progression view and every editing/persistence control.
    page.get_by_role('button',name='Progressions',exact=True).tap()
    assert page.locator('#study-transport').is_hidden() and page.locator('#bach-launch').is_hidden()
    assert page.locator('#studio-panel').is_visible() and page.locator('#practice-banner').is_hidden()
    assert page.locator('#studio-title').inner_text()=='The familiar'
    assert 'C major' in page.locator('#progression-key').inner_text()
    assert page.locator('.roman').all_text_contents()==['I','vi','IV','V']
    assert not page.locator('.chord-actions').first.is_visible()
    page.tap('#toggle-edit');page.get_by_role('button',name='Duplicate chord 1',exact=True).tap()
    page.get_by_role('button',name='Move chord 2 later',exact=True).tap();page.get_by_role('button',name='Move chord 3 earlier',exact=True).tap()
    page.get_by_role('button',name='Remove chord 2',exact=True).tap();assert page.locator('.chord-select').count()==4
    page.tap('#toggle-edit');page.locator('.chord-select').nth(1).tap();assert 'Am' in page.locator('#chord-heading').inner_text()
    page.locator('#progression-settings summary').tap();page.select_option('#pattern','broken');page.check('#metronome')
    page.uncheck('#voice-leading');page.tap('#transpose-up');page.tap('#transpose-down');page.check('#voice-leading')
    page.select_option('#analysis-key','Am');assert 'A minor' in page.locator('#progression-key').inner_text()
    page.select_option('#analysis-key','C');page.select_option('#pattern','block');page.uncheck('#metronome')
    page.tap('#open-save');page.fill('#save-name','A quiet morning');page.tap('#save-progression')
    assert page.locator('#studio-title').inner_text()=='A quiet morning'
    page.tap('#clear-progression');assert page.locator('#sequence-play').is_disabled()
    assert page.locator('#sequence-empty').is_visible()
    page.tap('#load-saved');assert page.locator('.chord-select').count()==4
    page.tap('#delete-saved');assert page.locator('#saved option').count()==1
    # Saved v1 data remains usable and current preferences survive reload.
    page.fill('#save-name','A quiet morning');page.tap('#save-progression')
    stored_prefs=page.evaluate("JSON.parse(localStorage.getItem('jlk-studio-v1-preferences'))")
    page.reload();page.wait_for_selector('.key')
    for field in ['root','quality','octave','inversion','voicing']:
        assert page.locator('#'+field).input_value()==str(stored_prefs['spec'][field])
    page.get_by_role('button',name='Progressions',exact=True).tap();page.tap('#open-save');page.select_option('#saved','0');page.tap('#load-saved')
    assert page.locator('#studio-title').inner_text()=='A quiet morning'
    page.tap('#open-save');page.select_option('#preset','0');page.tap('#load-preset')
    page.fill('#tempo','180');page.locator('#tempo').dispatch_event('change');page.check('#sequence-loop')
    page.tap('#sequence-play');page.wait_for_selector('#progression li.sounding');page.tap('#sequence-pause')
    assert page.locator('#position').inner_text().startswith('Paused')
    page.tap('#sequence-play');page.wait_for_selector('#progression li.sounding');page.tap('#sequence-stop')
    page.fill('#tempo','80');page.locator('#tempo').dispatch_event('change');page.uncheck('#sequence-loop')
    page.tap('#sequence-play');page.wait_for_selector('#progression li.sounding')
    page.evaluate('window.scrollTo(0,0)');page.screenshot(path=str(OUTPUT/'progressions-mobile.png'),full_page=True)
    page.set_viewport_size({'width':1440,'height':1100});page.screenshot(path=str(OUTPUT/'progressions-desktop.png'),full_page=True)
    page.tap('#sequence-stop');page.set_viewport_size({'width':390,'height':844})
    # Practice attempts are real, octave-specific and never imply microphone grading.
    page.get_by_role('button',name='Practice',exact=True).tap();assert page.locator('#studio-panel').is_hidden()
    page.tap('#edit-chord');page.select_option('#root','C');page.select_option('#quality','major');page.select_option('#octave','4');page.select_option('#inversion','0');page.select_option('#voicing','close');page.locator('#chord-editor summary').tap()
    for midi in [60,64]:page.locator(f'.key[data-midi="{midi}"]').tap()
    assert page.locator('#practice-meter').evaluate('(n)=>String(n.value)')=='2'
    assert page.locator('.key.selected').count()==0
    page.tap('#practice-hint');assert 'G4' in page.locator('#practice-progress').inner_text()
    page.tap('#reveal');assert page.locator('.key.selected').count()==3
    page.tap('#reveal');page.tap('#study-stop');page.evaluate('window.scrollTo(0,0)')
    page.screenshot(path=str(OUTPUT/'practice-mobile.png'),full_page=True)
    page.set_viewport_size({'width':1440,'height':1100});page.screenshot(path=str(OUTPUT/'practice-desktop.png'),full_page=True)
    page.tap('#practice-reset');assert page.locator('#practice-meter').evaluate('(n)=>String(n.value)')=='0'
    page.tap('#next-chord');assert '0 of' in page.locator('#practice-progress').inner_text()
    for width in [320,375,390,430,768,1440]:
        page.set_viewport_size({'width':width,'height':900})
        for name in ['Explore','Progressions','Practice']:
            page.get_by_role('button',name=name,exact=True).click()
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,name)
            assert page.locator('#notation svg').is_visible() and page.locator('#keyboard').is_visible()
            assert page.locator('#notation svg').bounding_box()['width']>=250
    # Reduced motion and keyboard access to native disclosures.
    page.emulate_media(reduced_motion='reduce')
    assert page.locator('.tab').first.evaluate('(n)=>getComputedStyle(n).transitionDuration')=='0s'
    page.get_by_role('button',name='Explore',exact=True).click();page.locator('#chord-editor summary').focus();page.keyboard.press('Enter')
    assert page.locator('#chord-editor').evaluate('(n)=>n.open')
    # Conditional install UI is exercised with the browser's event contract;
    # this does not stand in for actual iPhone Home Screen installation.
    page.evaluate("""() => {window.__prompts=0;const event=new Event('beforeinstallprompt',{cancelable:true});event.prompt=async()=>{window.__prompts++;};window.dispatchEvent(event);}""")
    page.click('#install');assert page.evaluate('__prompts')==1
    keys=page.evaluate('caches.keys()');assert 'jlk-studio-v1.2' in keys
    assert page.evaluate("caches.open('jlk-studio-v1.2').then(c=>c.match(new URL('./assets/studio-waves.svg',location.href).href)).then(Boolean)")
    assert page.evaluate("caches.open('jlk-studio-v1.2').then(c=>c.match(new URL('./js/layout.js',location.href).href)).then(Boolean)")
    context.set_offline(True);page.reload();page.wait_for_selector('.key')
    for name in ['Explore','Progressions','Practice']:page.get_by_role('button',name=name,exact=True).click()
    page.get_by_role('button',name='Explore',exact=True).click();page.tap('#play-chord');page.wait_for_selector('.key.sounding');page.tap('#study-stop')
    page.get_by_role('button',name='Progressions',exact=True).click();page.tap('#open-save');assert 'A quiet morning' in page.locator('#saved').inner_text()
    assert not external,external
    assert not errors,errors
    print(json.dumps({'screens':'Explore / Progressions / Practice, mobile and desktop screenshots','controls':'all existing controls plus native disclosures, sound/settings, key matching and installation affordance','layout':'320/375/390/430/768/1440px, keyboard navigation and reduced motion','offline':'new shell/background cached; all modes and playback work; saves preserved','runtime_dependencies':0,'page_errors':errors},indent=2))
    context.close();browser.close()
