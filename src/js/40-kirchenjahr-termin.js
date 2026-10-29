/* --- Kirchenjahr --- */
function viewKJ(){
  const arts=[...new Set(EV.map(e=>e.a))].sort();
  return `<div class="tools">
    <label>Kirchenjahr<select id="kj">${[...new Set(EV.map(e=>e.kj))].map(k=>`<option>${k}</option>`).join('')}</select></label>
    <label>Monat<select id="mon"><option value="">alle</option>${MON.map((m,i)=>`<option value="${i+1}" ${S.month==String(i+1)?'selected':''}>${m}</option>`).join('')}</select></label>
    <label>Suche<input type="search" id="q" placeholder="Fest, Datum, Hinweis" value="${esc(S.q)}"></label>
    <label>Art<select id="art"><option value="">alle</option>${arts.map(a=>`<option ${S.art===a?'selected':''}>${esc(a)}</option>`).join('')}</select></label>
    <label>Status<select id="status"><option value="">alle</option>${['offen','Vorschlag','Entwurf','fertig'].map(a=>`<option ${S.status===a?'selected':''}>${a}</option>`).join('')}</select></label>
    <label class="chk"><input type="checkbox" id="unsure" ${S.unsure?'checked':''}> nur Unsicheres</label>
    <span class="count" id="cnt"></span>
  </div>
  <div class="tw"><table><thead><tr><th>Datum</th><th>Tag</th><th>Fest / Sonntag</th><th>Art</th><th>Schola</th><th>Status</th><th>Hinweis</th></tr></thead><tbody id="list"></tbody></table></div>
  <p class="hint">Farbstreifen = liturgische Farbe (Näherung, bitte prüfen). Hinweise mit «UNSICHER» sind noch nicht bestätigt. Klick auf eine Zeile öffnet den Termin.</p>`;
}
function filtered(){
  const q=norm(S.q);
  return EV.filter(e=>e.kj===S.kj&&(!S.month||+e.d.slice(5,7)===+S.month)&&(!S.art||e.a===S.art)&&(!S.status||statusOf(e)===S.status)&&(!S.unsure||/UNSICHER|prüfen|bestätigen/i.test(e.note))
    &&(!q||norm(e.n+' '+e.note+' '+fmtD(e.d)+' '+wdOf(e.d)).includes(q)));
}
function drawList(){
  const l=filtered(); let last=''; const out=[];
  l.forEach(e=>{
    const m=MON[+e.d.slice(5,7)-1]+' '+e.d.slice(0,4);
    if(m!==last){out.push(`<tr class="month"><td colspan="7">${m}</td></tr>`);last=m}
    const t=getTermin(e); const st=statusOf(e);
    const un=/UNSICHER|prüfen|bestätigen/i.test(e.note);
    out.push(`<tr class="row-ev ${e.a==='Sonntag'?'sun':''}" tabindex="0" data-key="${esc(e.key)}" style="--lc:${lcolor(e)}">
      <td class="num">${fmtD(e.d)}</td><td>${wdOf(e.d).slice(0,2)}</td><td><span class="sw"></span>${esc(e.n)}</td><td class="small muted">${esc(e.a)}</td>
      <td class="small">${esc(t.sch)}</td>
      <td><span class="pill ${st==='fertig'?'ok':st==='Entwurf'?'draft':''}">${st}</span></td>
      <td class="small">${un?'<span class="pill warn">unsicher</span> ':''}${esc(e.note.replace(/^UNSICHER:?\s*/,''))}</td></tr>`);
  });
  $('#list').innerHTML=out.join('')||'<tr><td colspan="7" class="muted">Keine Treffer.</td></tr>';
  $('#cnt').textContent=l.length+' Einträge';
}
function bindKJ(){
  $('#kj').value=S.kj; drawList();
  $('#kj').onchange=e=>{S.kj=e.target.value;drawList()};
  $('#mon').onchange=e=>{S.month=e.target.value;drawList()};
  $('#q').oninput=e=>{S.q=e.target.value;drawList()};
  $('#art').onchange=e=>{S.art=e.target.value;drawList()};
  $('#status').onchange=e=>{S.status=e.target.value;drawList()};
  $('#unsure').onchange=e=>{S.unsure=e.target.checked;drawList()};
  const open=el=>{const tr=el.closest('tr.row-ev');if(tr){S.sel=tr.dataset.key;S.tab='termin';render();scrollTo(0,0)}};
  $('#list').onclick=e=>open(e.target);
  $('#list').onkeydown=e=>{if(e.key==='Enter')open(e.target)};
}

