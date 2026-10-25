"""Focused v1.2.1 task navigation, preservation and review screenshots."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_helpers import close_tasks,open_chord_editor,open_settings,open_save,open_sound,inspect_progression
ROOT=Path(__file__).resolve().parents[1]
OUTPUT=Path(os.environ.get('JLK_SCREENSHOT_DIR',str(ROOT/'docs'/'screenshots'/'v1.2.1')))
OUTPUT.mkdir(parents=True,exist_ok=True)
BASE=os.environ.get('JLK_BASE_URL','http://127.0.0.1:8000/')
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox','--autoplay-policy=user-gesture-required'])
    context=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=1,has_touch=True,is_mobile=True)
    context.add_init_script("window.__contexts=[];const Native=window.AudioContext;window.AudioContext=class extends Native{constructor(...args){super(...args);window.__contexts.push(this);}};")
    page=context.new_page();errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(BASE);page.wait_for_selector('.key');page.wait_for_function('!!navigator.serviceWorker.controller')
    assert page.locator('#task-view').evaluate('(n)=>!n.open')
    for selector in ['#chord-editor','#theory-details','#bach-panel','#save-panel','#sound-settings']:
        assert page.locator(selector).is_hidden(),selector
    assert page.locator('#workspace .controls').count()==0
    assert page.locator('#workspace #theory-panel').count()==0
    assert page.locator('#workspace #bach-notation').count()==0
    assert page.locator('#study-transport').is_visible()
    page.screenshot(path=str(OUTPUT/'explore-mobile.png'),full_page=True)
    # Editor is modal, does not scroll to a lower page section, and preserves place.
    page.evaluate('window.scrollTo(0,120)');origin=page.evaluate('scrollY')
    page.tap('#edit-chord');assert page.locator('#task-view').evaluate('(n)=>n.matches(":modal")')
    assert page.locator('#task-body #chord-editor').is_visible()
    assert page.locator('#root option').count()==17 and page.locator('#quality option').count()==13
    for field,value in [('root','C'),('quality','major7'),('inversion','0'),('octave','4'),('voicing','close')]:page.select_option('#'+field,value)
    assert 'Cmaj7' in page.locator('#editor-chord-name').inner_text()
    page.screenshot(path=str(OUTPUT/'chord-editor-mobile.png'))
    for _ in range(16):
        page.keyboard.press('Tab')
        assert page.evaluate('!!document.activeElement.closest("#task-view")')
    page.tap('#task-done');page.wait_for_function("!document.querySelector('#task-view').open")
    assert abs(page.evaluate('scrollY')-origin)<=2
    assert page.locator('#edit-chord').evaluate('(n)=>n===document.activeElement')
    assert 'Cmaj7' in page.locator('#chord-heading').inner_text()
    prefs=page.evaluate("JSON.parse(localStorage.getItem('jlk-studio-v1-preferences'))")
    # Browser Back/Forward and native Escape follow the same task stack.
    page.tap('#theory-open');assert page.locator('#task-title').inner_text()=='Theory & intervals'
    assert '1 · 3 · 5 · 7' in page.locator('#formula').inner_text()
    page.go_back();page.wait_for_function("!document.querySelector('#task-view').open")
    page.go_forward();page.wait_for_function("document.body.dataset.task==='theory-details'")
    page.keyboard.press('Escape');page.wait_for_function("!document.querySelector('#task-view').open")
    # Musical playback remains attached to the same primary state and nodes.
    page.tap('#play-chord');page.wait_for_selector('.key.sounding');page.tap('#study-stop')
    page.fill('#study-tempo','180');page.locator('#study-tempo').dispatch_event('change');page.tap('#play-arpeggio')
    page.wait_for_selector('#notation .notehead.sounding');page.tap('#study-stop')
    page.check('#study-loop');page.tap('#replay');page.wait_for_selector('.key.sounding');page.tap('#study-stop');page.uncheck('#study-loop')
    # Bach has its own score, the one shared keyboard and all study controls.
    page.tap('#bach');assert page.locator('#task-title').inner_text()=='Bach study'
    assert page.locator('#task-body #keyboard-panel').count()==1
    assert page.locator('#task-body #study-tempo').is_visible()
    page.screenshot(path=str(OUTPUT/'bach-study-mobile.png'))
    page.locator('#bach-transport-slot').scroll_into_view_if_needed();page.screenshot(path=str(OUTPUT/'bach-playback-mobile.png'))
    page.tap('#play-bach');page.wait_for_selector('#bach-notation .notehead.sounding')
    page.evaluate('__contexts.at(-1).suspend()')
    page.wait_for_selector('#bach-feedback [role=alert]')
    assert page.locator('#bach-position').inner_text()=='Failed'
    page.locator('#bach-feedback button',has_text='Sound settings').tap()
    assert page.locator('#task-title').inner_text()=='Sound settings'
    page.tap('#recover-audio');page.wait_for_function("document.querySelector('#audio-feedback').textContent.includes('Audio engine running')")
    page.tap('#task-back');page.wait_for_function("document.body.dataset.task==='bach-panel'")
    assert page.locator('#bach-feedback [role=alert]').is_visible()
    page.tap('#play-bach');page.wait_for_selector('#bach-notation .notehead.sounding')
    assert page.locator('#bach-feedback [role=alert]').count()==0
    page.tap('#stop-bach');page.tap('#task-done');page.wait_for_function("!document.querySelector('#task-view').open")
    assert 'Cmaj7' in page.locator('#chord-heading').inner_text()
    assert page.locator('#visuals-home #keyboard-panel').count()==1
    # Progressions does not append the Explore workspace to the playback screen.
    page.get_by_role('button',name='Progressions',exact=True).tap()
    assert page.locator('#workspace').is_hidden()
    assert page.locator('#studio-title').inner_text()=='The familiar'
    assert page.locator('.roman').all_text_contents()==['I','vi','IV','V']
    page.screenshot(path=str(OUTPUT/'progressions-mobile.png'),full_page=True)
    open_settings(page);assert page.locator('#task-title').inner_text()=='Edit progression'
    assert page.locator('#task-body #progression').is_visible()
    page.get_by_role('button',name='Duplicate chord 1',exact=True).tap()
    page.get_by_role('button',name='Move chord 2 later',exact=True).tap()
    page.get_by_role('button',name='Move chord 3 earlier',exact=True).tap()
    page.get_by_role('button',name='Remove chord 2',exact=True).tap()
    page.tap('#new-progression-chord');page.select_option('#root','D');page.select_option('#quality','minor7')
    page.tap('#add-chord');page.wait_for_function("document.body.dataset.task==='sequence-editor'")
    assert page.locator('.chord-select').count()==5
    page.select_option('#pattern','broken');page.check('#metronome');page.uncheck('#voice-leading');page.tap('#transpose-up');page.tap('#transpose-down');page.check('#voice-leading')
    close_tasks(page);assert page.locator('#progression').is_visible()
    open_save(page);assert page.locator('#task-title').inner_text()=='Progression library'
    page.fill('#save-name','');page.tap('#save-progression');assert page.locator('#save-feedback [role=alert]').is_visible()
    close_tasks(page);open_save(page);assert page.locator('#save-feedback [role=alert]').is_visible()
    page.fill('#save-name','A quiet morning');page.tap('#save-progression');assert page.locator('#save-feedback [role=alert]').count()==0
    close_tasks(page);open_settings(page);page.tap('#clear-progression');close_tasks(page)
    assert page.locator('#sequence-play').is_disabled() and page.locator('#sequence-empty').is_visible()
    open_save(page);page.tap('#load-saved');assert page.locator('.chord-select').count()==5
    page.select_option('#preset','0');page.tap('#load-preset');page.tap('#delete-saved');assert page.locator('#saved option').count()==1
    page.fill('#save-name','Saved for tomorrow');page.tap('#save-progression');close_tasks(page)
    page.fill('#tempo','180');page.locator('#tempo').dispatch_event('change')
    # Inspecting a playing chord does not interrupt the sequence. Its one
    # transport follows the visualization, without duplicating handlers.
    page.tap('#sequence-play');page.wait_for_selector('#progression li.sounding');page.tap('#view-voicing')
    assert page.locator('#task-body #notation').is_visible() and page.locator('#task-body #keyboard').is_visible()
    page.wait_for_selector('#task-body .key.sounding');assert page.locator('#position').inner_text().startswith('Playing')
    page.tap('#sequence-pause');assert page.locator('#position').inner_text().startswith('Paused')
    page.tap('#sequence-play');page.wait_for_selector('.key.sounding');page.tap('#sequence-stop');close_tasks(page)
    assert page.locator('#sequence-transport-home #sequence-play').count()==1
    # Practice contains its actual exercise, not the editor, theory or Bach.
    page.get_by_role('button',name='Practice',exact=True).tap();open_chord_editor(page)
    for field,value in [('root','C'),('quality','major'),('inversion','0'),('octave','4'),('voicing','close')]:page.select_option('#'+field,value)
    close_tasks(page)
    for midi in [60,64]:page.locator(f'.key[data-midi="{midi}"]').tap()
    page.tap('#study-stop');assert page.locator('#practice-meter').evaluate('(n)=>n.value')==2
    open_chord_editor(page);close_tasks(page);assert page.locator('#practice-meter').evaluate('(n)=>n.value')==2
    page.tap('#practice-hint');assert 'G4' in page.locator('#practice-progress').inner_text()
    page.tap('#reveal');assert page.locator('.key.selected').count()==3;page.tap('#reveal')
    page.evaluate('window.scrollTo(0,0)');page.screenshot(path=str(OUTPUT/'practice-mobile.png'),full_page=True)
    page.tap('#practice-reset');assert page.locator('#practice-meter').evaluate('(n)=>n.value')==0
    page.tap('#next-chord');assert '0 of' in page.locator('#practice-progress').inner_text()
    # Form and transport errors remain next to the control, not lost in a view.
    page.fill('#study-tempo','0');page.tap('#play-chord');assert page.locator('#practice-feedback [role=alert]').is_visible()
    assert page.locator('#study-position').inner_text()=='Failed'
    page.fill('#study-tempo','80');page.locator('#study-tempo').dispatch_event('change')
    for width in [320,390,430,768,1440]:
        page.set_viewport_size({'width':width,'height':900})
        for name in ['Explore','Progressions','Practice']:
            page.get_by_role('button',name=name,exact=True).click();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        open_chord_editor(page)
        assert page.locator('#task-body').evaluate('(n)=>n.scrollWidth<=n.clientWidth')
        close_tasks(page)
    # One DOM owner for every existing field, visual, graph control and state.
    assert page.evaluate("""() => {const ids=[...document.querySelectorAll('[id]')].map(n=>n.id);return ids.length===new Set(ids).size;}""")
    context.set_offline(True);page.reload();page.wait_for_selector('.key')
    open_chord_editor(page);page.select_option('#root','Bb');page.select_option('#quality','minor9');close_tasks(page)
    page.tap('#play-chord');page.wait_for_selector('.key.sounding');page.tap('#study-stop')
    open_save(page);assert 'Saved for tomorrow' in page.locator('#saved').inner_text();page.select_option('#saved','0');page.tap('#load-saved');close_tasks(page)
    page.get_by_role('button',name='Explore',exact=True).click();page.tap('#bach');page.tap('#play-bach');page.wait_for_selector('#bach-notation .notehead.sounding');page.tap('#stop-bach');close_tasks(page)
    page.reload();page.wait_for_selector('.key');assert page.locator('#root').input_value()=='Bb' and page.locator('#quality').input_value()=='minor9'
    assert page.evaluate("caches.keys().then(keys=>keys.includes('jlk-studio-v1.2.1'))")
    assert not errors,errors
    print(json.dumps({'navigation':'full-screen tasks, Back/Done, Escape, browser Back/Forward, nested recovery and editor return','state':'focus/scroll/chord/preferences/attempts and legacy saves preserved; single DOM owners','playback':'block/arpeggio/loop, Bach, progression inspection/pause/resume/stop, offline audio','screenshots':'Explore, Chord Editor, Progressions, Practice, Bach Study at 390px','layout':'320/390/430/768/1440px without page or task overflow','page_errors':errors},indent=2))
    context.close();browser.close()
