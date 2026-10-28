/* --- Daten & Hilfe --- */
function viewDaten(){
  const nT=Object.keys(S.termine).length;
  const unsure=EV.filter(e=>/UNSICHER/.test(e.note));
  return `<div class="grid2"><div>
   <div class="card"><h2>Stand</h2><p class="small">Datenbank-Stand ${fmtD(D.stand)}: ${D.plans.length} Pläne, ${EV.length} Termine (Kirchenjahre ${[...new Set(EV.map(e=>e.kj))].join(', ')}), ${D.chants.length} Choralgesänge, ${D.hym.length} Liederbuch-Nummern.</p>
     <p class="small">In diesem Browser gespeichert: ${nT} bearbeitete Termine, ${Object.keys(S.reg).length} Register-Einträge, ${S.custom.length} eigene Gesänge.</p>
     <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn pri" id="exp">Eigene Änderungen exportieren (JSON)</button>
     ${canEdit()?'<label class="btn">Importieren<input type="file" id="imp" accept=".json,application/json" hidden></label>':''}</div>
     <p class="hint">Änderungen bleiben nur in diesem Browser. Zum Teilen mit anderen: Export als JSON, andere importieren die Datei. Eine gemeinsame Datenhaltung (Google Sheet) kommt als nächster Schritt.</p></div>
   ${verlaufCard()}
   ${offlineCard()}
   ${kjCard()}
   ${canEdit()?`<div class="card"><h2>Sammel-PDFs aufteilen</h2><p class="small">Teilt die Sammel-PDFs (Allerheiligen, Weihnachten Tagesmesse, Gründonnerstag, Osternacht, Ostersonntag, 1. und 4. Advent, Reminiscere, 3. So. n. Epiphanie, Rosenkranzsonntag) in Einzel-PDFs pro Gesang, legt sie im selben Drive-Ordner ab und ergänzt die Choral-/Orgel-Links der Gesänge (fehlende Einträge werden angelegt). Mehrfaches Ausführen ist unschädlich.</p><button class="btn pri" id="ahsplit">Aufteilen &amp; verlinken</button><div class="small" id="ahres" style="margin-top:8px"></div></div>
   <div class="card"><h2>Ordner-Dateien verlinken</h2><p class="small">Verlinkt PDFs aus dem Drive-Hauptordner, die noch bei keinem Gesang hinterlegt sind (ca. 40), und legt dafür fehlende Einträge an. Mehrfaches Ausführen ist unschädlich.</p><button class="btn pri" id="lnksplit">Nachtragen</button><div class="small" id="lnkres" style="margin-top:8px"></div></div>`:''}
   <div class="card"><h2>Noch zu bestätigen</h2><div class="small">${unsure.filter(e=>e.kj==='2026/27'||e.gen).map(e=>`<p style="margin:6px 0"><b>${fmtD(e.d)} ${esc(e.n)}</b><br><span class="muted">${esc(e.note)}</span></p>`).join('')||'–'}</div></div>
  </div><div>
   <div class="card"><h2>So funktioniert es</h2>
    <p class="small"><b>Kirchenjahr</b>: alle Termine mit Farbstreifen der liturgischen Farbe. Klick öffnet den Termin.</p>
    <p class="small"><b>Termin</b>: Vorlage aus dem Archiv laden, Zeilen anpassen. Rechts die Vorschau: <i>Liederplan</i> (öffentlich, ohne Links) oder <i>Scholaplan</i> (mit Choralnoten und YouTube, optional Orgelnoten). PDF und Text-Export.</p>
    <p class="small"><b>Gesänge (Choral)</b>: Register der liturgischen Gesänge. Hier pflegst du Links zu Choralnoten, YouTube und Organistennoten. Sie erscheinen im Scholaplan, wenn der Titel passt.</p>
    <p class="small"><b>Liederbuch</b>: alle Nummern aus den Plänen, Standard Salve Regina.</p>
   </div>
   <div class="card"><h2>Bekannte Lücken</h2><p class="small">Einige Pläne (Maiandachten, Hochzeiten, Requiem, Jugend, Mariä Opferung, 7 Schmerzen) waren als .odt nicht lesbar. Die Zuordnung der Vorlage zum Fest ist automatisch und kann abweichen. Liturgische Farbe ist eine Näherung. Daten der lokalen Feste sind teils unbestätigt.</p></div>
  </div></div>`;
}
function bindDaten(){
  const lnb=$('#lnksplit'); if(lnb) lnb.onclick=async()=>{lnb.disabled=true;try{await linkFolderFiles($('#lnkres'))}catch(e){$('#lnkres').innerHTML+='<b style="color:#a8322d">Fehler: '+esc(e&&e.message||e)+'</b>'}lnb.disabled=false};
  const ahb=$('#ahsplit'); if(ahb) ahb.onclick=async()=>{ahb.disabled=true;try{await splitSammel($('#ahres'))}catch(e){$('#ahres').innerHTML+='<b style="color:#a8322d">Fehler: '+esc(e&&e.message||e)+'</b>'}ahb.disabled=false};
  $('#exp').onclick=async()=>{const data=JSON.stringify({v:1,termine:S.termine,reg:S.reg,custom:S.custom},null,1);
    try{dlText('schola-planer-aenderungen.json',data);toast('Exportiert')}catch(e){toast('Export nicht möglich')}};
  const impEl=$('#imp');if(impEl)impEl.onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{overlayState(JSON.parse(r.result));toast('Importiert');render()}catch(err){toast('Datei nicht lesbar')}};r.readAsText(f)};
  bindVerlauf();bindOffline();bindKjCard();
}

