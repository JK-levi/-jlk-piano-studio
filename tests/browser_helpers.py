"""Drive public task navigation without mutating application state or the DOM."""
def close_tasks(page):
    while page.locator('#task-view').evaluate('(node)=>node.open'):
        before=page.locator('body').get_attribute('data-task')
        page.click('#task-done')
        page.wait_for_function('(before)=>document.body.dataset.task!==before',arg=before)
def task(page):
    return page.locator('body').get_attribute('data-task')
def open_chord_editor(page):
    if task(page)=='chord-editor':return
    if task(page)=='sequence-editor':page.click('#new-progression-chord')
    elif task(page)=='voicing-view':page.click('#voicing-edit')
    else:
        close_tasks(page)
        if page.locator('body').get_attribute('data-experience')=='studio':
            page.click('#toggle-edit');page.click('#new-progression-chord')
        else:page.click('#edit-chord')
    page.wait_for_function("document.body.dataset.task==='chord-editor'")
def open_sound(page):
    if task(page)=='sound-settings':return
    close_tasks(page);studio_destination(page,'settings');page.click('#studio-sound-details')
def open_settings(page):
    if task(page)=='sequence-editor':return
    close_tasks(page)
    if page.locator('body').get_attribute('data-experience')!='studio':studio_destination(page,'studio')
    page.click('#toggle-edit')
def open_save(page):
    if task(page)=='save-panel':return
    close_tasks(page)
    if page.locator('body').get_attribute('data-experience')!='studio':studio_destination(page,'studio')
    page.click('#open-save')

def edit_sequence(page):open_settings(page)
def inspect_progression(page):
    if task(page)=='voicing-view':return
    close_tasks(page);page.click('#view-voicing')

def choose_preset(page,value):
    previous=task(page);close_tasks(page);page.click('#browse-open');page.locator('#browse-panel .library-presets summary').click();page.select_option('#preset',value);page.click('#load-preset');close_tasks(page)
    if previous=='save-panel':open_save(page)
    elif previous=='sequence-editor':open_settings(page)

def wait_for_waiting_worker(page):
    # This Playwright build resolves a Promise returned by wait_for_function
    # even when it resolves false. Poll the live registration synchronously.
    page.evaluate('navigator.serviceWorker.getRegistration().then(r=>{window.__upgradeRegistration=r;})')
    page.wait_for_function('!!window.__upgradeRegistration.waiting')

def wait_for_cache(page,current,previous):
    page.evaluate('''({current,previous})=>new Promise((resolve,reject)=>{
      const deadline=Date.now()+10000;
      async function check(){
        const keys=await caches.keys();
        if(keys.includes(current)&&!keys.includes(previous))return resolve();
        if(Date.now()>deadline)return reject(Error('Cache upgrade did not finish'));
        setTimeout(check,25);
      }
      check().catch(reject);
    })''',{'current':current,'previous':previous})

def studio_destination(page,destination):
    page.click('#studio-menu-open');page.click(f'[data-destination="{destination}"]')

def composer_control(page,id):
    """Reveal a control through the same tabs/disclosures a player uses."""
    settings={'meter','tempo','metronome','print','labels','show-all','clear-piece'}
    pieces={'library','new','open','duplicate','delete','export','import'}
    suggestions={'suggestion-whole','choose-tone','tone','tone-octave','tone-listen','tone-insert','chord-suggestions','note-suggestions'}
    area='settings' if id in settings else 'pieces' if id in pieces else 'suggestions' if id in suggestions else 'write'
    page.click(f'[data-composer-tab="{area}"]')
    if id=='see-score':
        page.locator('#composition-score').scroll_into_view_if_needed();return
    target=page.locator('#composition-'+id)
    for detail in target.locator('xpath=ancestor::details').all():
        if detail.get_attribute('open') is None:detail.locator(':scope > summary').click()
    return target
