import os
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT=Path('/tmp/jlk-review/studio2-regression');OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for device,w,h in [('iphone',390,844),('ipad',820,1180)]:
  page=b.new_page(viewport={'width':w,'height':h},is_mobile=True,has_touch=True);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.add_init_script('window.__tones=0;const Native=window.AudioContext;window.AudioContext=class extends Native{createOscillator(){const o=super.createOscillator(),start=o.start.bind(o);o.start=(...args)=>{__tones++;return start(...args)};return o}}');page.goto(os.environ.get('JLK_BASE_URL','http://127.0.0.1:8002/'));page.wait_for_selector('.record-label')
  def shot(name):print(device,name,flush=True);page.screenshot(path=str(OUT/f'{device}-{name}.png'),animations='disabled')
  def menu(dest):print('Navigate',dest,flush=True);page.click('#studio-menu-open');page.click(f'[data-destination={dest}]')
  assert abs(page.locator('.record-label').bounding_box()['width']/page.locator('.vinyl').bounding_box()['width']-1/3)<.01;assert page.evaluate('__tones')==0;shot('home');page.click('#studio-menu-open');shot('menu');page.locator('#studio-menu [data-close]').click()
  page.click('.record-label');page.wait_for_selector('#lesson-score svg');shot('score-notes')
  page.select_option('#weekly-step','2');page.click('[data-shape="2"]');assert page.locator('[data-shape="2"]').get_attribute('aria-pressed')=='true'
  assert page.evaluate('__tones')==0;page.click('[data-action=exercise-play]');page.wait_for_selector('.score-sounding');shot('playback');page.click('[data-action=pause]');assert 'Paused' in page.locator('#weekly-status').inner_text();page.click('[data-action=pause]');page.click('[data-action=stop]')
  page.locator('.weekly-play-settings summary').click();page.select_option('#weekly-view','score');assert page.locator('#selected-hands').is_hidden();shot('score-only')
  page.select_option('#weekly-view','notes');assert page.locator('#lesson-score').is_hidden();page.select_option('#weekly-view','score-notes')
  menu('settings');shot('settings');page.locator('#studio-settings [data-close]').click()
  menu('archive');assert page.locator('#weekly-results .weekly-card').count()==18;shot('archive')
  menu('create');page.wait_for_selector('#composition-content',state='visible');page.click('#studio-recover');page.wait_for_function("document.querySelector('#studio-audio-status').textContent==='Audio recovered'");assert page.locator('#composition-content').is_visible()
  page.fill('#composition-title','Studio 2 preserved');page.locator('#composition-title').dispatch_event('change');page.click('#composition-insert-note');page.click('#composition-save')
  menu('home');page.wait_for_selector('.record-label');menu('studio');page.click('#view-voicing');page.click('#detail-next');assert page.locator('#detail-position').inner_text()=='2 of 4';page.click('#task-done');page.wait_for_function('!document.querySelector("#task-view").open');menu('home');page.wait_for_selector('.record-label');page.go_back();page.wait_for_function('document.body.dataset.experience==="studio"');menu('home');page.wait_for_selector('.record-label')
  for width in [320,375,390,430,820,1024]:
   page.set_viewport_size({'width':width,'height':h});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
  page.wait_for_function('!!navigator.serviceWorker.controller');page.context.set_offline(True);page.reload();page.wait_for_selector('.record-label');page.click('.record-label');page.wait_for_selector('#lesson-score svg')
  assert not errors,errors;page.close()
 b.close()
print('Studio 2 browser workflows passed')
