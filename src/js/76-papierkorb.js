/* ---------- Dateien im Papierkorb: Links entfernen ---------- */
/* Alle Drive-Verweise im Register: id -> [{key,name,f}] (aus den Roh-Daten ohne DEAD-Filter) */
function driveRefs(){
  const m=new Map();
  REG0().forEach(r=>{if(r.hide)return;['cn','on','yt','nt'].forEach(f=>{
    const a=f==='nt'?ntParse(r.nt):parseLinks(r[f]);
    a.forEach(x=>{if(!isDriveRef(x.u))return;const id=ntMid(x.u);if(!id)return;(m.get(id)||m.set(id,[]).get(id)).push({key:r.key,name:r.name,f})})})});
  return m}
/* Status je Datei: ok | trashed | gone (404) | unknown */
async function driveStatus(ids,prog){
  const out=new Map(),q=[...ids];let done=0,stop=null;
  const work=async()=>{while(q.length&&!stop){const id=q.shift();
    try{const j=await (await GD.fetch('https://www.googleapis.com/drive/v3/files/'+id+'?fields=id,trashed&supportsAllDrives=true',{},false)).json();out.set(id,j.trashed?'trashed':'ok')}
    catch(e){const msg=String(e&&e.message||e);if(/abgelaufen|Nicht bei Google/.test(msg)){stop=e;break}out.set(id,/Drive-Fehler 404/.test(msg)?'gone':'unknown')}
    done++;if(prog)prog(done,ids.length)}};
  await Promise.all(Array.from({length:6},work));
  if(stop)throw stop;return out}
/* Links auf die genannten Dateien aus den Register-Einträgen entfernen (als Überschreibung, wird mit Drive synchronisiert) */
function dropDriveLinks(bad){
  let n=0;const keys=new Set();
  REG0().forEach(r=>{let ch=false;const o={};
    ['cn','on','yt'].forEach(f=>{const a=parseLinks(r[f]);const b=a.filter(x=>!(isDriveRef(x.u)&&bad.has(ntMid(x.u))));if(b.length!==a.length){o[f]=lnkStr(b)||'-';ch=true;n+=a.length-b.length}});
    if(r.nt){const a=ntParse(r.nt),b=a.filter(x=>!bad.has(ntMid(x.u)));if(b.length!==a.length){o.nt=ntStr(b)||'-';ch=true;n+=a.length-b.length}}
    if(ch){S.reg[r.key]=Object.assign(S.reg[r.key]||{},o);keys.add(r.key)}});
  save();keys.forEach(k=>regPut(k));
  bad.forEach(id=>DEAD.add(id));LS.set('sp.dead',[...DEAD]);
  for(const a in AUTO)delete AUTO[a];
  return {n,e:keys.size}}
/* Wieder aufgetauchte Dateien (aus dem Papierkorb zurückgeholt) aus DEAD nehmen */
function reviveDead(st){let ch=false;st.forEach((v,id)=>{if(v==='ok'&&DEAD.has(id)){DEAD.delete(id);ch=true}});if(ch)LS.set('sp.dead',[...DEAD])}
async function autoTrashCheck(){
  try{if(READONLY||!GD.cached())return;
    if(Date.now()-LS.get('sp.trk',0)<864e5)return;
    const refs=driveRefs(),st=await driveStatus([...refs.keys()]);
    LS.set('sp.trk',Date.now());reviveDead(st);
    const bad=new Set([...st].filter(([,v])=>v==='trashed').map(([id])=>id));
    if(bad.size){const r=dropDriveLinks(bad);toast(r.n+' Link'+(r.n===1?'':'s')+' auf Dateien im Papierkorb entfernt ('+r.e+' Einträge)');render()}}
  catch(e){console.warn('autoTrashCheck',e)}}
function trashCard(){
  return `<div class="card"><h2>Dateien im Papierkorb</h2><p class="small">Prüft alle verknüpften Drive-Dateien (Choral, Orgel, YouTube-Links ausgenommen, Notator). Links auf Dateien im Papierkorb werden entfernt, automatisch höchstens einmal täglich beim Öffnen. Nicht mehr auffindbare Dateien (endgültig gelöscht oder ohne Zugriff) werden nur gemeldet.</p>
  <button class="btn pri" id="trchk">Jetzt prüfen</button><div class="small" id="trres" style="margin-top:8px"></div></div>`}
function bindTrash(){
  const b=$('#trchk');if(!b)return;
  b.onclick=async()=>{const r=$('#trres');b.disabled=true;
    try{if(!GD.cached())throw new Error('Nicht bei Google angemeldet');
      const refs=driveRefs(),ids=[...refs.keys()];
      const st=await driveStatus(ids,(d,n)=>{r.textContent='Prüfe '+d+'/'+n+' …'});
      LS.set('sp.trk',Date.now());reviveDead(st);
      const tr=ids.filter(i=>st.get(i)==='trashed'),gone=ids.filter(i=>st.get(i)==='gone'),unk=ids.filter(i=>st.get(i)==='unknown');
      const list=a=>a.length?'<ul class="chkl">'+a.slice(0,40).map(id=>'<li>'+[...new Set(refs.get(id).map(x=>esc(x.name)))].join(', ')+' <span class="muted">('+[...new Set(refs.get(id).map(x=>x.f))].join('/')+')</span></li>').join('')+(a.length>40?'<li>… '+(a.length-40)+' weitere</li>':'')+'</ul>':'';
      r.innerHTML=`${ids.length} Dateien geprüft: <b>${ids.length-tr.length-gone.length-unk.length}</b> in Ordnung, <b>${tr.length}</b> im Papierkorb, <b>${gone.length}</b> nicht auffindbar${unk.length?', '+unk.length+' nicht prüfbar':''}.`
        +(tr.length?`<p style="margin:8px 0 2px"><b>Im Papierkorb:</b></p>${list(tr)}${canEdit()?'<button class="btn" id="trdrop">Links entfernen</button>':''}`:'')
        +(gone.length?`<p style="margin:8px 0 2px"><b>Nicht auffindbar:</b></p>${list(gone)}${canEdit()?'<button class="btn" id="trdrop2">Auch diese Links entfernen</button>':''}`:'');
      const go=(set)=>{const x=dropDriveLinks(new Set(set));toast(x.n+' Link'+(x.n===1?'':'s')+' entfernt ('+x.e+' Einträge)');render()};
      const d1=$('#trdrop');if(d1)d1.onclick=()=>go(tr);
      const d2=$('#trdrop2');if(d2)d2.onclick=()=>go(tr.concat(gone));
    }catch(e){r.innerHTML='<b style="color:#a8322d">Fehler: '+esc(e&&e.message||e)+'</b>'}
    b.disabled=false}}
