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
    close_tasks(page);page.click('#sound-settings-toggle')
def open_settings(page):
    if task(page)=='sequence-editor':return
    close_tasks(page)
    if page.locator('body').get_attribute('data-experience')!='studio':page.get_by_role('button',name='Progressions',exact=True).click()
    page.click('#toggle-edit')
def open_save(page):
    if task(page)=='save-panel':return
    close_tasks(page)
    if page.locator('body').get_attribute('data-experience')!='studio':page.get_by_role('button',name='Progressions',exact=True).click()
    page.click('#open-save')

def edit_sequence(page):open_settings(page)
def inspect_progression(page):
    if task(page)=='voicing-view':return
    close_tasks(page);page.click('#view-voicing')

def choose_preset(page,value):
    previous=task(page);close_tasks(page);page.click('#browse-open');page.locator('#browse-panel .library-presets summary').click();page.select_option('#preset',value);page.click('#load-preset');close_tasks(page)
    if previous=='save-panel':open_save(page)
    elif previous=='sequence-editor':open_settings(page)
