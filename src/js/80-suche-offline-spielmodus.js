/* ---------- Globale Suche: Termine, Gesänge, Liederbuch, Pläne (Titel und Plan-Zeilen) ---------- */
function gsSearch(qs){
  const q=norm(qs.trim());if(q.length<2)return [];
  const out=[],lim=(t,a,n)=>{if(a.length)out.push({t,a:a.slice(0,n),more:Math.max(0,a.length-n)})};
  lim('Termine',EV.filter(e=>norm(e.n+' '+e.d+' '+fmtD(e.d)+' '+(e.note||'')).includes(q)).map(e=>({l:fmtD(e.d)+' · '+e.n,s:e.kj,go:()=>{S.sel=e.key;S.kj=e.kj;S.tab='termin'}})),6);
  lim('Gesänge (Choral)',REG().filter(r=>!r.hide&&norm(r.name+' '+(r.nr||'')+' '+(r.nm||'')).includes(q)).map(r=>({l:r.name,s:(r.fe&&r.fe.length?r.fe.slice(0,3).join(', '):'')+(r.nr?' · '+r.nr:''),go:()=>{S.rq=r.name;S.rart='';S.rfile='';S.rdup=false;S.tab='ges'}})),8);
  lim('Liederbuch',D.hym.filter(h=>norm(h[1]+' '+h[2]).includes(q)).map(h=>({l:(h[0]==='SR'&&/^\d+/.test(h[1])?'SR '+h[1]+' · ':'')+h[2],s:h[0]+(h[3]?' · '+h[3]:''),go:()=>{S.hq=h[2];S.hbook=h[0];S.hber='';S.tab='lb'}})),8);
  lim('Pläne (Titel)',D.plans.filter(p=>norm(p.c+' '+p.t+' '+(p.y||'')).includes(q)).map(p=>({l:p.t,s:p.c+(p.y?' · '+p.y:''),go:()=>{S.aq=p.t;S.tab='arch'}})),6);
  const hit=[];D.plans.forEach(p=>{const m=p.r.map(rowFromArr).filter(r=>norm(r.t||'').includes(q));if(m.length)hit.push({l:m[0].t,s:p.c+' · '+p.t+(p.y?' ('+p.y+')':''),go:()=>{S.aq=p.t;S.tab='arch'}})});
  lim('In Plan-Zeilen verwendet',hit,8);
  return out}
function gsOpen(){
  let el=$('#gs');
  if(!el){el=document.createElement('div');el.id='gs';el.innerHTML='<div class="gbox"><input type="search" id="gsq" placeholder="Suche in Terminen, Gesängen, Liederbuch, Plänen …" autocomplete="off"><div class="gres" id="gsr"></div></div>';document.body.appendChild(el);
    const draw=()=>{const res=gsSearch($('#gsq').value);window._gsr=[];
      $('#gsr').innerHTML=!$('#gsq').value.trim()?'<p class="small muted" style="padding:10px 14px">Mindestens 2 Zeichen eingeben. Enter öffnet den ersten Treffer, Esc schliesst.</p>':res.length?res.map(g=>`<h4>${g.t}</h4>`+g.a.map(x=>{window._gsr.push(x);return `<button class="gi" data-i="${window._gsr.length-1}">${esc(x.l)}${x.s?`<small>${esc(x.s)}</small>`:''}</button>`}).join('')+(g.more?`<p class="small muted" style="margin:2px 14px">… ${g.more} weitere</p>`:'')).join(''):'<p class="small muted" style="padding:10px 14px">Keine Treffer.</p>'};
    const go=i=>{const x=window._gsr[i];if(!x)return;x.go();gsClose();render();scrollTo(0,0)};
    $('#gsq').oninput=draw;
    $('#gsq').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();go(0)}else if(e.key==='ArrowDown'){const b=$('#gsr .gi');if(b){e.preventDefault();b.focus()}}};
    $('#gsr').onkeydown=e=>{const f=document.activeElement;if(e.key==='ArrowDown'&&f.nextElementSibling){let n=f.nextElementSibling;while(n&&!n.classList.contains('gi'))n=n.nextElementSibling;if(n){e.preventDefault();n.focus()}}
      else if(e.key==='ArrowUp'){let n=f.previousElementSibling;while(n&&!n.classList.contains('gi'))n=n.previousElementSibling;e.preventDefault();(n||$('#gsq')).focus()}};
    $('#gsr').onclick=e=>{const b=e.target.closest('.gi');if(b)go(+b.dataset.i)};
    el.onclick=e=>{if(e.target===el)gsClose()};draw()}
  el.hidden=false;$('#gsq').focus();$('#gsq').select()}
