/* ---------- Onboarding: Personen Zugriff auf Drive-Ordner geben (nur Besitzer) ----------
   Drei getrennte Ebenen, je «–» / Lesen / Bearbeiten:
   · Liturgie  = Ordner «Liturgie» (Noten, PDFs; Unterordner/Dateien erben die Freigabe)
   · Planer    = die beiden Planer-Dateien (Zustand, Basis) im Notator-Ordner
   · Notator   = ganzer Notator-Ordner (.notator-Dateien, PDF-Ordner; enthält auch die Planer-Dateien)
   Die Freigaben sind echte Google-Drive-Freigaben; die Tabelle liest sie live aus Drive (keine eigene Benutzerliste). */
const OB_LIT='1na4i6KGlePisA8ENF0tQU6mOdrBnd_PO';
const OB_ROLE={reader:'Lesen',writer:'Bearbeiten'};
const OB={rows:null,own:null,tg:null,busy:false,msg:''};
const obApi=(p,o)=>GD.fetch('https://www.googleapis.com/drive/v3/files/'+p,o||{},true);
async function obTargets(){
  if(OB.tg)return OB.tg;
  const pl=[];for(const n of [ZNAME,BNAME]){try{const f=await GD.find(n);if(f)pl.push(f.id)}catch(e){}}
  return OB.tg={lit:[OB_LIT],pl,nt:[GD.FOLDER]}}
async function obIsOwner(){
  if(OB.own!==null)return OB.own;
  try{const j=await (await obApi(OB_LIT+'?fields=capabilities(canShare),ownedByMe')).json();OB.own=!!(j.ownedByMe&&j.capabilities&&j.capabilities.canShare)}catch(e){OB.own=false}
  return OB.own}
async function obLoad(){
  const tg=await obTargets();const by={};
  for(const lv of ['lit','pl','nt'])for(const id of tg[lv]){
    const j=await (await obApi(id+'/permissions?fields=permissions(id,type,role,emailAddress,displayName,permissionDetails(inherited))&pageSize=100')).json();
    (j.permissions||[]).forEach(p=>{if(p.type!=='user'||p.role==='owner'||!p.emailAddress)return;
      const k=p.emailAddress.toLowerCase();const u=by[k]||(by[k]={email:p.emailAddress,name:p.displayName||'',lit:null,pl:null,nt:null});
      const inh=!!(p.permissionDetails||[]).some(d=>d.inherited);
      /* Planer-Ebene hat mehrere Dateien: schwächste gewinnt */
      const cur=u[lv];if(!cur||(cur.role==='writer'&&p.role!=='writer'))u[lv]={role:p.role,inh,ids:[{f:id,p:p.id}]};else cur.ids.push({f:id,p:p.id})})}
  OB.rows=Object.values(by).sort((a,b)=>a.email.localeCompare(b.email));return OB.rows}
/* Rolle einer Ebene setzen: '' = entfernen */
async function obSet(email,lv,role){
  const tg=await obTargets();const u=(OB.rows||[]).find(x=>x.email.toLowerCase()===email.toLowerCase());const cur=u&&u[lv];
  for(const f of tg[lv]){
    const ex=cur&&cur.ids.find(x=>x.f===f);
    if(!role){if(ex&&!cur.inh)await obApi(f+'/permissions/'+ex.p,{method:'DELETE'});continue}
    if(ex){if(cur.inh)continue;await obApi(f+'/permissions/'+ex.p,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({role})});continue}
    await obApi(f+'/permissions?sendNotificationEmail=false',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'user',role,emailAddress:email})})}}
function onboardCard(){
  if(READONLY)return '';
  return `<div class="card" id="obcard"><h2>Onboarding (Zugriff vergeben)</h2>
   <p class="small">Gibt Personen mit Google-Konto Zugriff auf deine Drive-Ordner: <b>Liturgie</b> (Noten/PDFs, inkl. Unterordner), <b>Planer</b> (Plandaten) und optional <b>Notator</b> (Notator-Ordner). Die Freigaben werden direkt in Google Drive gesetzt und lassen sich dort auch einsehen.</p>
   <div id="obbody"><button class="btn" id="obload">Zugriffe laden</button></div></div>`}