/* --- Termin --- */
function viewTermin(){
  const ev=S.sel&&evByKey[S.sel];
  if(!ev) return `<div class="card"><h2>Termin</h2><p class="muted">Wähle im Reiter «Kirchenjahr» einen Termin, oder lege hier einen freien Termin an (Sonderanlass).</p>
    ${canEdit()?`<div class="fields"><label><span>Datum</span><input type="date" id="fd"></label><label><span>Bezeichnung</span><input type="text" id="fn" placeholder="z.B. Wallfahrt, Hochzeit"></label></div>
    <button class="btn pri" id="fadd">Termin anlegen</button>`:''}</div>`;
  const t=getTermin(ev); const ro=!canEdit();
  const sugg=bestPlans(ev.c,t.sch);
  const dis=ro?'disabled':'';
  const tplOpts=(sugg.length?`<optgroup label="Passend zum Fest (${esc(ev.c||'')})">${sugg.map(p=>`<option value="${p.id}" ${t.tpl===p.id?'selected':''}>${esc(planLabel(p))}</option>`).join('')}</optgroup>`:'')
    +`<optgroup label="Anderer Festtyp"><option value="">– Festtyp wählen –</option>${CANONS.map(c=>`<option value="c:${esc(c)}">${esc(c)}</option>`).join('')}</optgroup>`;
  return `<div class="grid2 tv" data-tsub="${S.tsub||'ablauf'}" data-rv="${LS.get('sp.rv',innerWidth<=900?'list':'table')}"><div>
   <div class="card">
    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><button class="btn sm" id="back">← Kirchenjahr</button>
     <h2 style="flex:1;min-width:200px"><span class="sw" style="--lc:${lcolor(ev)}"></span>${esc(ev.n)}</h2></div>
    <div class="muted" style="margin-top:4px">${wdOf(ev.d)}, ${fmtD(ev.d)} · ${esc(ev.a)}</div>
    ${ev.note?`<p class="note" style="margin:10px 0 0">${esc(ev.note)}</p>`:''}
    ${ev.gen?`<p class="note small" style="margin:10px 0 0">Automatisch fortgeschrieben (Regeln aus 2025–2028). Datum bitte vor der Planung prüfen.</p>`:''}
    ${(()=>{const p=t.tpl&&planById[t.tpl];return p?`<p class="small muted" style="margin:10px 0 0">Vorlage: <a href="https://drive.google.com/file/d/${p.id}/view" target="_blank" rel="noopener">${esc(planLabel(p))}</a>${ev.act&&t.tpl===ev.act?' · tatsächlicher Plan aus dem Archiv':(t.tpl===ev.pid?' · Vorschlag aus dem Vorjahr':'')}</p>`:`<p class="small muted" style="margin:10px 0 0">Keine Vorlage zugeordnet. Festtyp unter «Vorlage laden» wählen.</p>`})()}
    <details class="kopfd" id="kopfd" ${(S.kopf!==undefined?S.kopf:innerWidth>560)?'open':''}><summary>${esc(t.sch)} · ${esc(t.status)} · Einstellungen</summary>
    <div class="fields">
      <label><span>Schola</span><select id="sch" ${dis}>${['Männer','Frauen','Männer + Frauen','keine'].map(x=>`<option value="${x}" ${t.sch===x?'selected':''}>${x}${(t.vars&&t.vars[x]&&t.vars[x].rows&&t.vars[x].rows.length)?' ● Version':''}</option>`).join('')}</select></label>
      <label><span>Status</span><select id="st" ${dis}>${['offen','Vorschlag','Entwurf','fertig'].map(x=>`<option ${t.status===x?'selected':''}>${x}</option>`).join('')}</select></label>
      <label><span>Vorlage laden</span><select id="tpl" ${dis}>${tplOpts}</select></label>
    </div>
    ${ro?'':`<div class="fields"><label style="grid-column:1/-1"><span>Notiz zum Termin (intern)</span><input type="text" id="tnote" value="${esc(t.note)}"></label></div>`}
    </details>
    ${t.rows.length||!ro?'':`<p class="muted">Noch kein Plan angelegt.</p>`}
   </div>
   <div class="seg tsw" role="tablist" aria-label="Bereich">${[['ablauf','Ablauf'],['schola','Schola'+(ev.c?' ('+assignedTo(ev.c).length+')':'')],['vorschau','Vorschau']].map(([k,l])=>`<button data-tsub="${k}" aria-pressed="${(S.tsub||'ablauf')===k}">${l}</button>`).join('')}</div>
   <div class="card" data-sec="ablauf"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center"><h3>Ablauf</h3><span><button class="btn sm" id="rvt" title="Ansicht wechseln">Tabelle</button> ${ro?'':`<button class="btn sm" id="addrow">+ Zeile</button> <button class="btn sm" id="addg">+ Schola-Gesang</button>`}</span></div>
    <div class="rlw" id="edl"></div><div class="rowsw"><table class="ed" id="ed"><thead><tr><th>Position</th><th>Buch</th><th>Nr.</th><th>Strophen</th><th>Titel / Incipit</th><th>Typ</th>${canOrgan()?'<th>Orgel</th>':''}<th></th></tr></thead><tbody id="edb"></tbody></table></div>
    <p class="hint">Typ «Schola» = Choralgesang (erscheint im Liederplan nur als Titel, im Scholaplan mit Links). Buch SR = Salve Regina (Standard).</p>
   </div><div id="regc" data-sec="schola"></div></div>
   <div data-sec="vorschau">
    <div class="card">
     <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between">
      <div class="seg" role="group" aria-label="Vorschau">
        <button data-prev="lieder" aria-pressed="${S.prev==='lieder'}">Liederplan</button>
        ${canSchola()?`<button data-prev="schola" aria-pressed="${S.prev==='schola'}">Scholaplan</button>`:''}
      </div>
      ${S.prev==='schola'?`<span style="display:flex;gap:12px;flex-wrap:wrap">${canOrgan()?`<label class="small"><input type="checkbox" id="organ" ${S.organ?'checked':''}> Orgelnoten</label>`:''}<label class="small"><input type="checkbox" id="nver" ${showNt()?'checked':''}> Notator-Versionen</label></span>`:''}
     </div>
     <div id="prev" style="margin-top:12px"></div>
     <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">
       <button class="btn pri" id="pdf">PDF ${S.prev==='lieder'?'Liederplan':'Scholaplan'}</button>
       <button class="btn" id="copy">Text kopieren</button>
       <button class="btn" id="play">▶ Spielmodus</button>
     </div>
     <p class="hint" style="margin-top:8px">Der Liederplan enthält nie YouTube-Links und ist zum Weitergeben gedacht.</p>
    </div><div id="abg"></div></div></div>`;
}
/* Nummer -> Titel aus dem Liederverzeichnis (Katalog); mehrere Treffer = mehrdeutig */
function titleForNr(b,n){const hit=[];for(const x of (CAT.L||new Map()).values())if(String(x.n)===String(n)&&(x.b||'SR')===(b||'SR')&&x.t&&!hit.includes(x.t))hit.push(x.t);return hit}
/* Katalog-Auswahl für die Titel-Spalte: Vorschläge aus Register/Liederbuch, Freitext bleibt möglich */
let CAT={G:new Map(),L:new Map()};
function buildCat(){
  const G=new Map(),L=new Map();
  REG().filter(r=>!r.hide).forEach(r=>{
    const sr=/^SR\s*(\d+)/.exec(r.nr||'');
    if(/^Ordinarium/.test(r.art)&&sr){const v='SR '+sr[1]+' · '+r.name;if(!L.has(v))L.set(v,{b:'SR',n:sr[1],t:r.name,lab:r.art.split('/')[0].trim()})}
    if(!G.has(r.name)){const lk=parseLinks((r.cn||'')+' ; '+(r.on||'')+' ; '+(r.yt||'')).map(x=>x.l||'').join(' ');
      G.set(r.name,{t:r.name,lab:String(r.art||'').split('(')[0].trim()+(r.nr?' · '+r.nr:'')+(r.po?' · '+r.po.split('|')[0].trim():'')+(r.fe&&r.fe.length?' · '+r.fe.slice(0,2).join(', ')+(r.fe.length>2?' …':''):''),
        s:norm([r.name,r.orig,r.nr,r.po,(r.fe||[]).join(' '),lk].join(' ')),key:r.key})}});
  D.hym.forEach(h=>{const num=h[0]==='SR'&&/^\d+/.test(h[1]);const v=num?'SR '+h[1]+' · '+h[2]:h[2];
    if(!L.has(v))L.set(v,num?{b:'SR',n:h[1],t:h[2],lab:h[3]||''}:{b:'',n:'',t:h[2],lab:h[0]!==h[2]?h[0]:''})});
  [G,L].forEach(m=>m.forEach((x,v)=>{if(!x.s)x.s=norm(v+' '+(x.lab||''))}));
  CAT={G,L};
}
const catOpts=k=>[...CAT[k]].map(([v,x])=>`<option value="${esc(v)}">${esc(x.lab||'')}</option>`).join('');
/* Detail-Ansicht einer Ablauf-Zeile (Blatt über der Liste) */
function drawSheet(ev,t,full){
  const i=window._rsI,C=window._rsCtx;let sh=document.getElementById('rsheet');
  if(i==null||!t.rows[i]||!C){if(sh)sh.remove();window._rsI=null;document.body.style.overflow='';return}
  const r=t.rows[i];
  if(sh&&!full&&sh.dataset.i==String(i)&&sh.dataset.k===r.k&&sh.dataset.n===String(t.rows.length)){
    sh.querySelectorAll('[data-f]').forEach(x=>{if(x!==document.activeElement)x.value=r[x.dataset.f]||''});return}
  if(!sh){sh=document.createElement('div');sh.id='rsheet';document.body.appendChild(sh)}
  sh.dataset.i=i;sh.dataset.k=r.k;sh.dataset.n=t.rows.length;
  const ed=canEdit();
  sh.innerHTML=`<div class="rsb" role="dialog" aria-label="Zeile bearbeiten"><div class="rsh"><b>Zeile ${i+1} von ${t.rows.length}</b><button class="btn pri" data-s="close">Fertig</button></div>
   <table class="ed rs"><tbody id="edd">${window._trHtml(r,i,true)}</tbody></table>
   <div class="rsa"><button class="btn" data-s="prev" ${i?'':'disabled'}>← Vorherige</button><button class="btn" data-s="next" ${i<t.rows.length-1?'':'disabled'}>Nächste →</button>${ed?`<button class="btn" data-s="up" ${i?'':'disabled'} title="nach oben">↑</button><button class="btn" data-s="dn" ${i<t.rows.length-1?'':'disabled'} title="nach unten">↓</button><button class="btn" data-s="del">✕ Löschen</button>`:''}</div></div>`;
  document.body.style.overflow='hidden';
  const e=$('#edd');if(C.h){e.oninput=C.h.i;e.onchange=C.h.c}
  sh.onclick=ev2=>{const b=ev2.target.closest('[data-s]');
    if(!b){if(ev2.target===sh){window._rsI=null;drawSheet(ev,t);drawRows(ev,t)}return}
    const a=b.dataset.s,j=window._rsI;
    if(a==='close'){window._rsI=null;drawSheet(ev,t);drawRows(ev,t);return}
    if(a==='prev')window._rsI=j-1;else if(a==='next')window._rsI=j+1;
    else if(a==='del'){t.rows.splice(j,1);C.commit();C.pv();window._rsI=t.rows.length?Math.min(j,t.rows.length-1):null}
    else if(a==='up'&&j>0){[t.rows[j-1],t.rows[j]]=[t.rows[j],t.rows[j-1]];window._rsI=j-1;C.commit();C.pv()}
    else if(a==='dn'&&j<t.rows.length-1){[t.rows[j+1],t.rows[j]]=[t.rows[j],t.rows[j+1]];window._rsI=j+1;C.commit();C.pv()}
    drawRows(ev,t);if(window._rsI!=null)drawSheet(ev,t,true)}}