function kjCard(){
  const nx=kjLabel((KJX.kjs.length?parseInt(KJX.kjs[KJX.kjs.length-1],10):Math.max(...EV.filter(e=>!e.gen).map(e=>parseInt(e.kj,10))))+1);
  return `<div class="card"><h2>Kirchenjahr fortschreiben</h2><p class="small">Neue Kirchenjahre werden automatisch aus den Regeln der vorhandenen Jahre berechnet (Ostertermin, feste Daten, Advent, Epiphanie-/Pfingstsonntage, Quatember, erste Freitage/Samstage) und etwa 14 Monate im Voraus angehängt. Alle Termine daraus sind mit «automatisch fortgeschrieben» markiert; unsichere Fälle stehen unter «Noch zu bestätigen».</p>
  <p class="small muted">${KJX.kjs.length?'Aktuell berechnet: '+KJX.kjs.join(', '):'Zurzeit nicht nötig – die Basisdaten reichen noch weit genug.'}${KJX.miss.length?'<br>Keine Regel ableitbar (nicht angelegt): '+esc(KJX.miss.join('; ')):''}</p>
  <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="kjnext">${nx} jetzt vorausberechnen</button>${LS.get('sp.kjx',0)?'<button class="btn" id="kjreset">Zurück zur Automatik</button>':''}</div></div>`}
function bindKjCard(){
  const a=$('#kjnext');if(a)a.onclick=()=>{LS.set('sp.kjx',LS.get('sp.kjx',0)+1);location.reload()};
  const r=$('#kjreset');if(r)r.onclick=()=>{LS.set('sp.kjx',0);location.reload()}}

/* ---------- Backup (Drive-Schnappschuss) + Änderungsverlauf ---------- */
const BK_PRE='Schola-Planer-Backup-';
function overlayState(j){
  Object.assign(S.termine,j.termine||{});Object.assign(S.reg,j.reg||{});
  (j.custom||[]).forEach(c=>{if(!S.custom.some(x=>x.art===c.art&&x.name===c.name&&(x.nr||'')===(c.nr||'')))S.custom.push(c)});
  save();Object.keys(j.termine||{}).forEach(k=>dbPut('termine',k));Object.keys(j.reg||{}).forEach(k=>dbPut('register',k));if((j.custom||[]).length)dbPut('eigene','*');
  for(const a in AUTO)delete AUTO[a]}
async function makeBackup(auto){
  const d=new Date(),p=n=>String(n).padStart(2,'0');
  const name=BK_PRE+d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'_'+p(d.getHours())+p(d.getMinutes())+'.json';
  await GD.writeJson(name,{v:2,at:d.toISOString(),termine:S.termine,reg:S.reg,custom:S.custom});
  LS.set('sp.bk',Date.now());return name}
async function autoBackup(){
  try{if(READONLY||!GD.cached())return;
    if(!Object.keys(S.termine).length&&!Object.keys(S.reg).length&&!S.custom.length)return;
    if(Date.now()-LS.get('sp.bk',0)<7*864e5)return;
    const n=await makeBackup(true);toast('Wöchentliches Backup angelegt: '+n)}catch(e){console.warn('autoBackup',e)}}
