import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'docs/screenshots/weekly';OUT.mkdir(parents=True,exist_ok=True)
BASE=os.environ.get('JLK_BASE_URL','http://127.0.0.1:8000/')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 c=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
 page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(BASE);page.wait_for_selector('[data-lesson]');page.screenshot(path=str(OUT/'home.png'),full_page=True)
 assert page.locator('body').get_attribute('data-experience')=='home'
 page.evaluate("localStorage.setItem('jlk-studio-v1-preservation-sentinel','keep')")
 page.click('[data-lesson="weekly-2026-11-08"]');page.click('[data-action=favorite]')
 page.click('[data-note="0,0"]');assert 'Playing' in page.locator('#weekly-status').inner_text();page.locator('.weekly-play-settings summary').click()
 page.select_option('[data-register=rh]','4');page.select_option('[data-register=lh]','3');page.click('[data-note="0,0"]');page.click('[data-action=stop]')
 page.click('[data-action=next]');assert 'LH: C + G' in page.locator('.weekly-row').first.inner_text();page.click('[data-score="0"]');assert 'undefined' not in page.locator('#weekly-score').inner_text()
 page.screenshot(path=str(OUT/'lesson.png'),full_page=True)
 page.click('[data-action=next]');page.fill('#weekly-tempo','180');page.click('[data-action=rhythm]');page.wait_for_function("document.querySelector('#weekly-beat').textContent.includes('Chord')")
 page.screenshot(path=str(OUT/'rhythm.png'),full_page=True);page.click('[data-action=stop]')
 page.reload();page.wait_for_selector('[data-lesson]');page.click('[data-lesson="weekly-2026-11-08"]');assert page.locator('#weekly-step').input_value()=='2'
 for _ in range(4):page.click('[data-action=next]')
 assert 'Practice complete' in page.locator('#weekly-status').inner_text()
 page.get_by_text('Lesson options & full text',exact=True).click();page.click('[data-action=restart]');page.get_by_text('Lesson options & full text',exact=True).click();assert '1 completed practice' in page.locator('#weekly-home').inner_text()
 page.click('[data-action=archive]');page.screenshot(path=str(OUT/'archive.png'),full_page=True)
 page.fill('#weekly-search','July');assert page.locator('[data-lesson]').count()==0
 page.fill('#weekly-search','2026-07');assert page.locator('[data-lesson]').count()==3
 page.fill('#weekly-search','');page.get_by_text('Manage lessons',exact=True).click();page.click('[data-action=import]');page.screenshot(path=str(OUT/'import.png'),full_page=True)
 source=(ROOT/'data/weekly-november-8.example.json').read_text();page.fill('#weekly-import-text',source);page.click('[data-action=validate]');assert 'Updates this existing ID' in page.locator('#weekly-preview').inner_text();page.click('[data-action=save-import]');assert page.locator('[data-lesson]').count()==12
 assert page.evaluate("JSON.parse(localStorage.getItem('jlk-weekly-progress-v1'))['weekly-2026-11-08'].favorite")
 assert page.evaluate("localStorage.getItem('jlk-studio-v1-preservation-sentinel')")=='keep'
 for width in [320,390,768,1280]:
  page.set_viewport_size({'width':width,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
 page.click('[data-action=home]')
 for dest in ['explore','studio','practice']:
  page.click('[data-go='+dest+']');assert page.locator('body').get_attribute('data-experience')==dest;page.click('[data-mode=home]')
 page.click('[data-go=guided]');assert page.locator('body').get_attribute('data-task')=='bach-panel';page.click('#task-done');page.wait_for_function("document.body.dataset.task==='' ");page.click('[data-mode=home]')
 page.click('[data-go=create]');page.wait_for_selector('#composition-content',state='visible');page.click('#task-done');page.wait_for_function("document.body.dataset.task==='' ")
 page.evaluate('navigator.serviceWorker.ready');page.reload();page.wait_for_selector('[data-lesson]');c.set_offline(True);page.reload();page.wait_for_selector('[data-lesson]');assert page.locator('[data-lesson]').count()==1
 assert not errors,errors;b.close()
print('Weekly browser checks passed')
