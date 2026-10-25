from browser_helpers import open_chord_editor, open_sound, open_settings, open_save, edit_sequence, close_tasks, inspect_progression
"""Full default-progression graph/transport and scoped-feedback regression test."""
import json
import math
import os
import tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright
PROBE = """
window.__contexts=[];window.__events=[];window.__resumes=0;window.__peaks={};window.__visuals=[];
const Native=window.AudioContext;
window.AudioContext=class extends Native {
  constructor(...args){super(...args);window.__contexts.push(this);}
  get state(){return this.simulatedState||super.state;}
  resume(){window.__resumes++;if(this.deferResume)return new Promise(resolve=>this.releaseResume=()=>{this.deferResume=false;this.simulatedState=null;super.resume().then(resolve);});if(this.rejectResume)return Promise.reject(new Error('Simulated resume denial'));this.simulatedState=null;return super.resume();}
  createDynamicsCompressor(){const node=super.createDynamicsCompressor();this.limiter=node;return node;}
  createOscillator(){const osc=super.createOscillator(),start=osc.start.bind(osc);osc.start=at=>{window.__events.push({frequency:osc.frequency.value,at});return start(at);};return osc;}
};
const nativeSet=Storage.prototype.setItem;
Storage.prototype.setItem=function(key,value){if(window.__denyStorage&&key.endsWith('progressions'))throw new Error('Storage blocked');return nativeSet.call(this,key,value);};
"""
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox','--autoplay-policy=user-gesture-required'])
    context=browser.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True)
    context.add_init_script(PROBE)
    page=context.new_page();errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto(os.environ.get('JLK_BASE_URL','http://127.0.0.1:8000/'))
    page.get_by_role('button',name='Progressions',exact=True).tap()
    assert page.locator('.chord-select').count()==4
    assert page.evaluate('__contexts.length')==0
    page.fill('#tempo','180');page.locator('#tempo').dispatch_event('change')
    page.tap('#sequence-play')
    page.wait_for_function("document.querySelector('#position').dataset.state==='Playing'")
    # Capture the actual post-compressor signal, high-passed to approximate a
    # small speaker's bass attenuation. This verifies signal, not audibility.
    page.evaluate("""() => {
      const c=__contexts.at(-1),filter=c.createBiquadFilter(),analyser=c.createAnalyser();
      window.__signalAnalyser=analyser;filter.type='highpass';filter.frequency.value=300;c.limiter.connect(filter);filter.connect(analyser);
      const data=new Float32Array(analyser.fftSize);
      function sample(){
        analyser.getFloatTimeDomainData(data);let peak=0;for(const n of data)peak=Math.max(peak,Math.abs(n));
        const rows=[...document.querySelectorAll('#progression li')],index=rows.findIndex(n=>n.classList.contains('sounding'));
        if(index>=0){__peaks[index]=Math.max(__peaks[index]||0,peak);if(!__visuals.includes(index))__visuals.push(index);}
        requestAnimationFrame(sample);
      }sample();
    }""")
    page.wait_for_function("document.querySelector('#position').textContent==='Complete'",timeout=12000)
    events=page.evaluate('__events');assert len(events)==48,events
    fundamentals=events[::4]
    expected=[48,52,55,57,60,64,53,57,60,55,59,62]
    for event,midi in zip(fundamentals,expected): assert math.isclose(event['frequency'],440*2**((midi-69)/12),rel_tol=1e-6)
    assert all(abs((fundamentals[i*3]['at']-fundamentals[0]['at'])-i*4/3)<.05 for i in range(4))
    assert page.evaluate('__visuals')==[0,1,2,3]
    peaks=page.evaluate('__peaks');assert all(peaks[str(i)]>.0001 for i in range(4)),peaks
    assert page.locator('.sounding').count()==0
    initial_resumes=page.evaluate('__resumes');assert initial_resumes<=1
    # Starting a known-running engine must not resume it or lose a tap request.
    page.tap('#sequence-play');page.wait_for_selector('#progression li.sounding')
    assert page.evaluate('__resumes')==initial_resumes
    page.wait_for_function("document.querySelector('#position').textContent.includes('Chord 2 of 4')")
    page.tap('#sequence-pause');assert page.locator('#position').inner_text().startswith('Paused')
    before=page.evaluate('__events.length');page.wait_for_timeout(250);assert page.evaluate('__events.length')==before
    page.tap('#sequence-play');page.wait_for_function(f'__events.length>{before}')
    assert math.isclose(page.evaluate(f'__events[{before}].frequency'),220,rel_tol=1e-6)
    page.tap('#sequence-stop');assert page.locator('#position').inner_text()=='Stopped'
    assert page.locator('.sounding').count()==0
    before=page.evaluate('__events.length');page.wait_for_timeout(250);assert page.evaluate('__events.length')==before
    # Broken pattern, loop, tempo and metronome remain available.
    open_settings(page)
    page.tap('#clear-progression');open_chord_editor(page);page.tap('#add-chord');open_settings(page);page.select_option('#pattern','broken');page.check('#metronome');close_tasks(page);page.check('#sequence-loop')
    page.tap('#sequence-play');page.wait_for_timeout(1700)
    assert 'Loop' in page.locator('#position').inner_text()
    page.tap('#sequence-stop');page.uncheck('#sequence-loop')
    # A context interruption fails inline and is not relabeled Stopped by the
    # subscriber, footer, a recovery operation, or unrelated success feedback.
    page.tap('#sequence-play');inspect_progression(page);page.wait_for_selector('.key.sounding')
    page.evaluate("() => {const c=__contexts.at(-1);c.simulatedState='interrupted';c.onstatechange();}")
    assert page.locator('#position').inner_text()=='Failed'
    error=page.locator('#sequence-feedback [role=alert]');assert error.is_visible()
    assert 'Recover audio' in error.inner_text()
    page.tap('#sequence-stop');assert error.is_visible()
    open_sound(page)
    page.tap('#recover-audio');close_tasks(page);inspect_progression(page);assert error.is_visible()
    page.tap('#sequence-play');inspect_progression(page);page.wait_for_selector('.key.sounding')
    assert page.locator('#sequence-feedback [role=alert]').count()==0
    page.tap('#sequence-stop')
    # Suspended context with a deferred resume: Stop must invalidate the tap.
    page.evaluate("() => {const c=__contexts.at(-1);c.simulatedState='suspended';c.deferResume=true;}")
    before=page.evaluate('__events.length');page.tap('#sequence-play')
    assert page.locator('#position').inner_text()=='Starting'
    page.tap('#sequence-stop');page.evaluate('__contexts.at(-1).releaseResume()');page.wait_for_timeout(150)
    assert page.evaluate('__events.length')==before
    assert page.locator('#position').inner_text()=='Stopped'
    # Rejected resume shows a persistent alert at this transport, not only the
    # distant engine panel. It is readable at iPhone width and keyboard-focusable.
    page.evaluate("() => {const c=__contexts.at(-1);c.simulatedState='suspended';c.rejectResume=true;}")
    page.tap('#sequence-play');page.wait_for_selector('#sequence-feedback [role=alert]')
    assert page.locator('#position').inner_text()=='Failed'
    page.locator('#sequence-feedback').scroll_into_view_if_needed()
    page.screenshot(path=str(Path(tempfile.gettempdir())/'jlk-progression-error.png'))
    assert page.locator('#sequence-feedback button',has_text='Dismiss').is_visible()
    page.wait_for_timeout(100);assert page.locator('#sequence-feedback [role=alert]').count()==1
    page.locator('#sequence-feedback button',has_text='Dismiss').tap();assert page.locator('#sequence-feedback [role=alert]').count()==0
    # Invalid/missing input is not silently clamped or defaulted.
    close_tasks(page)
    for value in ['', '39', '181', '80.5']:
        page.fill('#tempo',value);page.tap('#sequence-play')
        assert 'Invalid tempo' in page.locator('#sequence-feedback').inner_text()
        assert page.locator('#tempo').get_attribute('aria-invalid')=='true'
    page.fill('#tempo','80');page.locator('#tempo').dispatch_event('change')
    assert page.locator('#sequence-feedback [role=alert]').count()==0
    open_settings(page)
    page.tap('#clear-progression');close_tasks(page);assert page.locator('#sequence-play').is_disabled()
    assert page.locator('#sequence-empty').is_visible()
    assert 'No chords loaded' in page.locator('#sequence-empty').inner_text()
    open_save(page)
    page.fill('#save-name','');page.tap('#save-progression')
    assert page.locator('#save-feedback [role=alert]').is_visible()
    assert page.locator('#save-name').get_attribute('aria-invalid')=='true'
    page.fill('#save-name','My practice');page.tap('#save-progression')
    assert 'No chords to save' in page.locator('#save-feedback').inner_text()
    page.tap('#load-preset');page.evaluate('window.__denyStorage=true');page.tap('#save-progression')
    assert 'Unable to save' in page.locator('#save-feedback [role=alert]').inner_text()
    page.evaluate('window.__denyStorage=false');page.tap('#save-progression')
    assert page.locator('#save-feedback [role=alert]').count()==0
    assert 'saved on this device' in page.locator('#save-feedback').inner_text()
    # Reuse the same severity/message semantics beside study and practice actions.
    close_tasks(page)
    page.get_by_role('button',name='Explore',exact=True).tap()
    page.fill('#study-tempo','0');page.tap('#play-arpeggio')
    assert 'Invalid tempo' in page.locator('#study-feedback [role=alert]').inner_text()
    page.get_by_role('button',name='Practice',exact=True).tap()
    page.tap('#play-chord');assert page.locator('#practice-feedback [role=alert]').is_visible()
    for width in [320,390]:
        page.set_viewport_size({'width':width,'height':844})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        for region in page.locator('.feedback-message').all():
            if region.is_visible(): assert region.evaluate('(n)=>n.scrollWidth<=n.clientWidth')
    assert not errors,errors
    print(json.dumps({'full_sequence':'C3–Am3–F3–G3; 48 oscillator starts, exact pitches and four-beat onsets','post_compressor_highpass_peaks':peaks,'visual_advancement':[0,1,2,3],'transport':'pause, resume, stop, loop, broken pattern, metronome, deferred/rejected resume and interruption','feedback':'persistent scoped errors, empty state, save validation, 320/390px layout','page_errors':errors},indent=2))
    context.close();browser.close()
