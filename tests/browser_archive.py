"""Recovered source accuracy, migration and small-screen practice."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/screenshots/weekly';OUT.mkdir(exist_ok=True,parents=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 c=b.new_context(viewport={'width':375,'height':812},is_mobile=True,has_touch=True)
 page=c.new_page();page.goto(os.environ.get('JLK_BASE_URL','http://127.0.0.1:8000/'));page.wait_for_selector('[data-lesson]')
 old=json.loads((ROOT/'data/weekly-sources/previous-bundled.json').read_text())
 progress={'weekly-2026-07-12':{'index':0,'completed':['source'],'runs':[{'at':'2026-07-13','sections':['source']}],'favorite':True}}
 page.evaluate('([old,progress])=>{localStorage.setItem("jlk-weekly-content-v1",JSON.stringify(old));localStorage.setItem("jlk-weekly-progress-v1",JSON.stringify(progress));}',[old,progress])
 page.reload();page.wait_for_selector('[data-lesson="weekly-2026-11-08"]');page.click('[data-action=archive]')
 assert page.locator('[data-lesson]').count()==12
 page.click('[data-lesson="weekly-2026-07-12"]');assert page.locator('[data-action=favorite]').get_attribute('aria-pressed')=='true'
 assert page.evaluate('JSON.parse(localStorage.getItem("jlk-weekly-progress-v1"))')==progress
 page.select_option('#weekly-step','2');assert 'LH: B♭ + C + F' in page.locator('.weekly-row').first.inner_text()
 page.click('[data-hear="0"]');assert 'Playing' in page.locator('#weekly-status').inner_text();page.locator('.weekly-play-settings summary').click()
 page.select_option('[data-register=lh]','3');page.click('[data-hear="0"]');assert page.locator('#weekly-keys .selected').count()==3;page.click('[data-action=stop]')
 page.click('[data-action=archive]');page.click('[data-lesson="weekly-2026-08-30"]');page.select_option('#weekly-step','2')
 assert 'RH: D♭ + F + A♭' in page.locator('.weekly-row').first.inner_text()
 page.locator('.weekly-play-settings summary').click();page.select_option('[data-register=rh]','4');page.click('[data-score="0"]')
 for width in [320,375,390,393,430,844]:
  page.set_viewport_size({'width':width,'height':812});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.set_viewport_size({'width':375,'height':812});page.locator('#weekly-keys').scroll_into_view_if_needed();page.screenshot(path=str(OUT/'recovered-keyboard-iphone.png'));page.screenshot(path=str(OUT/'recovered-august.png'),full_page=True)
 page.get_by_text('Keyboard cheat sheet',exact=True).click();assert 'LH: D♭ + A♭ | RH: D♭ + F + A♭' in page.locator('#weekly-home').inner_text()
 page.get_by_text('Lesson options & full text',exact=True).click();page.get_by_text('Full original lesson & source',exact=True).click();assert page.locator('.weekly-original').inner_text()==(ROOT/'data/weekly-sources/originals/weekly-2026-08-30.txt').read_text()
 b.close()
print('Recovered archive browser checks passed')
