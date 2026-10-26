// Keep module/initialization failures visible even if the main app cannot bind
// its controls. No user data is changed by this recovery notice.
const error=document.getElementById('startup-error');
const explain=()=>{
  error.textContent='! Unable to open the studio tool. Save any current work, then reopen Studio online to finish its update. Your saved music has not been deleted.';
  error.hidden=false;error.scrollIntoView({block:'nearest'});
};
let openingTimer;
document.addEventListener('studio-view-change',event=>{if(event.detail.next==='composition-panel')clearTimeout(openingTimer);});
document.getElementById('composer-open').addEventListener('click',()=>{
  error.hidden=true;
  clearTimeout(openingTimer);openingTimer=setTimeout(()=>{
    if(!document.getElementById('task-view').open||document.body.dataset.task!=='composition-panel')explain();
  },300);
});
import('./app.js').catch(explain);
