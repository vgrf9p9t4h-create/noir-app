const CACHE='noir-pwa-v4-1';
const ASSETS=['./','./index.html','./style.css?v=4.1','./app.js?v=4.1','./manifest.webmanifest','./icons/noir-192.png','./icons/noir-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('noir-pwa-')&&k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;
 const isPage=e.request.mode==='navigate';
 e.respondWith((isPage?fetch(e.request).catch(()=>caches.match('./index.html')):caches.match(e.request).then(cached=>cached||fetch(e.request))).then(response=>{
  if(response&&response.ok&&!isPage){const copy=response.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));}
  return response;
 }));
});
