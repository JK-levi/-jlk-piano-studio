import sys,os
from pathlib import Path
from playwright.sync_api import sync_playwright
out=(Path(__file__).resolve().parents[1]/'docs/screenshots/ui-cleanup')/sys.argv[1];out.mkdir(exist_ok=True)
def select_step(page,index):
 if page.locator('#weekly-step').count():page.select_option('#weekly-step',str(index))
 else:page.click(f'[data-section="{index}"]')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for device,w,h in [('iphone',390,844),('ipad',820,1180)]:
  page=b.new_page(viewport={'width':w,'height':h},is_mobile=True,has_touch=True)
  page.goto(os.environ.get('JLK_BASE_URL','http://127.0.0.1:8000/'));page.wait_for_selector('[data-lesson]');page.screenshot(animations="disabled",path=str(out/f'{device}-header.png'))
  page.click('[data-action=archive]');page.screenshot(animations="disabled",path=str(out/f'{device}-archive.png'))
  page.click('[data-lesson="weekly-2026-08-30"]');select_step(page,2);page.screenshot(animations="disabled",path=str(out/f'{device}-chords.png'))
  page.click('[data-action=archive]');page.click('[data-lesson="weekly-2026-11-08"]');select_step(page,2);page.screenshot(animations="disabled",path=str(out/f'{device}-rhythm.png'))
  page.click('[data-mode=studio]');page.click('#view-voicing');page.locator('#detail-chords button').nth(1).click();page.screenshot(animations="disabled",path=str(out/f'{device}-progression.png'));page.click('#task-done')
  page.click('#composer-open');page.wait_for_selector('#composition-content',state='visible');page.screenshot(animations="disabled",path=str(out/f'{device}-composer.png'));page.close()
 b.close()
