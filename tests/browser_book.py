"""Compare every rendered book page to the audited source snapshot."""
import json,os,subprocess,tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_helpers import close_tasks
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'docs/screenshots/keyboard-book';OUT.mkdir(parents=True,exist_ok=True)
snapshot=json.loads((ROOT/'data/keyboard-book-october-13.json').read_text());BASE=os.environ.get('JLK_BASE_URL','http://127.0.0.1:8000/')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);c=b.new_context(viewport={'width':393,'height':852},has_touch=True,is_mobile=True);c.add_init_script("window.__bookAudioContexts=0;const Native=window.AudioContext;window.AudioContext=class extends Native{constructor(...args){super(...args);__bookAudioContexts++;}};");page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(BASE);page.wait_for_selector('.key')
 page.get_by_role('button',name='Progressions',exact=True).tap();page.evaluate('localStorage.setItem("jlk-studio-v1-compositions-v1",JSON.stringify([{version:1,id:"keep",title:"My saved piece",tempo:80,key:"C",timeSignature:[4,4],measures:[{right:[],left:[]}]}]))');before=page.evaluate('JSON.stringify(localStorage)');page.tap('#book-open');page.wait_for_selector('#book-index',state='visible');assert page.locator('#book-sections button').count()==44;assert '48 screens' in page.locator('#book-numbering').inner_text()
 page.select_option('#book-section','Mood Loops');page.fill('#book-search','late-night');assert page.locator('#book-sections button:visible').count()==1;page.fill('#book-search','missing-reference-title');assert 'No matches' in page.locator('#book-matches').inner_text();page.fill('#book-search','');page.select_option('#book-section','');page.screenshot(path=str(OUT/'contents-iphone.png'));counts={'rows':0,'blocks':0,'techniques':0};number=4
 for key in ['EASY_PAGES','TECHNIQUE_PAGES','MORE_PROGRESSIONS','MOOD_PAGES','SONG_PAGES']:
  if key=='SONG_PAGES':number+=1
  for source in snapshot['collections'][key]:
   page.locator(f'#book-sections button[data-page="{number}"]').tap();assert page.locator('#book-page h3').inner_text()==source['title'];assert f'Book page {number} ' in page.locator('#book-page-label').inner_text()
   if key=='TECHNIQUE_PAGES':
    assert page.locator('#book-page>ul>li').all_text_contents()==source['bullets'];assert page.locator('#book-page>ol>li').all_text_contents()==source['trySteps'];counts['techniques']+=1
    if source['title'] in ['BLOCK CHORDS vs. BROKEN CHORDS','INVERSIONS & SMOOTH VOICE LEADING','PEDALING TECHNIQUES']:assert page.locator('.book-technique-note').is_visible()
    if source['title']=='PEDALING TECHNIQUES':assert 'fraction of a second' in page.locator('.book-technique-note').inner_text();page.screenshot(path=str(OUT/'technique-iphone.png'))
   else:
    tables=page.locator('#book-page table');assert tables.count()==len(source['loops']);counts['blocks']+=tables.count()
    for index,(name,rows) in enumerate(source['loops']):
     actual=tables.nth(index).locator('tbody tr').evaluate_all('(rows)=>rows.map(r=>[...r.children].map(c=>c.textContent))');assert actual==[[chord,lh,rh]for chord,rh,lh in rows],(source['title'],actual);counts['rows']+=len(rows)
    assert source['patch'] in page.locator('#book-page').inner_text()
    if key=='SONG_PAGES':assert 'practice variants' in page.locator('.book-note').inner_text() and 'not verified' in page.locator('.book-note').inner_text()
    if source['title'] not in ['CIRCLE-OF-FIFTHS SEQUENCE','SORDID AFFAIR']:assert source['footer'] in page.locator('#book-page').inner_text()
    else:
     assert page.locator('.book-correction').is_visible();page.locator('.book-original summary').tap();assert source['footer'] in page.locator('.book-original').inner_text()
   if source['title']=='LATE-NIGHT MELT':page.screenshot(path=str(OUT/'mood-page-iphone.png'))
   if source['title']=='VIVA LA VIDA':page.screenshot(path=str(OUT/'viva-la-vida-iphone.png'))
   if source['title']=='STILL D.R.E. CONNECTION':page.screenshot(path=str(OUT/'song-page-iphone.png'));assert "Eb+Eb'" in page.locator('#book-page').inner_text()
   page.tap('#book-contents');number+=1
 assert counts=={'rows':456,'blocks':116,'techniques':6}
 # Source page references, sequential navigation and four front/back pages.
 page.locator('#book-sections button[data-page="9"]').tap();page.locator('#book-page .book-reference').first.tap();assert 'Book page 28 ' in page.locator('#book-page-label').inner_text();page.tap('#book-previous');assert 'Book page 27 ' in page.locator('#book-page-label').inner_text();page.tap('#book-next');page.tap('#book-contents')
 for title,number in [('Keyboard Progression Book',1),('How to use it',2),('Favorite Song Vibes',37),('Keep playing',49)]:
  page.locator('#book-front').get_by_role('button',name=title,exact=True).tap();assert f'Book page {number} ' in page.locator('#book-page-label').inner_text();assert page.locator('#book-page').inner_text().strip();page.tap('#book-contents')
 page.locator('#book-sections button[data-page="16"]').tap();assert 'ascending fifths' in page.locator('.book-correction').inner_text()
 # A horizontal content swipe turns a page; a vertical scroll gesture does not.
 touch=c.new_cdp_session(page)
 def swipe(x1,y1,x2,y2):
  touch.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x1,'y':y1}]})
  touch.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x2,'y':y2}]})
  touch.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
 swipe(200,300,100,305);assert 'Book page 17 ' in page.locator('#book-page-label').inner_text()
 swipe(200,300,190,100);assert 'Book page 17 ' in page.locator('#book-page-label').inner_text();page.tap('#book-previous')
 # Print includes source notes/footer and excludes navigation/controls.
 page.evaluate('() => {window.__prints=0;window.print=()=>window.__prints++;}');page.tap('#book-print');assert page.evaluate('__prints')==1
 pdf=Path(tempfile.gettempdir())/'jlk-book-print.pdf';page.pdf(path=str(pdf),format='A4',print_background=False);text=subprocess.check_output(['pdftotext',str(pdf),'-'],text=True);assert 'CIRCLE-OF-FIFTHS' in text and 'ascending fifths' in text and 'descending in fifths' in text;assert 'Print this page' not in text and 'Settings' not in text
 for width,height in [(320,844),(375,812),(390,844),(393,852),(430,932),(844,390),(1440,900)]:
  page.set_viewport_size({'width':width,'height':height})
  for scale in [1,2]:
   page.evaluate('(s)=>document.documentElement.style.fontSize=(s*15)+"px"',scale)
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,scale)
   assert page.locator('#task-body').evaluate('(n)=>n.scrollWidth<=n.clientWidth'),(width,scale)
 page.evaluate('document.documentElement.style.fontSize="15px"');page.set_viewport_size({'width':393,'height':852})
 close_tasks(page);assert page.locator('#studio-panel').is_visible();assert page.evaluate('JSON.stringify(localStorage)')!=before
 # Only the new reading-position preference was added by reading the book.
 assert page.evaluate('(keys)=>Object.fromEntries(keys.map(k=>[k,localStorage.getItem(k)]))',list(json.loads(before)))==json.loads(before)
 page.tap('#book-open');page.wait_for_selector('#book-index',state='visible');page.tap('#book-continue');assert 'Book page 16 ' in page.locator('#book-page-label').inner_text();page.go_back();page.wait_for_function("!document.querySelector('#task-view').open");page.go_forward();page.wait_for_selector('#book-index',state='visible');close_tasks(page)
 # Lightweight discovery links use the same reader, rather than duplicate content.
 page.tap('#browse-open');page.locator('#browse-panel .book-discovery summary').tap()
 for section,count in [('Easy Chords',3),('More Progressions',4),('Mood Loops',20),('Song Vibes',11)]:
  page.locator(f'#browse-panel [data-book-section="{section}"]').tap();page.wait_for_selector('#book-index',state='visible');assert page.locator('#book-section').input_value()==section;assert page.locator('#book-sections button:visible').count()==count;page.tap('#task-back');page.wait_for_function("document.body.dataset.task==='browse-panel'")
 close_tasks(page);page.get_by_role('button',name='Explore',exact=True).tap();page.tap('#bach');page.tap('#book-techniques');page.wait_for_selector('#book-index',state='visible');assert page.locator('#book-section').input_value()=='Techniques';assert page.locator('#book-sections button:visible').count()==6;page.tap('#task-back');page.wait_for_function("document.body.dataset.task==='bach-panel'");close_tasks(page)
 assert page.evaluate('__bookAudioContexts')==0
 page.wait_for_function('!!navigator.serviceWorker.controller');c.set_offline(True);page.reload();page.wait_for_selector('.key');page.get_by_role('button',name='Progressions',exact=True).tap();page.tap('#book-open');page.wait_for_selector('#book-index',state='visible');page.tap('#book-continue');assert 'Book page 16 ' in page.locator('#book-page-label').inner_text();assert page.locator('#book-page tbody tr').count()==12;assert not errors,errors;c.close()
 # Download failures are visible without discarding saved content.
 c=b.new_context(service_workers='block');q=c.new_page();q.route('**/data/keyboard-book-october-13.json',lambda route:route.abort());q.goto(BASE);q.wait_for_selector('.key');q.get_by_role('button',name='Progressions',exact=True).click();q.click('#book-open');q.wait_for_selector('#book-feedback [role=alert]');assert 'Your music is unchanged' in q.locator('#book-feedback').inner_text();close_tasks(q);assert q.locator('#studio-panel').is_visible();c.close();b.close()
 print(json.dumps({'content':counts,'source':'all 44 content pages and four front/back pages checked','navigation':'contents, page links, previous/next, Back/Done/Forward and reading-place retention','layout':'phone widths, landscape, desktop and 200% text','print':'actual PDF includes source footer and correction, excludes controls','offline':'book opens from cache with saved reading place','errors':errors},indent=2))
