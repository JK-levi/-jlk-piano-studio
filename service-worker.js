const CACHE='jlk-studio-v1.1.1';
const ASSETS=['./','./index.html','./styles.css','./js/app.js','./js/theory.js','./js/audio.js','./js/notation.js','./js/storage.js','./js/playback.js','./js/exercises.js','./js/practice.js','./js/progressions.js','./js/feedback.js','./manifest.webmanifest','./icons/icon.svg','./icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS.map(path=>new Request(new URL(path,self.registration.scope),{cache:'reload'}))))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('jlk-studio-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
  if(!new URL(event.request.url).pathname.startsWith(new URL(self.registration.scope).pathname))return;
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
});
