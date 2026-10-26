import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_helpers import close_tasks,open_chord_editor,open_save
OUT=Path(__file__).resolve().parents[1]/'docs/screenshots/v1.3-a';OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);c=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(os.environ.get('JLK_BASE_URL','http://127.0.0.1:8000/'));page.wait_for_selector('.key')
 page.keyboard.press('Tab');page.keyboard.press('Enter');assert page.locator('#main').evaluate('(n)=>getComputedStyle(n).outlineStyle')=='none'
 page.get_by_role('button',name='Progressions',exact=True).click();page.click('#browse-open');assert page.locator('.catalogue-card').count()==18
 page.select_option('#browse-mood','jazzy');page.select_option('#browse-difficulty','adventurous');assert page.locator('.catalogue-card').count()==2
 page.locator('.catalogue-card').first.get_by_role('button',name='Hear this progression').click();page.wait_for_function("document.querySelector('#browse-position').textContent.startsWith('Playing')");page.click('#browse-stop');page.screenshot(path=str(OUT/'browse-mobile.png'),full_page=True)
 page.locator('.catalogue-card').first.get_by_role('button',name='Play along').click();page.wait_for_function("!document.querySelector('#task-view').open");page.wait_for_function("document.querySelector('#position').textContent.startsWith('Playing')");page.click('#sequence-stop')
 open_chord_editor(page);page.select_option('#root','Db');page.click('#add-chord');close_tasks(page);page.click('#browse-open');page.locator('.catalogue-card').first.get_by_role('button',name='Play along').click();page.wait_for_function("!document.querySelector('#task-view').open");page.click('#sequence-stop');open_save(page);assert not page.locator('#restore-draft').is_disabled();page.click('#restore-draft');assert 'D♭' in page.locator('.chord-select').last.inner_text();assert page.locator('#load-saved').is_disabled();close_tasks(page)
 page.get_by_role('button',name='Explore',exact=True).click();page.click('#bach');assert page.locator('#study-picker option').count()==4
 for study,bars in [('shape',1),('feeling',2),('hands',4),('bach',4)]:
  page.select_option('#study-picker',study);assert page.locator('#bach-notation svg').count()==bars;page.click('#play-bach');page.wait_for_selector('#bach-notation .score-sounding');page.click('#stop-bach')
 page.screenshot(path=str(OUT/'guided-studies-mobile.png'));page.click('#next-study');assert page.locator('#study-picker').input_value()=='shape';close_tasks(page)
 page.wait_for_function('!!navigator.serviceWorker.controller');c.set_offline(True);page.reload();page.wait_for_selector('.key');page.get_by_role('button',name='Progressions',exact=True).click();page.click('#browse-open');assert page.locator('.catalogue-card').count()==18
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert not errors,errors;print(json.dumps({'discovery':18,'studies':4,'drafts':'restored','offline':'passed','errors':errors}));b.close()
