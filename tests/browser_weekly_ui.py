"""Visible practice UX, immediate audition, persisted registers and overflow."""
import os,json
from playwright.sync_api import sync_playwright
BASE=os.environ.get('JLK_BASE_URL','http://127.0.0.1:8000/')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 c=b.new_context(viewport={'width':820,'height':1180},is_mobile=True,has_touch=True)
 c.add_init_script('window.__starts=0;const Native=window.AudioContext;window.AudioContext=class extends Native{createOscillator(){const o=super.createOscillator(),s=o.start.bind(o);o.start=(...a)=>{__starts++;return s(...a)};return o}}')
 page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(BASE);page.click('[data-action=archive]')
 cards=page.locator('#weekly-results .weekly-card');assert cards.count()==12
 assert cards.nth(0).bounding_box()['y']==cards.nth(1).bounding_box()['y']
 assert cards.first.bounding_box()['height']<260
 for banned in ['2026','Week 10','Original instructions preserved','See source for duration']:
  assert banned not in page.locator('#weekly-results').inner_text()
 page.click('[data-lesson="weekly-2026-08-30"]');assert page.locator('.weekly-row').count()==4
 text=page.locator('#weekly-home').inner_text()
 for banned in ['Source octaves','practice choices','original voicings','Take your time','complete original','source-validation']:assert banned not in text
 assert page.locator('.weekly-row').first.bounding_box()['y']<page.locator('.weekly-instructions').bounding_box()['y']
 page.click('[data-hear="0"]');page.wait_for_function('__starts>0');page.click('[data-action=stop]')
 assert page.locator('#weekly-keys .selected').count()==5
 page.locator('.weekly-play-settings summary').click();page.select_option('[data-register=lh]','2');page.select_option('[data-register=rh]','5')
 assert page.evaluate('JSON.parse(localStorage.getItem("jlk-weekly-registers-v1"))')=={'lh':2,'rh':5}
 page.reload();page.click('[data-action=archive]');page.click('[data-lesson="weekly-2026-08-30"]')
 page.locator('.weekly-play-settings summary').click();assert page.locator('[data-register=lh]').input_value()=='2';assert page.locator('[data-register=rh]').input_value()=='5'
 page.click('[data-score="0"]');assert page.locator('#weekly-keys .selected').count()==5
 for width,height in [(320,844),(375,812),(390,844),(393,852),(430,932),(768,1024),(820,1180),(1024,768)]:
  page.set_viewport_size({'width':width,'height':height})
  for scale in [1,2]:
   page.evaluate('(s)=>document.documentElement.style.fontSize=(15*s)+"px"',scale)
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,scale)
   assert page.locator('.weekly-row').first.evaluate('(n)=>n.scrollWidth<=n.clientWidth'),(width,scale)
 page.evaluate('document.documentElement.style.fontSize="15px"')
 # Every imported section and its expanded guidance must wrap on phone and tablet.
 for width in [390,820]:
  page.set_viewport_size({'width':width,'height':1180})
  for date in ['2026-07-12','2026-07-19','2026-07-26','2026-08-02','2026-08-30','2026-09-06','2026-10-04','2026-10-11','2026-10-18','2026-10-25','2026-11-01','2026-11-08']:
   page.click('[data-action=archive]');page.click(f'[data-lesson="weekly-{date}"]')
   count=page.locator('#weekly-step option').count()
   for i in range(count):
    page.select_option('#weekly-step',str(i))
    for summary in page.locator('.weekly-instructions details>summary').all():summary.click()
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(date,i,width)
    assert 'https://' not in page.locator('.weekly-instructions').inner_text()
 assert not errors,errors
 b.close()
print('Weekly UI: immediate audio, remembered registers, compact archive and all-section wrapping passed')