function gsClose(){const el=$('#gs');if(el)el.hidden=true}
$('#gsb').onclick=gsOpen;
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){gsClose();return}
  const t=e.target,ed=t&&/INPUT|TEXTAREA|SELECT/.test(t.tagName)||t&&t.isContentEditable;
  if((e.key==='/'&&!ed&&!e.ctrlKey&&!e.metaKey)||((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k')){e.preventDefault();gsOpen()}});

/* ---------- Offline-Paket: Orgel-/Choral-PDFs der nächsten Termine lokal speichern (IndexedDB), im Spielmodus ohne Netz öffnen ---------- */
const driveId=u=>{const m=/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:[^#]*&)?id=)([\w-]+)/.exec(u||'');return m?m[1]:null};
function offlineIds(n){
  const today=new Date().toISOString().slice(0,10),reg=REG(),ids=new Map();
  EV.filter(e=>e.d>=today).sort((a,b)=>a.d.localeCompare(b.d)).slice(0,n).forEach(e=>{
    getTermin(e).rows.filter(r=>isChant(r)).forEach(r=>{const c=lookupChant(r,reg);if(!c)return;
      [c.on,c.cn].filter(Boolean).forEach(f=>parseLinks(lnkStr(linksFor(f,r.p))).forEach(x=>{const id=driveId(x.u);if(id&&!ids.has(id))ids.set(id,(x.l||c.name))}))})});
  return ids}
async function offlinePack(n,log){
  const ids=offlineIds(n);let ok=0,skip=0,fail=0,bytes=0,i=0;
  const have=new Set(LS.get('sp.off',[]));
  for(const [id,nm] of ids){i++;log(`Lade ${i}/${ids.size}: ${nm} …`);
    try{if(have.has(id)&&await idbGet('pdf:'+id)){skip++;continue}
      const r=await GD.fetch('https://www.googleapis.com/drive/v3/files/'+id+'?alt=media',{},false);const b=await r.blob();
      await idbSet('pdf:'+id,b);have.add(id);bytes+=b.size;ok++}catch(e){fail++;console.warn('offline',id,e)}}
  LS.set('sp.off',[...have]);LS.set('sp.offms',Date.now());
  return {n:ids.size,ok,skip,fail,mb:(bytes/1048576).toFixed(1)}}
async function offlineClear(){const h=LS.get('sp.off',[]);for(const id of h)await idbSet('pdf:'+id,null);LS.set('sp.off',[])}
/* Links im Spielmodus auf lokale Kopie umbiegen, wo vorhanden */
async function offlineLinks(root){
  const have=new Set(LS.get('sp.off',[]));if(!have.size)return;
  for(const a of root.querySelectorAll('a[href]')){const id=driveId(a.getAttribute('href'));if(!id||!have.has(id))continue;
    const b=await idbGet('pdf:'+id);if(b&&b.size){a.href=URL.createObjectURL(b.type?b:new Blob([b],{type:'application/pdf'}));a.dataset.off='1';a.textContent+=' ✓'}}}
function offlineCard(){const n=LS.get('sp.off',[]).length,ms=LS.get('sp.offms',0);
  return `<div class="card"><h2>Offline-Paket (Orgel-Tablet)</h2><p class="small">Lädt die Orgel- und Choralnoten (PDF aus Drive) der nächsten Termine auf dieses Gerät. Im <i>Spielmodus</i> öffnen sich diese Noten danach ohne Netz (mit ✓). Nur Drive-Dateien; andere Links brauchen Netz.</p>
  <p class="small muted">${n?n+' Dateien gespeichert'+(ms?' (Stand '+fmtDT(ms)+')':''):'Noch nichts gespeichert.'}</p>
  <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><label class="small">Nächste <select id="offn"><option>4</option><option selected>8</option><option>12</option><option>20</option></select> Termine</label><button class="btn pri" id="offgo">Herunterladen</button>${n?'<button class="btn" id="offdel">Löschen</button>':''}</div><div class="small" id="offres" style="margin-top:8px"></div></div>`}
function bindOffline(){
  const g=$('#offgo');if(g)g.onclick=async()=>{const r=$('#offres');g.disabled=true;
    try{if(!GD.cached())throw new Error('Nicht bei Google angemeldet');const x=await offlinePack(+$('#offn').value,t=>{r.textContent=t});
      r.innerHTML=`Fertig: ${x.n} Dateien im Paket, ${x.ok} neu geladen (${x.mb} MB), ${x.skip} schon vorhanden${x.fail?', <b style="color:#a8322d">'+x.fail+' fehlgeschlagen</b>':''}.`}
    catch(e){r.innerHTML='<b style="color:#a8322d">Fehler: '+esc(e&&e.message||e)+'</b>'}g.disabled=false};
  const d=$('#offdel');if(d)d.onclick=async()=>{if(!confirm('Lokal gespeicherte Noten-Dateien löschen? (In Drive bleibt alles.)'))return;await offlineClear();toast('Gelöscht');render()}}

/* ---------- Spielmodus für den Organisten: grosse Ansicht, Orgelnoten-Links, Vor/Zurück, Bildschirm bleibt an ---------- */
let _wl=null;
async function playWake(on){try{if(on){if(navigator.wakeLock&&!_wl){_wl=await navigator.wakeLock.request('screen');_wl.addEventListener('release',()=>{_wl=null})}}else if(_wl){await _wl.release();_wl=null}}catch(e){}}
function playClose(){const el=$('#pm');if(el)el.remove();playWake(false);document.body.style.overflow=''}
function playOpen(key){
  const ev=evByKey[key];if(!ev)return;
  const t=getTermin(ev),reg=REG();
  const rows=t.rows.filter(r=>r.t||r.n||r.k==='O');
  const i=EV.indexOf(ev),prev=EV[i-1],next=EV[i+1];
  let el=$('#pm');if(!el){el=document.createElement('div');el.id='pm';document.body.appendChild(el)}
  const rh=rows.map((r,n)=>{
    const c=isChant(r)?lookupChant(r,reg):null;
    const lk=[];
    if(c&&c.on)lk.push(lnkHtml(lnkStr(linksFor(c.on,r.p)),'Orgel').replace(/class="l1"/g,'class="pmb org"'));
    if(c&&c.cn)lk.push(lnkHtml(lnkStr(linksFor(c.cn,r.p)),'Choral').replace(/class="l1"/g,'class="pmb"'));
    return `<div class="pr" data-n="${n}"><div class="pp">${esc(r.p)}</div><div class="pt"><span class="pn">${esc(rowNr(r))}</span>${esc(rowTitle(r))}</div>${r.o?`<div class="po">Orgel: ${esc(r.o)}</div>`:''}${lk.length?`<div class="pl">${lk.join('')}</div>`:''}</div>`}).join('');
  el.innerHTML=`<div class="ph"><button class="btn" id="pmx">✕ Schliessen</button><div class="pnav"><button class="btn" id="pmp" ${prev?'':'disabled'} title="${prev?esc(prev.n):''}">←</button><button class="btn" id="pmn" ${next?'':'disabled'} title="${next?esc(next.n):''}">→</button></div></div>
   <h2>${esc(ev.n)}</h2><div class="psub">${wdOf(ev.d)}, ${fmtD(ev.d)}${t.sch&&t.sch!=='keine'?' · Schola: '+esc(t.sch):''}</div>
   ${rows.length?rh:'<p class="psub">Noch keine Zeilen.</p>'}
   <p class="psub" style="margin-top:18px">Zeile antippen = abhaken.${_wl?' Bildschirm bleibt an.':''}</p>`;
  el.onclick=e=>{
    if(e.target.closest('#pmx')){playClose();return}
    if(e.target.closest('#pmp')&&prev){playOpen(prev.key);return}
    if(e.target.closest('#pmn')&&next){playOpen(next.key);return}
    if(e.target.closest('a'))return;
    const r=e.target.closest('.pr');if(r)r.classList.toggle('done')};
  el.scrollTop=0;document.body.style.overflow='hidden';playWake(true);offlineLinks(el);
}
document.addEventListener('keydown',e=>{const el=$('#pm');if(!el)return;
  if(e.key==='Escape')playClose();
  else if(e.key==='ArrowRight'){const b=$('#pmn');if(b&&!b.disabled)b.click()}
  else if(e.key==='ArrowLeft'){const b=$('#pmp');if(b&&!b.disabled)b.click()}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&$('#pm'))playWake(true)});

