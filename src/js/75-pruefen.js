/* ---------- Prüfen: Register-Prüfbericht + Fest-Tags aus den Plänen ---------- */
const CHK_SKIP=/orgel|vorgebetet|f[aä]llt|entf[aä]llt|stille|^\W*$|^\(|gebet|segnung|blatt|büchlein|rituale|psalm \d|weihe|gesätz/i;
const CHK_STRONG=['int','gra','off'];
const chkIgn=()=>new Set(LS.get('sp.chkIgn',[]));
/* Nutzung der Gesänge in den Archiv-Plänen: use[key][Fest] = Anzahl Pläne; unm = Plan-Zeilen ohne Register-Eintrag */
function festUse(){
  const reg=REG(),use={},unm={};
  D.plans.forEach(pl=>pl.r.map(rowFromArr).filter(r=>r.k==='G').forEach(r=>{
    const c=lookupChant(r,reg);
    if(!c){const t=(r.t||'').trim();if(t.length>3&&!CHK_SKIP.test(t)){const k=norm(t);(unm[k]=unm[k]||{t,cs:new Set()}).cs.add(pl.c)}return}
    const u=use[c.key]=use[c.key]||{};u[pl.c]=(u[pl.c]||0)+1}));
  return {use,unm:Object.values(unm).sort((a,b)=>b.cs.size-a.cs.size||a.t.localeCompare(b.t,'de'))};
}
/* Vorschläge: add = in Plänen eines Festes verwendet, aber nicht getaggt; rem = getaggt, in keinem Plan dieses Festes verwendet */
function festSuggest(){
  const {use,unm}=festUse(),add=[],rem=[];
  REG().filter(r=>!r.hide).forEach(r=>{
    const u=use[r.key]||{};
    Object.keys(u).forEach(c=>{if(!r.fe.includes(c))add.push({r,c,n:u[c],strong:!!r.po&&CHK_STRONG.includes(posClass(chantPos(r)))&&r.fe.length<=3})});
    r.fe.forEach(c=>{if(!u[c])rem.push({r,c})})});
  const o=(a,b)=>a.r.name.localeCompare(b.r.name,'de')||a.c.localeCompare(b.c,'de');
  return {add:add.sort((a,b)=>(b.strong-a.strong)||o(a,b)),rem:rem.sort(o),unm};
}
function applyFestChanges(adds,rems){
  const by={};adds.forEach(x=>(by[x.r.key]=by[x.r.key]||{a:[],d:[]}).a.push(x.c));rems.forEach(x=>(by[x.r.key]=by[x.r.key]||{a:[],d:[]}).d.push(x.c));
  let n=0;
  Object.keys(by).forEach(k=>{const r=REG().find(y=>y.key===k);if(!r)return;const o=S.reg[k]=S.reg[k]||{};
    const fe=new Set(Array.isArray(o.fe)?o.fe:r.fe0);by[k].a.forEach(c=>fe.add(c));by[k].d.forEach(c=>fe.delete(c));
    o.fe=CANONS.filter(c=>fe.has(c));save();regPut(k);n++});
  for(const k in AUTO)delete AUTO[k];return n;
}
function chkDups(reg){
  const nk=r=>norm(r.name).replace(/ (maennerschola|schola|frauenschola)$/,'').slice(0,14);
  const g={};reg.forEach(r=>{const k=nk(r);if(k)(g['n:'+k]=g['n:'+k]||[]).push(r);if(r.nr)(g['s:'+r.nr]=g['s:'+r.nr]||[]).push(r)});
  const seen=new Set(),out=[];
  Object.keys(g).forEach(k=>{const l=g[k];if(l.length<2)return;const id=l.map(r=>r.key).sort().join('¦');if(seen.has(id))return;seen.add(id);out.push({id,k,l})});
  return out.sort((a,b)=>a.l[0].name.localeCompare(b.l[0].name,'de'));
}
function chkShared(reg){
  const m={};reg.forEach(r=>['cn','on','nt'].forEach(f=>{const ls=f==='nt'?ntParse(r.nt):parseLinks(r[f]);ls.forEach(x=>{const id=ntMid(x.u);if(!id)return;const t=f==='nt'?'nt':f;((m[t+':'+id]=m[t+':'+id]||{id,f:t,l:[]}).l).push(r)})}));
  return Object.values(m).map(x=>{x.l=x.l.filter((r,i,a)=>a.findIndex(y=>y.key===r.key)===i);return x}).filter(x=>x.l.length>1);
}
function chkBadLinks(reg){
  const bad=[];reg.forEach(r=>['cn','on','yt'].forEach(f=>parseLinks(r[f]).forEach(x=>{if(f!=='yt'&&!ntMid(x.u))bad.push({r,f,u:x.u})})));return bad;
}
const chkName=(r,extra)=>`<a href="#" data-go="${esc(r.key)}">${esc(r.name)}</a>${r.nr?` <span class="muted small">${esc(r.nr)}</span>`:''}${extra||''}`;
function viewChk(){
  const reg=REG().filter(r=>!r.hide),ign=chkIgn(),edit=canEdit();
  const dups=chkDups(reg),shared=chkShared(reg),bad=chkBadLinks(reg),sg=festSuggest();
  const mk=(f)=>reg.filter(r=>f==='nt'?!ntParse(r.nt).length:!parseLinks(r[f]).length);
  const mnt=mk('nt'),mcn=mk('cn'),mon=mk('on');
  const det=(title,n,body,open)=>`<details class="card chkd" ${open?'open':''}><summary><b>${title}</b> <span class="pill ${n?'warn':'ok'}">${n}</span></summary><div class="chkb">${body}</div></details>`;
  const lst=(l,f)=>l.length?`<ul class="chkl">${l.slice(0,120).map(f).join('')}</ul>${l.length>120?`<p class="small muted">… und ${l.length-120} weitere (Filter «Dateien» im Register nutzen)</p>`:''}`:'<p class="muted small">Nichts gefunden.</p>';
  const dupL=dups.filter(d=>!ign.has(d.id));
  const addS=sg.add.filter(x=>x.strong),addW=sg.add.filter(x=>!x.strong);
  const festRow=(x,i,g,pre)=>`<label class="chk" style="display:block;padding:2px 0"><input type="checkbox" data-g="${g}" data-i="${i}" ${pre?'checked':''} ${edit?'':'disabled'}> ${chkName(x.r)} → <b>${esc(x.c)}</b>${x.n?` <span class="muted small">(in ${x.n} Plan${x.n===1?'':'en'})</span>`:''}</label>`;
  return `<div class="grid2"><div>
   <div class="card"><h2>Register-Prüfbericht</h2><p class="small">${reg.length} aktive Einträge · Stand der Prüfung: jetzt (aus den geladenen Daten). Einträge anklicken, um sie im Register zu öffnen.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><span class="pill ${mcn.length?'warn':'ok'}">ohne Choral-PDF: ${mcn.length}</span><span class="pill ${mon.length?'warn':'ok'}">ohne Orgel-PDF: ${mon.length}</span><span class="pill ${mnt.length?'warn':'ok'}">ohne Notator-Datei: ${mnt.length}</span><span class="pill ${dupL.length?'warn':'ok'}">Doppelte: ${dupL.length}</span></div>
    ${edit?'<p style="margin:10px 0 0"><button class="btn pri" id="chkdrive" title="Liest die Ordner in Google Drive und zeigt Dateien, die noch bei keinem Gesang verlinkt sind">☁ Verwaiste Drive-Dateien suchen</button></p>':''}</div>
   ${det('Doppelte / ähnliche Einträge',dupL.length,`<p class="small muted">Gleicher Anfang des Titels oder gleiche SR-Nummer. «bewusst» blendet die Gruppe aus (nur auf diesem Gerät).</p>`+(dupL.length?dupL.slice(0,60).map(d=>`<div class="chkg">${d.l.map(r=>chkName(r)).join(' · ')}${edit?` <button class="btn sm" data-ign="${esc(d.id)}">bewusst</button>`:''}</div>`).join(''):'<p class="muted small">Nichts gefunden.</p>'),dupL.length>0)}
   ${det('Mehrfach verwendete Dateien',shared.length,`<p class="small muted">Dieselbe Datei steht bei mehreren Gesängen (bei Messen und Sammel-PDFs normal).</p>`+lst(shared,x=>`<li>${x.f==='nt'?'Notator':x.f==='cn'?'Choral':'Orgel'}: ${x.l.map(r=>chkName(r)).join(' · ')}</li>`))}
   ${det('Links ohne Drive-Datei',bad.length,lst(bad,x=>`<li>${chkName(x.r)} <span class="muted small">(${x.f==='cn'?'Choral':'Orgel'}: ${esc(String(x.u).slice(0,60))})</span></li>`),bad.length>0)}
   ${det('Ohne Choral-PDF',mcn.length,lst(mcn,r=>`<li>${chkName(r)}</li>`))}
   ${det('Ohne Orgel-PDF',mon.length,lst(mon,r=>`<li>${chkName(r)}</li>`))}
   ${det('Ohne Notator-Datei',mnt.length,lst(mnt,r=>`<li>${chkName(r)}</li>`))}
   ${det('Plan-Zeilen ohne Register-Eintrag',sg.unm.length,`<p class="small muted">Schola-Titel aus den Archiv-Plänen, die keinem Register-Eintrag zugeordnet werden konnten (Hinweistexte sind ausgeblendet).</p>`+lst(sg.unm,x=>`<li>${esc(x.t)} <span class="muted small">· ${esc([...x.cs].slice(0,3).join(', '))}${x.cs.size>3?' …':''}</span></li>`))}
  </div><div>
   <div class="card"><h2>Fest-Tags aus den Plänen</h2><p class="small">Vergleicht die Fest-Zuordnung im Register mit den Archiv-Plänen: Welche Gesänge wurden an einem Fest tatsächlich gesungen, sind dort aber nicht getaggt – und welche Tags kommen in keinem Plan vor?</p>
    <p class="hint">Achtung: Ein Gesang mit eigener Fest-Zuordnung wird für <i>alle</i> seine Feste automatisch in neue Pläne eingefügt. Vorangekreuzt sind nur Introitus-, Graduale/Alleluia- und Offertoriumsgesänge mit höchstens 3 Festen (Communio-Motetten wie «Ave verum» sind oft festunabhängig und stehen unter «Weitere Vorkommen»).</p></div>
   <div class="card"><h3 style="margin:0 0 6px">Vorschläge: Tag ergänzen <span class="pill ${addS.length?'warn':'ok'}">${addS.length}</span></h3>
    <div id="fadd" style="max-height:340px;overflow:auto">${addS.map((x,i)=>festRow(x,i,'a',true)).join('')||'<p class="muted small">Keine.</p>'}</div>
    ${addW.length?`<details style="margin-top:8px"><summary class="small">Weitere Vorkommen (Hymnen, Marienlieder u. Ä., nicht vorangekreuzt): ${addW.length}</summary><div id="fadd2" style="max-height:300px;overflow:auto">${addW.map((x,i)=>festRow(x,i,'w',false)).join('')}</div></details>`:''}
    ${edit&&(addS.length||addW.length)?'<p style="margin:10px 0 0"><button class="btn pri" id="fapply">Ausgewählte Tags ergänzen</button></p>':''}</div>
   <div class="card"><h3 style="margin:0 0 6px">Tags ohne Plan-Vorkommen <span class="pill ${sg.rem.length?'warn':'ok'}">${sg.rem.length}</span></h3><p class="small muted">Kein Plan dieses Festes enthält den Gesang (evtl. andere Schreibweise oder neu eingeführt). Nichts vorangekreuzt.</p>
    <div id="frem" style="max-height:340px;overflow:auto">${sg.rem.map((x,i)=>festRow(x,i,'r',false)).join('')||'<p class="muted small">Keine.</p>'}</div>
    ${edit&&sg.rem.length?'<p style="margin:10px 0 0"><button class="btn" id="fremapply">Ausgewählte Tags entfernen</button></p>':''}</div>
  </div></div>`;
}
function bindChk(){
  const v=$('#view'),sg=festSuggest();
  v.onclick=e=>{
    const a=e.target.closest('[data-go]');if(a){e.preventDefault();S.rq=REG().find(r=>r.key===a.dataset.go).name;S.rart='';S.rfile='';S.rdup=false;S.tab='ges';render();scrollTo(0,0);return}
    const ig=e.target.closest('[data-ign]');if(ig){const s=chkIgn();s.add(ig.dataset.ign);LS.set('sp.chkIgn',[...s]);render()}};
  const dr=$('#chkdrive');if(dr)dr.onclick=()=>driveSync();
  const sel=(g,list)=>list.filter((x,i)=>{const cb=v.querySelector('input[data-g="'+g+'"][data-i="'+i+'"]');return cb&&cb.checked});
  const ap=$('#fapply');if(ap)ap.onclick=()=>{const add=sel('a',sg.add.filter(x=>x.strong)).concat(sel('w',sg.add.filter(x=>!x.strong)));if(!add.length){toast('Nichts ausgewählt');return}
    const n=applyFestChanges(add,[]);toast(add.length+' Tag'+(add.length===1?'':'s')+' bei '+n+' Gesängen ergänzt');render()};
  const rp=$('#fremapply');if(rp)rp.onclick=()=>{const rem=sel('r',sg.rem);if(!rem.length){toast('Nichts ausgewählt');return}
    const n=applyFestChanges([],rem);toast(rem.length+' Tag'+(rem.length===1?'':'s')+' bei '+n+' Gesängen entfernt');render()};
}

