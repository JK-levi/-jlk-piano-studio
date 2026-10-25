const LABELS = { error: ['!', 'Error'], warning: ['!', 'Warning'], success: ['✓', 'Success'], info: ['i', 'Information'] };
// Messages are scoped to the control group that owns them. Errors never expire,
// and unrelated status/success messages cannot overwrite a different error.
export class Feedback {
  constructor(root = document) { this.root = root; this.entries = new Map(); }
  show(scope, { id = 'notice', kind = 'info', text, field, action, expire = kind === 'success' }) {
    const region = this.root.getElementById(`${scope}-feedback`);
    if (!region) throw new Error(`Missing feedback region: ${scope}`);
    this.clear(scope, id);
    const doc = region.ownerDocument, item = doc.createElement('div');
    item.id = `${scope}-feedback-${id}`; item.className = `feedback-message feedback-${kind}`;
    item.setAttribute('role', kind === 'error' ? 'alert' : 'status');
    item.setAttribute('aria-atomic', 'true');
    const icon = doc.createElement('span'); icon.className = 'feedback-icon'; icon.setAttribute('aria-hidden', 'true'); icon.textContent = LABELS[kind][0];
    const copy = doc.createElement('p'); copy.textContent = `${LABELS[kind][1]}: ${text}`;
    item.append(icon, copy);
    if(action){const button=doc.createElement('button');button.textContent=action.label;button.addEventListener('click',action.run);item.append(button);}
    if (kind === 'error') {
      const dismiss = doc.createElement('button'); dismiss.textContent = 'Dismiss';
      dismiss.setAttribute('aria-label', `Dismiss error: ${text}`);
      dismiss.addEventListener('click', () => this.clear(scope, id)); item.append(dismiss);
    }
    region.append(item);
    region.dispatchEvent(new CustomEvent('studio-feedback',{bubbles:true,detail:{region,kind}}));
    const input = field && this.root.getElementById(field);
    if (input) { input.setAttribute('aria-invalid', 'true'); input.setAttribute('aria-describedby', item.id); }
    const timer = expire ? setTimeout(() => this.clear(scope, id), 4500) : null;
    this.entries.set(`${scope}:${id}`, { item, input, timer });
  }
  clearSuccess(scope) {
    for(const [key,entry] of this.entries)if(key.startsWith(`${scope}:`)&&entry.item.classList.contains('feedback-success'))this.clear(scope,key.slice(scope.length+1));
  }
  clear(scope, id) {
    if (id === undefined) { for (const key of [...this.entries.keys()]) if (key.startsWith(`${scope}:`)) this.clear(scope,key.slice(scope.length+1)); return; }
    const key = `${scope}:${id}`, entry = this.entries.get(key);
    if (!entry) return;
    clearTimeout(entry.timer); entry.item.remove();
    if (entry.input?.getAttribute('aria-describedby') === entry.item.id) { entry.input.removeAttribute('aria-invalid'); entry.input.removeAttribute('aria-describedby'); }
    this.entries.delete(key);
  }
}
export function validTempo(value) { return value !== '' && Number.isInteger(Number(value)) && Number(value) >= 40 && Number(value) <= 180; }
