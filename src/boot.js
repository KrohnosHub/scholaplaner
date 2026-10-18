/* Start: Google-Anmeldung (gleiche Client-ID/Token wie Notator), Basisdaten aus Drive/Cache laden, dann die App starten */
const idb=()=>new Promise((res,rej)=>{const r=indexedDB.open('scholaplaner',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
async function idbGet(k){try{const d=await idb();return await new Promise((res,rej)=>{const q=d.transaction('kv').objectStore('kv').get(k);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})}catch(e){return undefined}}
async function idbSet(k,v){try{const d=await idb();await new Promise((res,rej)=>{const t=d.transaction('kv','readwrite');t.objectStore('kv').put(v,k);t.oncomplete=res;t.onerror=()=>rej(t.error)})}catch(e){}}
const GD=(()=>{
  const CID='689606502893-na74rng5bet9477m4pkuvpmdvtcl7aug.apps.googleusercontent.com';
  const FOLDER='144wHwMFQUFhNxcpun6CO9fXtewhFcLe3', SCOPE='https://www.googleapis.com/auth/drive';
  const TK='notatorGdToken', HK='notatorGdHint';
  let client=null,gis=null,pending=null;
  const cached=()=>{for(const st of ['localStorage','sessionStorage']){try{const t=JSON.parse(window[st].getItem(TK)||'null');if(t&&t.token&&t.exp>Date.now()+60000)return t.token}catch(e){}}return null};
  const clear=()=>{for(const st of ['localStorage','sessionStorage']){try{window[st].removeItem(TK)}catch(e){}}};
  const store=(token,ex)=>{const v=JSON.stringify({token,exp:Date.now()+(ex||3600)*1000});try{localStorage.setItem(TK,v)}catch(e){try{sessionStorage.setItem(TK,v)}catch(e2){}}
    fetch('https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)',{headers:{Authorization:'Bearer '+token}}).then(r=>r.ok?r.json():null).then(j=>{if(j&&j.user&&j.user.emailAddress){try{localStorage.setItem(HK,j.user.emailAddress)}catch(e){}}}).catch(()=>{})};
  const loadGis=()=>{if(window.google&&google.accounts&&google.accounts.oauth2)return Promise.resolve();if(gis)return gis;
    gis=new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.async=true;s.onload=res;s.onerror=()=>{gis=null;rej(new Error('Google-Anmeldung nicht erreichbar (offline?)'))};document.head.appendChild(s)});return gis};
  function token(interactive){
    const c=cached();if(c)return Promise.resolve(c);
    if(!interactive)return Promise.reject(new Error('Nicht bei Google angemeldet'));
    if(pending)return pending;
    const p=loadGis().then(()=>new Promise((resolve,reject)=>{
      if(!client){let hint='';try{hint=localStorage.getItem(HK)||''}catch(e){}
        const cfg={client_id:CID,scope:SCOPE,callback:()=>{}};if(hint.indexOf('@')>0)cfg.hint=hint;client=google.accounts.oauth2.initTokenClient(cfg)}
      client.callback=r=>{if(r.error){reject(new Error('Google-Anmeldung: '+r.error));return}store(r.access_token,r.expires_in);resolve(r.access_token)};
      client.error_callback=e=>reject(new Error('Google-Anmeldung abgebrochen'+(e&&e.type?' ('+e.type+')':'')));
      client.requestAccessToken({prompt:''});
      setTimeout(()=>reject(new Error('Google-Anmeldung: keine Antwort (Popup blockiert?)')),90000)}));
    pending=p;const done=()=>{if(pending===p)pending=null};p.then(done,done);return p}
  async function api(url,opts,interactive){
    const t=await token(interactive);const o=Object.assign({},opts||{});o.headers=Object.assign({},o.headers||{},{Authorization:'Bearer '+t});
    const r=await fetch(url,o);
    if(r.status===401){clear();throw new Error('Google-Anmeldung abgelaufen – bitte neu anmelden')}
    if(!r.ok){const tx=await r.text();throw new Error('Drive-Fehler '+r.status+': '+tx.slice(0,160))}
    return r}
  const Q=s=>s.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
  async function find(name){const u='https://www.googleapis.com/drive/v3/files?'+new URLSearchParams({q:"name='"+Q(name)+"' and '"+FOLDER+"' in parents and trashed=false",fields:'files(id,name,modifiedTime)',pageSize:'5',orderBy:'modifiedTime desc'});
    const j=await (await api(u,{},false)).json();return (j.files||[])[0]||null}
  const readJson=async id=>(await api('https://www.googleapis.com/drive/v3/files/'+id+'?alt=media',{},false)).json();
  async function writeJson(name,obj,id){
    const body=JSON.stringify(obj);
    if(id){await api('https://www.googleapis.com/upload/drive/v3/files/'+id+'?uploadType=media',{method:'PATCH',headers:{'Content-Type':'application/json'},body},false);return id}
    const b='spb'+Date.now();
    const mp='--'+b+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify({name,parents:[FOLDER],mimeType:'application/json'})+'\r\n--'+b+'\r\nContent-Type: application/json\r\n\r\n'+body+'\r\n--'+b+'--';
    const r=await api('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',{method:'POST',headers:{'Content-Type':'multipart/related; boundary='+b},body:mp},false);
    return (await r.json()).id}
  return {cached,token,fetch:api,find,readJson,writeJson};
})();
(async()=>{
  const ov=document.getElementById('login'),msg=document.getElementById('lmsg'),btn=document.getElementById('lbtn');
  const startApp=D=>{window.__D=D;ov.hidden=true;const s=document.createElement('script');s.textContent=document.getElementById('main').textContent;document.body.appendChild(s)};
  const D=await idbGet('basis');
  if(D){startApp(D);return}
  ov.hidden=false;
  const go=async()=>{btn.disabled=true;msg.textContent='Verbinde mit Google Drive …';
    try{await GD.token(true);const f=await GD.find('Schola-Planer-Basis.json');
      if(!f){msg.textContent='Die Datei «Schola-Planer-Basis.json» fehlt im Notator-Ordner in Google Drive.';btn.disabled=false;return}
      const B=await GD.readJson(f.id);await idbSet('basis',B);await idbSet('basisMod',f.modifiedTime);startApp(B)}
    catch(e){msg.textContent=String(e&&e.message||e);btn.disabled=false}};
  btn.onclick=go;
  if(GD.cached())go();
})();
