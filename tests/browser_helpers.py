"""Drive the visible v1.2 navigation/disclosures in the existing regression suites."""
def open_chord_editor(page):
    page.locator('#chord-editor').evaluate('(node)=>node.open=true')
def open_sound(page):
    if not page.locator('#sound-settings').is_visible(): page.click('#sound-settings-toggle')
def open_settings(page):
    page.locator('#progression-settings').evaluate('(node)=>node.open=true')
def open_save(page):
    if not page.locator('#save-panel').is_visible(): page.click('#open-save')
def edit_sequence(page):
    if page.locator('#toggle-edit').get_attribute('aria-expanded')!='true': page.click('#toggle-edit')