function drawRows(ev,t){
  const ro=!canEdit();
  buildCat();
  const trHtml=(r,i,sh)=>{
    const d=ro?'disabled':'';
    const hnr=r.k==='G'&&!r.b&&!r.n&&!r.v, ho=!r.o;
    const mh=hnr&&!sh?' mhid':'';
    return `<tr class="${r.k==='G'?'g':''}" data-i="${i}">
     <td class="c-pos"><input type="text" data-f="p" value="${esc(r.p)}" ${d}></td>
     <td class="c-book${mh}"><select data-f="b" ${d}>${['','SR','Adoremus','Heft','Blatt','Zettel','OM'].map(x=>`<option value="${x}" ${r.b===x?'selected':''}>${x||'–'}</option>`).join('')}</select></td>
     <td class="c-nr${mh}"><input type="text" data-f="n" value="${esc(r.n)}" ${d}></td>
     <td class="c-v${mh}"><input type="text" data-f="v" value="${esc(r.v)}" ${d}></td>
     <td class="c-t"><input type="text" data-f="t" value="${esc(r.t)}" ${r.k==='O'?'':'autocomplete="off" placeholder="Tippen zum Suchen im Katalog oder frei eintippen"'} ${d}></td>
     <td class="c-k"><select data-f="k" ${d}><option value="L" ${r.k==='L'?'selected':''}>Lied</option><option value="G" ${r.k==='G'?'selected':''}>Schola</option><option value="O" ${r.k==='O'?'selected':''}>Orgel/Stille</option></select></td>
     ${canOrgan()?`<td class="c-o${ho&&!sh?' mhid':''}"><input type="text" data-f="o" value="${esc(r.o)}" placeholder="Hinweis" ${d}></td>`:''}
     ${sh?'':`<td class="c-x">${ro?'':`<span class="act-full"><button class="btn sm" data-a="up" title="nach oben">↑</button> <button class="btn sm" data-a="dn" title="nach unten">↓</button> <button class="btn sm" data-a="del" title="Zeile löschen">✕</button></span><details class="rmenu"><summary class="btn sm" aria-label="Zeilenmenü">⋯</summary><div class="rmp">${canOrgan()&&ho?'<button class="btn sm" data-a="sho">+ Hinweis</button>':''}${hnr?'<button class="btn sm" data-a="shnr">+ Nr.</button>':''}<button class="btn sm" data-a="up" title="nach oben">↑</button><button class="btn sm" data-a="dn" title="nach unten">↓</button><button class="btn sm" data-a="del" title="Zeile löschen">✕</button></div></details>`}</td>`}</tr>`;
  };
  window._trHtml=trHtml;
  $('#edb').innerHTML=t.rows.map((r,i)=>trHtml(r,i,false)).join('')||`<tr><td colspan="8" class="muted" style="padding:10px">Keine Zeilen. Vorlage laden oder Zeile hinzufügen.</td></tr>`;
  const el=$('#edl');if(el)el.innerHTML=t.rows.map((r,i)=>{const nr=rowNr(r);return `<button type="button" class="rl${r.k==='G'?' g':''}" data-i="${i}"><span class="rlp">${esc(r.p)||'–'}${r.k==='G'?' · Schola':r.k==='O'?' · Orgel/Stille':''}</span><span class="rlt">${nr?`<b class="rln">${esc(nr)}</b>`:''}${esc(r.t||'')||'<i class="muted">(leer)</i>'}</span>${r.o?`<span class="rlo">Orgel: ${esc(r.o)}</span>`:''}</button>`}).join('')||'<p class="muted" style="margin:8px 0">Keine Zeilen. Vorlage laden oder Zeile hinzufügen.</p>';
  if(window._rsI!=null)drawSheet(ev,t);
  let dl=document.getElementById('catdl'); if(!dl){dl=document.createElement('div');dl.id='catdl';document.body.appendChild(dl)}
  dl.innerHTML=`<datalist id="catG">${catOpts('G')}</datalist><datalist id="catL">${catOpts('L')}</datalist>`;
}

