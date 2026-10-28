/* ---------- Speicher: JSON-Datei in Google Drive (Notator-Ordner) ---------- */
const ZNAME='Schola-Planer-Zustand.json', BNAME='Schola-Planer-Basis.json';
let ZID=null, flushT=null, flushing=false;
const dirty=new Set(LS.get('sp.dirty',[]));
const busy=()=>{const a=document.activeElement;return a&&/INPUT|TEXTAREA|SELECT/.test(a.tagName)};
function dlText(name,text,type='application/json'){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
function setSync(t,bad,login){const e=$('#sync');if(!e)return;e.innerHTML=(bad?`<span style="color:var(--warn)">${esc(t)}</span>`:t)+(login?` <button class="btn sm" data-login="1">Mit Google anmelden</button>`:'')}
const okSync=()=>setSync(READONLY?'<b>●</b> Nur Lesen':dirty.size?'Änderungen noch nicht gesichert …':'<b>●</b> in Drive gespeichert');
/* ---------- Änderungsverlauf (lokal): vorheriger Stand je Eintrag, zum Zurücksetzen ---------- */
const HIST_MAX=80,HIST_CHARS=600000;
let SHADOW={};
const shStr=o=>{if(!o)return null;const c=Object.assign({},o);delete c.upd;return JSON.stringify(c)};
function shadowAll(){SHADOW={};for(const k in S.termine)SHADOW['termine\t'+k]=shStr(S.termine[k]);for(const k in S.reg)SHADOW['register\t'+k]=shStr(S.reg[k])}
function histLabel(c,k){
  if(c==='termine'){const e=(typeof EV!=='undefined'?EV:[]).find(x=>x.key===k);return e?fmtD(e.d)+' '+e.n:'Termin '+k}
  const r=REG().find(x=>x.key===k);return r?r.name:'Gesang '+k}
function histPush(c,k,cur){
  const sk=c+'\t'+k,before=SHADOW[sk]===undefined?null:SHADOW[sk],now=shStr(cur);
  SHADOW[sk]=now;
  if(before===now) return;
  let h=LS.get('sp.hist',[]);const t=Date.now(),f=h[0];
  if(f&&f.c===c&&f.k===k&&t-f.ms<600000){f.ms=t}
  else{h.unshift({ms:t,c,k,l:histLabel(c,k),b:before})}
  h=h.slice(0,HIST_MAX);while(h.length>5&&JSON.stringify(h).length>HIST_CHARS)h.pop();
  LS.set('sp.hist',h)}
function histUndo(i){
  const h=LS.get('sp.hist',[]),e=h[i];if(!e)return false;
  const tgt=e.c==='termine'?S.termine:S.reg;
  if(e.b===null){if(e.c==='termine')return false;tgt[e.k]={}}
  else tgt[e.k]=JSON.parse(e.b);
  save();dbPut(e.c,e.k);
  if(e.c==='register'){for(const a in AUTO)delete AUTO[a]}
  return true}
function dbPut(coll,key){
  if(READONLY) return;
  const o=coll==='termine'?S.termine[key]:coll==='register'?S.reg[key]:null;
  if(o) histPush(coll,key,o);
  if(o) o.upd=new Date().toISOString();
  dirty.add(coll+'\t'+(coll==='eigene'?'*':key));LS.set('sp.dirty',[...dirty]);
  clearTimeout(flushT);flushT=setTimeout(flush,1500);
  if(GD.cached()) okSync(); else setSync('Nur lokal gespeichert – bitte anmelden',true,true);
}
async function getRemote(){
  if(!ZID){const f=await GD.find(ZNAME);ZID=f&&f.id}
  const base={v:2,termine:{},reg:{},custom:[]};
  if(!ZID) return base;
  return Object.assign(base,await GD.readJson(ZID));
}
function mergeIn(R){
  let tt=false,tr=false,tc=false;
  for(const k in R.termine||{}){const r=R.termine[k],l=S.termine[k];if(dirty.has('termine\t'+k))continue;if(!l||(r.upd||'')>(l.upd||'')){S.termine[k]=r;tt=true}}
  for(const k in R.reg||{}){const r=R.reg[k],l=S.reg[k];if(dirty.has('register\t'+k))continue;if(!l||(r.upd||'')>(l.upd||'')){S.reg[k]=r;tr=true}}
  (R.custom||[]).forEach(c=>{if(!S.custom.some(y=>y.art===c.art&&y.name===c.name&&(y.nr||'')===(c.nr||''))){S.custom.push(c);tc=true}});
  if(tr)for(const k in AUTO)delete AUTO[k];
  if(tt||tr)shadowAll();
  return {tt,tr,tc};
}
function redraw(m){
  if(m.tt||m.tr||m.tc){
    if(m.tt){if(S.tab==='kj')drawList();else if(S.tab==='abg')render();else if(S.tab==='termin'&&!busy())render()}
    if((m.tr||m.tc)&&S.tab==='ges'&&!busy())drawGes();
    if((m.tr||m.tc)&&!m.tt&&S.tab==='termin'&&!busy())render();
  }
}
async function pull(){
  if(!GD.cached()||flushing) return;
  try{const R=await getRemote();const m=mergeIn(R);save();redraw(m);okSync()}
  catch(e){setSync('Verbindung gestört: '+(e&&e.message||e),true)}
}
async function flush(){
  if(READONLY){dirty.clear();LS.set('sp.dirty',[]);return}
  if(flushing||!dirty.size) return;
  if(!GD.cached()){setSync('Nur lokal gespeichert – bitte anmelden',true,true);return}
  flushing=true;const snap=[...dirty];
  try{
    const R=await getRemote();
    const keep=new Set(dirty);dirty.clear();mergeIn(R);keep.forEach(d=>dirty.add(d));
    snap.forEach(d=>{const [c,k]=d.split('\t');
      if(c==='termine'&&S.termine[k])R.termine[k]=S.termine[k];
      else if(c==='register'&&S.reg[k])R.reg[k]=S.reg[k]});
    R.custom=R.custom||[];S.custom.forEach(c=>{if(!R.custom.some(y=>y.art===c.art&&y.name===c.name&&(y.nr||'')===(c.nr||'')))R.custom.push(c)});
    R.v=2;
    ZID=await GD.writeJson(ZNAME,R,ZID);
    snap.forEach(d=>dirty.delete(d));LS.set('sp.dirty',[...dirty]);save();okSync();
  }catch(e){setSync('Speichern fehlgeschlagen: '+(e&&e.message||e),true,!GD.cached())}
  flushing=false;
  if(dirty.size){clearTimeout(flushT);flushT=setTimeout(flush,4000)}
}
async function checkRole(){
  try{
    if(!ZID){const f=await GD.find(ZNAME);ZID=f&&f.id}
    if(!ZID) return;
    const j=await (await GD.fetch('https://www.googleapis.com/drive/v3/files/'+ZID+'?fields=capabilities(canEdit)',{},false)).json();
    const ro=!!(j.capabilities&&j.capabilities.canEdit===false);
    if(ro!==READONLY){READONLY=ro;LS.set('sp.ro',ro);if(ro){dirty.clear();LS.set('sp.dirty',[])}render()}
  }catch(e){}
}
async function checkBasis(){
  try{const f=await GD.find(BNAME);if(!f)return;const mod=await idbGet('basisMod');
    if(mod&&f.modifiedTime===mod)return;
    const D2=await GD.readJson(f.id);await idbSet('basis',D2);await idbSet('basisMod',f.modifiedTime);
    if(mod){const e=$('#toast');e.innerHTML='Neue Basisdaten geladen. <button class="btn sm" onclick="location.reload()">Neu laden</button>';e.hidden=false}
  }catch(e){}
}
async function initDb(){
  document.addEventListener('click',async e=>{
    const b=e.target.closest('[data-login]');if(!b)return;
    try{await GD.token(true);await initDb.go()}catch(err){setSync(String(err&&err.message||err),true,true)}});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&GD.cached()){pull().then(flush)}});
  setInterval(()=>{if(!document.hidden&&!busy()&&GD.cached())pull().then(flush)},120000);
  initDb.go=async()=>{setSync('verbinde …');await checkRole();await pull();if(!READONLY){try{const b0=JSON.stringify(S.reg)+S.custom.length;regFixes();folderLinks(()=>{});if(b0!==JSON.stringify(S.reg)+S.custom.length)render()}catch(e){console.warn('regFixes',e)}}await flush();checkBasis();autoBackup()};
  if(GD.cached()) initDb.go(); else setSync('Nicht angemeldet',true,true);
}
function toast(t,undo){const e=$('#toast');e.textContent=t;if(undo){const b=document.createElement('button');b.className='btn sm';b.style.marginLeft='12px';b.textContent='Rückgängig';b.onclick=()=>{undo();e.hidden=true};e.appendChild(b)}e.hidden=false;clearTimeout(toast.h);toast.h=setTimeout(()=>e.hidden=true,undo?9000:3200)}

