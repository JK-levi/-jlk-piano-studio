"""PR #18 review: metadata editing branches and import/history agreement."""
import json,os,unittest
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE=os.environ.get('JLK_BASE_URL','http://127.0.0.1:8003/')
OUT=Path(os.environ.get('JLK_REVIEW_OUTPUT','/tmp/jlk-pr18-review'));OUT.mkdir(parents=True,exist_ok=True)
DRAFT='jlk-studio-v1-composition-draft-v1'
LESSON={'schemaVersion':1,'id':'weekly-review-import','date':'2026-11-15','title':'A quiet new idea','source':{'description':'Personal review fixture','completeness':'complete'},'originalText':'LH: D♭ + A♭ | RH: F + C','sections':[{'id':'shape','title':'My shape','instructions':'Play gently.','rows':[{'lh':['D♭','A♭'],'rh':['F','C']}]}]}
class ReviewJourneys(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.runtime=sync_playwright().start();cls.browser=cls.runtime.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 @classmethod
 def tearDownClass(cls):cls.browser.close();cls.runtime.stop()
 def page(self):
  context=self.browser.new_context(viewport={'width':960,'height':1280},has_touch=True,is_mobile=True);self.addCleanup(context.close)
  page=context.new_page();page.set_default_timeout(10000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)));self.addCleanup(lambda:self.assertEqual(errors,[]));page.goto(BASE);page.wait_for_selector('.record-label');return page
 def draft(self,p):return p.evaluate('(key)=>JSON.parse(localStorage.getItem(key))',DRAFT)
 def delete_undo(self,p):
  p.click('[data-go=create]');p.wait_for_selector('#composition-content',state='visible');p.click('#composition-insert-note');p.locator('#composition-score [data-score-event]').first.click();p.click('#composition-delete-event');p.click('#composition-undo');self.assertTrue(p.locator('#composition-redo').is_enabled())
 def test_metadata_after_undo_starts_new_branch(self):
  for field,value in [('title','Renamed after Undo'),('tempo',112),('key','Dm'),('metronome',True)]:
   with self.subTest(field=field):
    p=self.page();self.delete_undo(p)
    if field=='title':
     p.fill('#composition-title',value) # input is accepted before change/blur
     self.assertEqual(p.evaluate('document.activeElement.id'),'composition-title')
    else:
     p.click('[data-composer-tab=settings]')
     if field=='tempo':p.fill('#composition-tempo',str(value));p.locator('#composition-tempo').dispatch_event('change')
     elif field=='key':p.select_option('#composition-key',value=value)
     else:p.check('#composition-metronome')
    disabled=p.locator('#composition-redo').is_disabled()
    if field!='title':p.click('[data-composer-tab=write]')
    if disabled:p.locator('#composition-redo').dispatch_event('click') # handler also respects the emptied branch
    else:p.click('#composition-redo') # reproduces the destructive reviewed behavior
    result={'field':field,'redo_disabled':disabled,'persisted':self.draft(p).get(field)};print(result,flush=True)
    self.assertTrue(disabled,result);self.assertEqual(self.draft(p)[field],value);self.assertEqual(len(self.draft(p)['measures'][0]['right']),1)
    p.reload();p.wait_for_selector('#composition-content',state='visible');self.assertEqual(self.draft(p)[field],value)
    if field!='title':p.click('[data-composer-tab=settings]')
    self.assertEqual(p.locator('#composition-'+field).is_checked() if field=='metronome' else p.locator('#composition-'+field).input_value(),value if field=='metronome' else str(value))
    p.screenshot(path=str(OUT/f'after-undo-{field}.png'))
 def test_redo_survives_non_edits(self):
  p=self.page();self.delete_undo(p);before=self.draft(p)
  p.locator('#composition-score [data-score-event]').first.click();self.assertTrue(p.locator('#composition-redo').is_enabled())
  p.click('[data-composer-tab=settings]');p.locator('#composition-tempo').dispatch_event('change');self.assertTrue(p.locator('#composition-redo').is_enabled())
  p.click('[data-composer-tab=suggestions]');p.locator('#composition-note-suggestions button').first.click();self.assertEqual(self.draft(p),before);self.assertTrue(p.locator('#composition-redo').is_enabled())
  # Save calls metadata() without changing it; it must not invalidate Redo.
  p.click('#composition-save');self.assertTrue(p.locator('#composition-redo').is_enabled());p.click('#composition-redo');self.assertEqual(self.draft(p)['measures'][0]['right'],[])
  p.click('#composition-undo');self.assertEqual(self.draft(p),before)
 def import_form(self,p):
  p.click('[data-action=archive]');p.wait_for_selector('#weekly-search');p.locator('.weekly-extra>summary').click();p.click('[data-action=import]');p.wait_for_selector('#weekly-import-text')
 def test_successful_import_refresh_and_one_back(self):
  for back in ['app','browser']:
   with self.subTest(back=back):
    p=self.page();self.import_form(p);p.fill('#weekly-import-text',json.dumps(LESSON));p.click('[data-action=validate]');p.click('[data-action=save-import]');p.wait_for_selector('#weekly-search')
    self.assertIn('Lesson imported',p.locator('#weekly-status').inner_text());self.assertEqual(p.locator('[data-lesson="weekly-review-import"]').count(),1)
    p.reload();p.wait_for_function("!!document.querySelector('#weekly-home').dataset.screen");self.assertEqual(p.locator('#weekly-home').get_attribute('data-screen'),'archive')
    self.assertEqual(p.locator('[data-lesson="weekly-review-import"]').count(),1)
    if back=='app':p.click('[data-action=back]')
    else:p.go_back()
    p.wait_for_selector('.record-label');self.assertEqual(p.locator('#weekly-home').get_attribute('data-screen'),'home')
 def test_import_failures_keep_form_and_unfinished_back(self):
  p=self.page();self.import_form(p);p.fill('#weekly-import-text','{broken');p.click('[data-action=validate]');self.assertIn('Invalid JSON',p.locator('#weekly-status').inner_text());self.assertEqual(p.locator('#weekly-import-text').input_value(),'{broken')
  p.fill('#weekly-import-text',json.dumps(LESSON));p.click('[data-action=validate]')
  p.evaluate("() => {const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='jlk-weekly-content-v1')throw Error('storage fixture');return set.call(this,k,v)};}")
  p.click('[data-action=save-import]');self.assertIn('Could not save',p.locator('#weekly-status').inner_text());self.assertEqual(p.locator('#weekly-home').get_attribute('data-screen'),'import');self.assertEqual(json.loads(p.locator('#weekly-import-text').input_value()),LESSON)
  self.assertIsNone(p.evaluate("localStorage.getItem('jlk-weekly-content-v1')"));p.click('[data-action=back]');p.wait_for_selector('#weekly-search');p.click('[data-action=back]');p.wait_for_selector('.record-label')
if __name__=='__main__':unittest.main()