const fmtDT=ms=>{const d=new Date(ms),p=n=>String(n).padStart(2,'0');return p(d.getDate())+'.'+p(d.getMonth()+1)+'. '+p(d.getHours())+':'+p(d.getMinutes())};
function verlaufHtml(){
  const h=LS.get('sp.hist',[]);
  if(!h.length)return '<p class="small muted">Noch keine Änderungen in diesem Browser.</p>';
  return '<div style="max-height:320px;overflow:auto">'+h.slice(0,40).map((e,i)=>`<div class="chkg" style="display:flex;gap:8px;align-items:center;justify-content:space-between"><span class="small"><b>${esc(e.l)}</b><br><span class="muted">${fmtDT(e.ms)} · ${e.c==='termine'?'Termin':'Gesang'}${e.b===null?' · neu angelegt':''}</span></span>${canEdit()&&!(e.b===null&&e.c==='termine')?`<button class="btn sm" data-undo="${i}">Zurücksetzen</button>`:''}</div>`).join('')+'</div>'}
function verlaufCard(){return `<div class="card"><h2>Änderungsverlauf</h2><p class="small">Die letzten Änderungen an Terminen und Gesängen (nur in diesem Browser). «Zurücksetzen» stellt den Stand vor der Änderung wieder her; das wird selbst wieder als Änderung festgehalten.</p><div id="verl">${verlaufHtml()}</div></div>
 <div class="card"><h2>Backup</h2><p class="small">Schnappschuss aller Termine, Register-Einträge und eigenen Gesänge als Datei im Notator-Ordner in Google Drive (${LS.get('sp.bk',0)?'letztes Backup: '+fmtDT(LS.get('sp.bk',0)):'noch keins'}). Automatisch höchstens einmal pro Woche beim Öffnen.</p>
 <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn pri" id="bknow">Backup jetzt anlegen</button><button class="btn" id="bklist">Backups anzeigen</button></div><div class="small" id="bkres" style="margin-top:8px"></div></div>`}
function bindVerlauf(){
  const v=$('#verl');if(v)v.onclick=e=>{const b=e.target.closest('[data-undo]');if(!b)return;
    if(histUndo(+b.dataset.undo)){toast('Zurückgesetzt');v.innerHTML=verlaufHtml();if(S.tab!=='daten')render()}else toast('Nicht möglich')};
  const bn=$('#bknow');if(bn)bn.onclick=async()=>{const r=$('#bkres');bn.disabled=true;
    try{if(!GD.cached())throw new Error('Nicht bei Google angemeldet');const n=await makeBackup();r.innerHTML='Angelegt: <b>'+esc(n)+'</b>'}catch(e){r.innerHTML='<b style="color:#a8322d">Fehler: '+esc(e&&e.message||e)+'</b>'}bn.disabled=false};
  const bl=$('#bklist');if(bl)bl.onclick=async()=>{const r=$('#bkres');bl.disabled=true;r.textContent='Lade …';
    try{const f=(await GD.list('Backup')).filter(x=>x.name.startsWith(BK_PRE));
      r.innerHTML=f.length?f.slice(0,20).map(x=>`<div class="chkg" style="display:flex;gap:8px;align-items:center;justify-content:space-between"><span>${esc(x.name.replace(BK_PRE,'').replace('.json','').replace('_',' '))}</span>${canEdit()?`<button class="btn sm" data-rest="${x.id}">Wiederherstellen</button>`:''}</div>`).join('')+'<p class="hint">Wiederherstellen überlagert den aktuellen Stand: Einträge aus dem Backup ersetzen gleichnamige aktuelle, neuere Einträge, die im Backup fehlen, bleiben.</p>':'Keine Backups gefunden.';
      r.onclick=async ev=>{const b=ev.target.closest('[data-rest]');if(!b)return;if(!confirm('Backup wiederherstellen? Gleichnamige Einträge werden überschrieben.'))return;
        b.disabled=true;try{overlayState(await GD.readJson(b.dataset.rest));toast('Wiederhergestellt');render()}catch(er){r.innerHTML+='<b style="color:#a8322d">Fehler: '+esc(er&&er.message||er)+'</b>'}}}
    catch(e){r.innerHTML='<b style="color:#a8322d">Fehler: '+esc(e&&e.message||e)+'</b>'}bl.disabled=false};
}

