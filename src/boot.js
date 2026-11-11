/* Start: Google-Anmeldung (gleiche Client-ID/Token wie Notator), Basisdaten aus Drive/Cache laden, dann die App starten */
const idb=()=>new Promise((res,rej)=>{const r=indexedDB.open('scholaplaner',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
async function idbGet(k){try{const d=await idb();return await new Promise((res,rej)=>{const q=d.transaction('kv').objectStore('kv').get(k);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})}catch(e){return undefined}}
async function idbSet(k,v){try{const d=await idb();await new Promise((res,rej)=>{const t=d.transaction('kv','readwrite');t.objectStore('kv').put(v,k);t.oncomplete=res;t.onerror=()=>rej(t.error)})}catch(e){}}
const GD=(()=>{
  const CID='689606502893-na74rng5bet9477m4pkuvpmdvtcl7aug.apps.googleusercontent.com';
  const FOLDER='144wHwMFQUFhNxcpun6CO9fXtewhFcLe3', SCOPE='https://www.googleapis.com/auth/drive';
  const TK='notatorGdToken', HK='notatorGdHint';
  /* Anmeldung, Token und Fehlerbehandlung: gemeinsamer Kern mit Notator (src/gd-core.js, Quelle notator/shared/gd-core.js) */
  const core=gdCoreCreate({clientId:()=>CID,scope:SCOPE,tokenKey:TK,hintKey:HK});
  const cached=core.cached, api=core.fetch;
  const token=(interactive,silent)=>core.token(interactive,{silent:!!silent});
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
  async function list(part){const u='https://www.googleapis.com/drive/v3/files?'+new URLSearchParams({q:"name contains '"+Q(part)+"' and '"+FOLDER+"' in parents and trashed=false",fields:'files(id,name,modifiedTime)',pageSize:'100',orderBy:'modifiedTime desc'});
    return (await (await api(u,{},false)).json()).files||[]}
  return {cached,token,fetch:api,find,readJson,writeJson,list,FOLDER};
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
  if(GD.cached())go();else GD.token(true,true).then(()=>go()).catch(()=>{});
})();