const POSS=['Introitus','Graduale/Alleluia','Offertorium','Communio','Einzug','Sonstiges'];
function schPlanCard(ev,t){
  const reg=REG(),g=t.rows.map((r,i)=>[r,i]).filter(x=>x[0].k==='G'&&(x[0].t||'').trim()).sort((a,b)=>messRank(a[0].p)-messRank(b[0].p)||a[1]-b[1]).map(x=>x[0]);
  const li=g.map(r=>{const c=lookupChant(r,reg);const st=!c?'<span class="pill warn">nicht im Register</span>':(!c.cn&&!c.yt?'<span class="pill warn">Links fehlen</span>':'<span class="pill ok">verlinkt</span>');
    return `<li>${esc(r.t)} <span class="muted small">· ${esc(r.p)}</span> ${st}</li>`}).join('');
  return `<div class="card"><h3>Schola-Gesänge im Plan</h3>${li?`<ul class="small" style="margin:6px 0 0;padding-left:18px">${li}</ul>`:'<p class="small muted" style="margin:6px 0 0">Im Ablauf sind noch keine Schola-Gesänge (Typ «Schola») eingetragen.</p>'}</div>`}
function regCard(ev,t){
  if(!ev.c) return '';
  const as=assignedTo(ev.c), dr=dropped(ev.c), ro=!canEdit();
  const inPlan=r=>t.rows.some(x=>x.k==='G'&&(sameT(x.t,r.name)||sameT(x.t,r.orig)));
  const inf=t.regInfo||{add:[],del:[]};
  const list=as.map(r=>`<li>${esc(r.name)} <span class="muted small">· ${esc(chantPos(r))}</span> ${inPlan(r)?'<span class="pill ok">im Plan</span>':(ro?'<span class="pill warn">nicht im Plan</span>':`<button class="btn sm" data-add="${esc(r.key)}">+ in Plan</button>`)}</li>`).join('');
  const names=REG().filter(r=>!r.hide&&/^Schola/.test(r.art)).map(r=>r.name);
  return `<div class="card"><h3>Gesänge für «${esc(ev.c)}»</h3>
   <p class="small muted" style="margin:4px 0 8px">Im Register diesem Fest zugeordnete Gesänge werden bei neuen Plänen (Vorschlag, Vorlage laden) automatisch eingesetzt.</p>
   ${inf.add.length||inf.del.length?`<p class="note small" style="margin:0 0 8px">Aus dem Register angepasst: ${inf.add.length?'eingesetzt: '+esc(inf.add.join(', ')):''}${inf.add.length&&inf.del.length?' · ':''}${inf.del.length?'entfernt: '+esc(inf.del.join(', ')):''}</p>`:''}
   ${list?`<ul class="small" style="margin:0 0 8px;padding-left:18px">${list}</ul>`:'<p class="small muted">Noch keine Gesänge fest zugeordnet.</p>'}
   ${dr.length?`<p class="small muted">Bewusst nicht mehr zugeordnet: ${esc(dr.map(r=>r.name).join(', '))}</p>`:''}
   ${ro?'':`<div class="fields" style="align-items:end"><label style="grid-column:span 2"><span>Gesang diesem Fest zuordnen</span><input type="text" id="rcn" list="rcl" placeholder="Incipit wählen oder tippen"><datalist id="rcl">${names.map(n=>`<option value="${esc(n)}">`).join('')}</datalist></label><label><span>Position</span><select id="rcp">${POSS.map(x=>`<option ${x==='Communio'?'selected':''}>${x}</option>`).join('')}</select></label></div><button class="btn sm" id="rca" style="margin-top:6px">Zuordnen + in Plan einsetzen</button>`}
  </div>`}