function obRender(){
  const b=$('#obbody');if(!b)return;
  const sel=(lv,u)=>{const c=u[lv];const v=c?c.role:'';const dis=c&&c.inh?' disabled title="Über den Notator-Ordner geerbt"':'';
    return `<select data-ob="${lv}" data-em="${esc(u.email)}"${dis}><option value="">–</option>${Object.keys(OB_ROLE).map(r=>`<option value="${r}"${v===r?' selected':''}>${OB_ROLE[r]}</option>`).join('')}</select>`};
  const rows=(OB.rows||[]).map(u=>`<tr><td><b>${esc(u.name||u.email)}</b>${u.name?`<br><span class="small muted">${esc(u.email)}</span>`:''}</td><td>${sel('lit',u)}</td><td>${sel('pl',u)}</td><td>${sel('nt',u)}</td><td><button class="btn sm" data-obdel="${esc(u.email)}" title="Alle Freigaben entfernen">✕</button></td></tr>`).join('');
  const opt=`<option value="">–</option>${Object.keys(OB_ROLE).map(r=>`<option value="${r}">${OB_ROLE[r]}</option>`).join('')}`;
  b.innerHTML=`<div class="tw"><table><thead><tr><th>Person</th><th>Liturgie</th><th>Planer</th><th>Notator</th><th></th></tr></thead><tbody>${rows||'<tr><td colspan="5" class="muted">Noch niemand freigegeben.</td></tr>'}</tbody></table></div>
   <h3 style="margin-top:14px">Person hinzufügen</h3>
   <div class="fields"><label class="wide" style="grid-column:1/-1"><span>Google-E-Mail-Adresse</span><input type="email" id="obem" placeholder="name@gmail.com" autocomplete="off"></label>
    <label><span>Liturgie</span><select id="oblit">${opt.replace('value="reader"','value="reader" selected')}</select></label>
    <label><span>Planer</span><select id="obpl">${opt.replace('value="reader"','value="reader" selected')}</select></label>
    <label><span>Notator</span><select id="obnt">${opt}</select></label></div>
   <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><button class="btn pri" id="obadd">Hinzufügen</button><button class="btn" id="obre">Neu laden</button></div>
   <p class="small" id="obmsg" style="margin-top:8px">${esc(OB.msg)}</p>
   <p class="hint">Es wird keine Einladungsmail versendet; teile den Planer-Link selbst. Das Google-Konto muss zusätzlich für die App zugelassen sein (Google Cloud Console → OAuth-Zustimmungsbildschirm → Testnutzer), sonst ist die Anmeldung im Planer nicht möglich. «Planer = Bearbeiten» erlaubt Termine/Register zu ändern; Backups kann nur der Besitzer anlegen. Liturgie «Bearbeiten» erlaubt, Dateien zu ändern und zu löschen.</p>`;
}
function bindOnboard(){
  const b=$('#obbody');if(!b)return;
  const say=t=>{OB.msg=t;const m=$('#obmsg');if(m)m.textContent=t};
  const reload=async()=>{try{await obLoad();obRender()}catch(e){b.innerHTML='<p class="small" style="color:#a8322d">Fehler: '+esc(e&&e.message||e)+'</p><button class="btn" id="obload">Nochmals versuchen</button>'}};
  const start=async()=>{b.innerHTML='<p class="small muted">Lade …</p>';if(!await obIsOwner()){b.innerHTML='<p class="small muted">Nur der Besitzer der Ordner kann Zugriffe vergeben.</p>';return}await reload()};
  b.onclick=async e=>{
    if(e.target.id==='obload'){start();return}
    if(e.target.id==='obre'){await reload();return}
    if(e.target.id==='obadd'){
      const em=($('#obem').value||'').trim().toLowerCase();const lv={lit:$('#oblit').value,pl:$('#obpl').value,nt:$('#obnt').value};
      if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)){say('Bitte eine gültige E-Mail-Adresse eingeben.');return}
      if(!lv.lit&&!lv.pl&&!lv.nt){say('Mindestens eine Ebene wählen.');return}
      const txt=['Liturgie','Planer','Notator'].map((n,i)=>[lv.lit,lv.pl,lv.nt][i]?n+': '+OB_ROLE[[lv.lit,lv.pl,lv.nt][i]]:'').filter(Boolean).join(', ');
      if(!confirm('Zugriff in Google Drive vergeben an '+em+'?\n'+txt))return;
      e.target.disabled=true;say('Gebe frei …');
      try{for(const k of ['nt','lit','pl']){if(lv[k])await obSet(em,k,lv[k])}say('Freigegeben: '+em+' ('+txt+')');await reload()}
      catch(err){say('Fehler: '+(err&&err.message||err))}
      e.target.disabled=false;return}
    const d=e.target.closest('[data-obdel]');
    if(d){const em=d.dataset.obdel;if(!confirm('Alle Freigaben für '+em+' entfernen (Liturgie, Planer, Notator)?'))return;
      try{for(const k of ['lit','pl','nt'])await obSet(em,k,'');say('Entfernt: '+em);await reload()}catch(err){say('Fehler: '+(err&&err.message||err))}}};
  b.onchange=async e=>{
    const s=e.target.closest('select[data-ob]');if(!s)return;
    const em=s.dataset.em,k=s.dataset.ob,r=s.value;
    if(!confirm((r?'Zugriff auf «'+{lit:'Liturgie',pl:'Planer',nt:'Notator'}[k]+'» für '+em+' ändern auf: '+OB_ROLE[r]:'Zugriff auf «'+{lit:'Liturgie',pl:'Planer',nt:'Notator'}[k]+'» für '+em+' entfernen')+'?')){await reload();return}
    try{await obSet(em,k,r);say('Gespeichert.');await reload()}catch(err){say('Fehler: '+(err&&err.message||err));await reload()}};
}