function previewHTML(ev,t){
  const sch=S.prev==='schola'&&canSchola();
  const reg=sch?REG():[];
  const rows=t.rows.filter(r=>r.t||r.n||r.k==='O');
  let h=`<div class="paper">${sch?'<div class="intern">Intern · Scholaplan</div>':''}<h3>${esc(ev.n)}</h3><div class="sub">${wdOf(ev.d)}, ${fmtD(ev.d)}${t.sch&&t.sch!=='keine'?' · Schola: '+esc(t.sch):''}</div>`;
  if(!rows.length) return h+'<p class="sub">Noch keine Zeilen.</p></div>';
  h+='<table>';
  rows.forEach(r=>{
    if(sch&&r.k==='L'&&!/Kyrie|Gloria|Credo|Sanctus|Agnus|Asperges|Vidi|Introit|Graduale|Communio|Offert/i.test(r.p)) {}
    let extra='';
    if(sch&&isChant(r)){
      const c=lookupChant(r,reg);
      const lk=[];
      if(c&&c.cn) lk.push(lnkHtml(lnkStr(linksFor(c.cn,r.p)),'Choral'));
      if(c&&c.yt) lk.push(lnkHtml(c.yt,'YouTube'));
      if(c&&showNt()) lk.push(`<a href="${esc(ntUrl(c.name,c,r.p))}" target="_blank" rel="noopener">Notator</a>`);
      if(!c) lk.push('<span style="color:#a8322d">nicht im Register</span>');
      else if(!c.cn&&!c.yt) lk.push('<span style="color:#888">Links fehlen</span>');
      extra=`<span class="lk">${lk.join('')}</span>`;
      if(S.organ&&canOrgan()){
        if(c&&c.on) extra+=`<span class="org">${lnkHtml(lnkStr(linksFor(c.on,r.p)),'Orgel')}</span>`;
      }
    }
    if(sch&&S.organ&&canOrgan()&&r.o) extra+=`<span class="org">Orgel: ${esc(r.o)}</span>`;
    h+=`<tr><td class="p">${esc(r.p)}</td><td class="n">${esc(rowNr(r))}</td><td>${esc(rowTitle(r))}${extra}</td></tr>`;
  });
  return h+'</table></div>';
}
function ask(title,text,btns){return new Promise(res=>{
  const o=document.createElement('div');o.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
  const b=document.createElement('div');b.style.cssText='background:var(--surface);color:var(--ink);max-width:520px;width:100%;border-radius:10px;padding:18px;box-shadow:0 8px 30px rgba(0,0,0,.3);border:1px solid #8884';
  b.innerHTML='<h3 style="margin:0 0 8px">'+esc(title)+'</h3><p class="small" style="margin:0 0 14px">'+esc(text)+'</p>';
  const w=document.createElement('div');w.style.cssText='display:flex;flex-direction:column;gap:8px';
  btns.forEach(x=>{const e=document.createElement('button');e.className='btn'+(x.pri?' pri':'');e.textContent=x.t;e.style.textAlign='left';e.onclick=()=>{o.remove();res(x.k)};w.appendChild(e)});
  b.appendChild(w);o.appendChild(b);o.onclick=ev=>{if(ev.target===o){o.remove();res('no')}};document.body.appendChild(o);});}
function bindTermin(){
  const ev=S.sel&&evByKey[S.sel];
  if(!ev){
    const a=$('#fadd'); if(a) a.onclick=()=>{
      const d=$('#fd').value,n=$('#fn').value.trim(); if(!d||!n){toast('Datum und Bezeichnung eingeben');return}
      const e={d,n,a:'Sonderanlass',c:null,note:'',kj:S.kj,key:d+'|'+n,i:EV.length};
      EV.push(e);evByKey[e.key]=e;S.sel=e.key;render();
    };
    return;
  }
  let t=getTermin(ev);
  const commit=()=>{if(canEdit()){if(t.rows.length){t.vars=t.vars||{};t.vars[t.sch]={rows:JSON.parse(JSON.stringify(t.rows)),tpl:t.tpl||''}}setTermin(ev,t)}};
  window._rsI=null;drawSheet(ev,t);
  drawRows(ev,t); const pv=()=>{$('#prev').innerHTML=previewHTML(ev,t);$('#abg').innerHTML=abgCard(ev,t)}; pv();
  window._rsCtx={commit,pv,ev,t};
  const rvNow=()=>LS.get('sp.rv',innerWidth<=900?'list':'table');
  const rvApply=()=>{const tv=$('.tv');if(tv)tv.dataset.rv=rvNow();const b=$('#rvt');if(b)b.textContent=rvNow()==='list'?'Tabelle':'Liste'};
  rvApply();$('#rvt').onclick=()=>{LS.set('sp.rv',rvNow()==='list'?'table':'list');rvApply()};
  $('#edl').onclick=e=>{const b=e.target.closest('.rl');if(!b)return;window._rsI=+b.dataset.i;drawSheet(ev,t,true)};
  $('#back').onclick=()=>{S.tab='kj';render()};
  document.querySelectorAll('[data-tsub]').forEach(b=>b.onclick=()=>{S.tsub=b.dataset.tsub;const tv=$('.tv');if(tv)tv.dataset.tsub=S.tsub;document.querySelectorAll('[data-tsub]').forEach(x=>{if(x.tagName==='BUTTON')x.setAttribute('aria-pressed',x.dataset.tsub===S.tsub)})});
  const kd=$('#kopfd'); if(kd) kd.ontoggle=()=>{if(innerWidth<=560)S.kopf=kd.open};
  const sch=$('#sch'); if(sch){sch.onchange=async e=>{
      const to=e.target.value, from=t.sch; if(to===from) return;
      t.vars=t.vars||{};
      if(t.rows.length) t.vars[from]={rows:JSON.parse(JSON.stringify(t.rows)),tpl:t.tpl||''};
      const load=(v,msg)=>{t.sch=to;t.schaSet=true;t.rows=JSON.parse(JSON.stringify(v.rows));t.tpl=v.tpl||'';if(t.status==='offen'||t.status==='Vorschlag')t.status='Entwurf';commit();render();toast(msg)};
      if(t.vars[to]&&t.vars[to].rows&&t.vars[to].rows.length){load(t.vars[to],'Version «'+to+'» geladen');return}
      if(!t.rows.length||to==='keine'){t.sch=to;t.schaSet=true;commit();pv();return}
      const arch=bestPlans(ev.c,to).filter(p=>p.s===to)[0];
      const ordRows=t.rows.filter(r=>/^(Asperges|Kyrie|Gloria|Credo|Sanctus|Agnus|Ite)/i.test(r.p||''));
      const btns=[{k:'new',t:'Neue Version «'+to+'» anlegen'+(to==='Frauen'?' (Asperges + Messordinarium)':' (Kopie)'),pri:1}];
      if(arch) btns.push({k:'arch',t:'Archiv-Vorlage «'+to+'» laden: '+planLabel(arch)});
      btns.push({k:'same',t:'Nur Schola umstellen (gleiche Zeilen)'},{k:'no',t:'Abbrechen'});
      const a=await ask('Neue Version für «'+to+'»?','Für «'+to+'» ist bei diesem Termin noch keine eigene Version abgelegt. Die Version «'+from+'» bleibt erhalten und lässt sich jederzeit über das Schola-Feld wieder wählen.',btns);
      if(a==='new'){const rows=(to==='Frauen'&&ordRows.length)?ordRows:t.rows;load({rows,tpl:t.tpl},'Neue Version «'+to+'» angelegt');}
      else if(a==='arch'){t.sch=to;t.schaSet=true;applyTemplate(ev,t,arch.id);commit();render();toast('Archiv-Vorlage «'+to+'» geladen')}
      else if(a==='same'){t.sch=to;t.schaSet=true;commit();render();toast('Schola umgestellt')}
      else{e.target.value=from}
    };
    $('#st').onchange=e=>{t.status=e.target.value;commit()};
    $('#tpl').onchange=e=>{
      const v=e.target.value; if(!v) return;
      if(v.startsWith('c:')){const c=v.slice(2);const l=bestPlans(c,t.sch);if(!l.length){toast('Kein Plan zu diesem Festtyp');return}
        const o=$('#tpl');o.innerHTML=`<optgroup label="${esc(c)}">${l.map(p=>`<option value="${p.id}">${esc(planLabel(p))}</option>`).join('')}</optgroup>`;toast('Jetzt Plan wählen');return}
      if(t.rows.length&&!t._ok){t._ok=true;toast('Vorhandene Zeilen werden ersetzt. Nochmals wählen zum Bestätigen.');e.target.value='';return}
      t._ok=false;applyTemplate(ev,t,v);commit();render();toast('Vorlage geladen');
    };
    const tn=$('#tnote'); if(tn) tn.oninput=e=>{t.note=e.target.value;commit()};
    if($('#addrow'))$('#addrow').onclick=()=>{t.rows.push({p:'',b:'SR',n:'',v:'',t:'',k:'L',o:''});if(t.status==='offen'||t.status==='Vorschlag')t.status='Entwurf';commit();drawRows(ev,t);pv();if(rvNow()==='list'){window._rsI=t.rows.length-1;drawSheet(ev,t,true)}};
    if($('#addg'))$('#addg').onclick=()=>{t.rows.push({p:'Communio',b:'',n:'',v:'',t:'',k:'G',o:''});if(t.status==='offen'||t.status==='Vorschlag')t.status='Entwurf';commit();drawRows(ev,t);pv();if(rvNow()==='list'){window._rsI=t.rows.length-1;drawSheet(ev,t,true)}};
    $('#edb').oninput=e=>{const tr=e.target.closest('tr');if(!tr||!e.target.dataset.f)return;const r=t.rows[+tr.dataset.i];r[e.target.dataset.f]=e.target.value;if(t.status==='offen'||t.status==='Vorschlag')t.status='Entwurf';commit();pv()};
    $('#edb').onchange=e=>{if(e.target.dataset.f==='n'){const tr=e.target.closest('tr');const r=t.rows[+tr.dataset.i];const n=String(r.n||'').trim();
        if(n&&r.k!=='G'){const c=titleForNr(r.b,n);if(c.length===1){if(r.t!==c[0]){r.t=c[0];r.v=r.v||'';commit();drawRows(ev,t);pv();toast('Titel aus Liederverzeichnis: '+c[0])}}else if(c.length>1)toast('Nr. '+n+' ist mehrdeutig – Titel bitte wählen')}
        return}
      if(e.target.dataset.f==='t'){const tr=e.target.closest('tr');const r=t.rows[+tr.dataset.i];const x=(CAT[r.k]||new Map()).get(e.target.value);if(x){r.t=x.t;if(r.k!=='G'){r.b=x.b;r.n=x.n;r.v=''}commit();drawRows(ev,t);pv()}return}if(e.target.dataset.f==='k'||e.target.dataset.f==='b'){const tr=e.target.closest('tr');const r=t.rows[+tr.dataset.i];r[e.target.dataset.f]=e.target.value;commit();drawRows(ev,t);pv()}};
    $('#edb').onclick=e=>{const b=e.target.closest('button[data-a]');if(!b)return;const i=+b.closest('tr').dataset.i;
      if(b.dataset.a==='sho'||b.dataset.a==='shnr'){const tr=b.closest('tr');tr.querySelectorAll(b.dataset.a==='sho'?'.c-o':'.c-book,.c-nr,.c-v').forEach(x=>x.classList.remove('mhid'));b.closest('details').open=false;const f=tr.querySelector(b.dataset.a==='sho'?'.c-o input':'.c-nr input');if(f)f.focus();return}
      if(b.dataset.a==='del')t.rows.splice(i,1);
      if(b.dataset.a==='up'&&i>0)[t.rows[i-1],t.rows[i]]=[t.rows[i],t.rows[i-1]];
      if(b.dataset.a==='dn'&&i<t.rows.length-1)[t.rows[i+1],t.rows[i]]=[t.rows[i],t.rows[i+1]];
      commit();drawRows(ev,t);pv()};
    window._rsCtx.h={i:$('#edb').oninput,c:$('#edb').onchange};
  }

  const drawRegc=()=>{const e=$('#regc');if(e)e.innerHTML=schPlanCard(ev,t)+(ev.c?regCard(ev,t):'<div class="card"><p class="small muted" style="margin:0">Diesem Termin ist kein Fest im Register zugeordnet.</p></div>')};drawRegc();
  const regc=$('#regc'); if(regc){
    regc.onclick=e=>{const b=e.target.closest('[data-add]');if(!b)return;const r=REG().find(x=>x.key===b.dataset.add);if(!r)return;
      insertChant(t.rows,r);if(t.status==='offen'||t.status==='Vorschlag')t.status='Entwurf';commit();drawRows(ev,t);pv();drawRegc()};
    regc.onchange=e=>{};
    regc.addEventListener('click',e=>{if(e.target.id!=='rca')return;const nm=$('#rcn').value.trim(),po=$('#rcp').value;if(!nm){toast('Gesang wählen');return}
      const r=REG().find(x=>!x.hide&&(x.name===nm||x.orig===nm));if(!r){toast('Nicht im Register – zuerst im Reiter «Gesänge» anlegen');return}
      const o=S.reg[r.key]=S.reg[r.key]||{};const fe=(Array.isArray(o.fe)?o.fe:r.fe0).slice();if(!fe.includes(ev.c))fe.push(ev.c);o.fe=fe;if(po!==chantPos(r)||!r.po)o.po=po;
      save();regPut(r.key);for(const k in AUTO)delete AUTO[k];
      const r2=REG().find(x=>x.key===r.key);insertChant(t.rows,r2);if(t.status==='offen'||t.status==='Vorschlag')t.status='Entwurf';commit();drawRows(ev,t);pv();drawRegc();toast('«'+r.name+'» ist jetzt «'+ev.c+'» zugeordnet')})}
  document.querySelectorAll('[data-prev]').forEach(b=>b.onclick=()=>{S.prev=b.dataset.prev;render()});
  const og=$('#organ'); if(og) og.onchange=e=>{S.organ=e.target.checked;LS.set('sp.organ',S.organ);pv()};
  const nv=$('#nver'); if(nv) nv.onchange=e=>{S.nver=e.target.checked;LS.set('sp.nver',S.nver);pv()};
  $('#copy').onclick=async()=>{const tx=planText(ev,t);try{await navigator.clipboard.writeText(tx);toast('Liederplan kopiert')}catch(e){const ta=document.createElement('textarea');ta.value=tx;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');toast('Liederplan kopiert')}catch(_){toast('Kopieren nicht möglich')}ta.remove()}};
  $('#pdf').onclick=()=>makePdf(ev,t,S.prev==='schola'&&canSchola());
  $('#play').onclick=()=>playOpen(ev.key);
}

/* --- Abgleich Vorschlag / tatsächlicher Plan --- */
const pkey=p=>norm(p).replace(/^lied /,'').replace(/^zum /,'').replace(/^zur /,'');
const sig=r=>r.k==='O'?(r.t&&!/^orgel/i.test(r.t)?'o:'+norm(r.t).slice(0,16):'orgel'):r.k==='G'?'g:'+norm(r.t).slice(0,18):((r.b||'SR')+' '+norm(r.n||r.t)).trim();
const show=r=>r?((rowNr(r)+' '+rowTitle(r)).trim()||'–'):'–';
function cmpRows(cur,prop){
  const a=cur.filter(r=>r.t||r.n||r.k==='O'), b=prop.filter(r=>r.t||r.n||r.k==='O'); const used=new Set(); const out=[]; let same=0;
  a.forEach(r=>{
    let j=b.findIndex((x,i)=>!used.has(i)&&pkey(x.p)===pkey(r.p));
    if(j<0) j=b.findIndex((x,i)=>!used.has(i)&&sig(x)===sig(r)&&sig(r)!=='orgel');
    if(j<0){out.push({p:r.p,a:r,b:null,st:'fehlt'});return}
    used.add(j); const ok=sig(b[j])===sig(r); if(ok)same++;
    out.push({p:r.p,a:r,b:b[j],st:ok?'gleich':'anders'});
  });
  b.forEach((x,i)=>{if(!used.has(i))out.push({p:x.p,a:null,b:x,st:'nur Vorschlag'})});
  return {same,total:a.length,out,score:a.length?same/a.length:0};
}
function abgCard(ev,t){
  const pp=ev.pid&&planById[ev.pid]; if(!pp||t.src==='vorschlag'||!t.rows.length) return '';
  const c=cmpRows(t.rows,pp.r.map(rowFromArr));
  const rows=c.out.filter(x=>x.st!=='gleich');
  return `<div class="card" style="margin-top:14px"><h3>Abgleich mit Vorschlag</h3>
   <p class="small">${c.same} von ${c.total} Positionen stimmen überein (${Math.round(c.score*100)} %). Vorschlag: <a href="https://drive.google.com/file/d/${pp.id}/view" target="_blank" rel="noopener">${esc(planLabel(pp))}</a></p>
   ${rows.length?`<div class="tw"><table><thead><tr><th>Position</th><th>Dein Plan</th><th>Vorschlag</th></tr></thead><tbody>${rows.map(x=>`<tr><td class="small">${esc(x.p)}</td><td class="small">${x.a?esc(show(x.a)):'<span class="muted">–</span>'}</td><td class="small">${x.b?esc(show(x.b)):'<span class="muted">–</span>'}</td></tr>`).join('')}</tbody></table></div>`:'<p class="small">Keine Abweichungen.</p>'}</div>`;
}
function abgData(){
  return EV.filter(e=>e.kj==='2025/26'&&e.pid).map(e=>{
    const t=getTermin(e); if(t.src==='vorschlag'||!t.rows.length) return null;
    const c=cmpRows(t.rows,planById[e.pid].r.map(rowFromArr)); return {e,c,t};
  }).filter(Boolean);
}
function viewAbg(){
  const l=abgData(); const tot=l.reduce((s,x)=>s+x.c.total,0), same=l.reduce((s,x)=>s+x.c.same,0);
  const open=EV.filter(e=>e.kj==='2025/26'&&e.pid&&getTermin(e).src==='vorschlag'&&e.d>=new Date().toISOString().slice(0,10)).length;
  return `<div class="card"><h2>Abgleich Kirchenjahr 2025/26</h2>
   <p class="small">Der Vorschlag wurde nur aus Plänen vor dem 30.11.2025 gebildet (Vorjahr bevorzugt, Männerschola, Standard-Variante). Verglichen wird mit dem tatsächlichen Plan: bei vergangenen Terminen aus dem Archiv (Zuordnung über Datum bzw. Änderungsdatum der Datei, deshalb nur ein Teil der Termine), bei den kommenden Wochen mit dem Plan, den du im Reiter «Termin» erfasst.</p>
   <p><b>${l.length}</b> Termine verglichen · <b>${tot?Math.round(same/tot*100):0} %</b> der Positionen identisch (${same} von ${tot}) · ${open} kommende Termine noch ohne eigenen Plan</p></div>
   <div class="tw" style="margin-top:14px"><table><thead><tr><th>Datum</th><th>Fest</th><th class="num">Treffer</th><th class="num">Positionen</th><th></th></tr></thead><tbody>
   ${l.sort((a,b)=>a.e.d.localeCompare(b.e.d)).map(x=>`<tr class="row-ev" tabindex="0" data-key="${esc(x.e.key)}" style="--lc:${lcolor(x.e)}"><td class="num">${fmtD(x.e.d)}</td><td><span class="sw"></span>${esc(x.e.n)}</td><td class="num">${Math.round(x.c.score*100)} %</td><td class="num">${x.c.same} / ${x.c.total}</td><td class="small muted">${x.t.src==='archiv'?'Archiv':'erfasst'}</td></tr>`).join('')||'<tr><td colspan="5" class="muted">Noch keine vergleichbaren Termine.</td></tr>'}
   </tbody></table></div>`;
}
function bindAbg(){const open=el=>{const tr=el.closest('tr.row-ev');if(tr){S.sel=tr.dataset.key;S.tab='termin';render();scrollTo(0,0)}};
  const tb=document.querySelector('#view tbody');tb.onclick=e=>open(e.target);tb.onkeydown=e=>{if(e.key==='Enter')open(e.target)}}

/* --- PDF --- */
function lat(s){return String(s==null?'':s).normalize('NFC').replace(/[‘’´`]/g,"'").replace(/[“”„]/g,'"').replace(/[–—]/g,'-').replace(/[^\u0000-ÿ]/g,c=>{const b=c.normalize('NFD').replace(/[̀-ͯ]/g,'');return /^[\u0000-ÿ]*$/.test(b)?b:'?'})}
async function makePdf(ev,t,intern){
  if(!window.jspdf){toast('PDF-Bibliothek nicht geladen');return}
  const doc=new window.jspdf.jsPDF({unit:'mm',format:'a4'});
  const W=210,M=18; let y=24;
  const reg=intern?REG():[];
  const pageBreak=n=>{if(y+n>280){doc.addPage();y=22}};
  if(intern){doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(168,50,45);doc.text('INTERN - SCHOLAPLAN',M,y-8);}
  doc.setTextColor(20);doc.setFont('times','bold');doc.setFontSize(20);doc.text(lat(ev.n),M,y);y+=8;
  doc.setFont('helvetica','normal');doc.setFontSize(10);doc.setTextColor(90);
  doc.text(lat(`${wdOf(ev.d)}, ${fmtD(ev.d)}${t.sch&&t.sch!=='keine'?'   |   Schola: '+t.sch:''}   |   St. Pelagiberg`),M,y);y+=9;
  doc.setDrawColor(180);doc.line(M,y-3,W-M,y-3);
  const rows=t.rows.filter(r=>r.t||r.n||r.k==='O');
  rows.forEach(r=>{
    const title=lat(rowTitle(r)); const nr=lat(rowNr(r));
    const lines=doc.setFont('times','normal').setFontSize(12).splitTextToSize(title,W-M-M-62);
    const c=intern&&isChant(r)?lookupChant(r,reg):null;
    const extra=[];
    if(intern&&isChant(r)){ if(c&&c.cn)linksFor(c.cn,r.p).forEach((x,i,a)=>extra.push([x.l||(a.length>1?'Choral '+(i+1):'Choral'),x.u]));if(c&&showNt())extra.push(['Notator',ntUrl(c.name,c,r.p)]); if(c&&c.yt)parseLinks(c.yt).forEach(x=>extra.push([x.l||'YouTube',x.u])); if(S.organ&&canOrgan()&&c&&c.on)linksFor(c.on,r.p).forEach((x,i,a)=>extra.push([x.l||'Orgel',x.u]));}
    const orgn=intern&&S.organ&&canOrgan()&&r.o;
    pageBreak(lines.length*5.5+extra.length*0+(orgn?5:0)+6);
    doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(100);doc.text(lat(r.p).toUpperCase().slice(0,22),M,y);
    doc.setFont('helvetica','bold');doc.setFontSize(11);doc.setTextColor(20);doc.text(nr,M+38,y);
    doc.setFont('times','normal');doc.setFontSize(12);doc.text(lines,M+62,y);
    y+=lines.length*5.2;
    if(extra.length){let x=M+62;doc.setFont('helvetica','normal');doc.setFontSize(9);
      extra.forEach(([l,u])=>{doc.setTextColor(28,60,156);doc.textWithLink(l,x,y,{url:u});x+=doc.getTextWidth(l)+6});y+=4.5;}
    if(intern&&r.k==='G'&&!c){doc.setFont('helvetica','italic');doc.setFontSize(9);doc.setTextColor(168,50,45);doc.text('nicht im Register',M+62,y);y+=4.5}
    if(orgn){doc.setFont('helvetica','italic');doc.setFontSize(9);doc.setTextColor(106,63,158);doc.text(lat('Orgel: '+r.o),M+62,y);y+=4.5}
    y+=2.2;
  });
  const name=lat(`${intern?'Scholaplan':'Liederplan'} ${ev.d} ${ev.n}`).replace(/[^\w\- .]+/g,'').replace(/\s+/g,'_')+'.pdf';
  const buf=doc.output('arraybuffer');
  try{doc.save(name);toast('PDF gespeichert')}catch(e){toast('PDF konnte nicht gespeichert werden')}
}

