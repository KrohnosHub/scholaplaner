/* --- Gesänge (Choral) --- */
const GCOLS=[{l:'Art'},{l:'Nr.',num:true},{l:'Bezeichnung / Incipit',nodl:true},{l:'Choralnoten',link:true},{l:'YouTube',link:true},{l:'Organistennoten',link:true},{l:'Dublette?',nofilter:true,nosort:true},{l:'Einsätze',num:true},{l:'zuletzt',num:true}];
const gcols=()=>canOrgan()?GCOLS:GCOLS.filter(c=>c.l!=='Organistennoten');
function viewGes(){
  return `<div class="tools tight"><select id="rfile" title="Nach verknüpften Dateien filtern">${[['','Dateien: alle'],['nt0','Notator fehlt'],['nt1','Notator verknüpft'],['cn0','Choral-PDF fehlt'],['cn1','Choral-PDF verknüpft'],['on0','Orgel-PDF fehlt'],['on1','Orgel-PDF verknüpft']].map(([v,l])=>`<option value="${v}" ${S.rfile===v?'selected':''}>${l}</option>`).join('')}</select>
   ${canEdit()?'<button class="btn" id="radd" title="Neuen Eintrag anlegen">+ Eintrag</button> <button class="btn" id="rsync" title="Liest die Notator-Ablage in Google Drive und verknüpft passende Dateien mit den Gesängen">☁ Abgleich</button>':''}
   <details class="more"><summary class="btn" title="Weitere Optionen">⋯</summary><div class="morep">
    <label class="chk"><input type="checkbox" id="rdup" ${S.rdup?'checked':''}> nur ähnliche / doppelte</label>
    <label class="chk"><input type="checkbox" id="rhid" ${S.rhid?'checked':''}> gelöschte zeigen</label></div></details><button class="btn" id="rvv" title="Ansicht wechseln">Karten</button><span class="count" id="rc"></span></div>
   <div class="gcw" id="rcards"></div><div class="tw stk"><table><thead id="rh"></thead><tbody id="rl"></tbody></table></div>
   <details class="hintd"><summary>Hinweise</summary><p class="hint">Bezeichnung und Nr. sind direkt änderbar (Schreibweise korrigieren); der ursprüngliche Eintrag wird darunter angezeigt und weiter für die Zuordnung zu den Plänen verwendet. Doppelte oder falsche Einträge mit «löschen» entfernen (direkt «Rückgängig» möglich; über «gelöschte zeigen» jederzeit wiederherstellbar). Spaltenköpfe: Klick = sortieren; Felder darunter = filtern. YouTube-Links erscheinen nur im Scholaplan. Änderungen werden im gemeinsamen Speicher abgelegt.</p></details>`;
}
function gget(r){const a=[r.art,r.nr,r.name+' '+r.po+' '+r.fe.join(' '),r.cn||'',r.yt||'',r.on||'','',r.cnt,r.last];return canOrgan()?a:a.filter((_,i)=>i!==5)}
/* Tabellenkopf + Filterzeile fixieren: Kopfbereich bleibt stehen, nur die Liste scrollt */
function fitStk(){document.querySelectorAll('.tw.stk').forEach(w=>{if(!w.offsetParent)return;
  const th=w.querySelector('thead tr'); if(th)w.style.setProperty('--h1',th.getBoundingClientRect().height+'px');
  const top=w.getBoundingClientRect().top+window.scrollY, pb=w.parentElement.getBoundingClientRect().bottom+window.scrollY, below=Math.max(0,pb-(top+w.offsetHeight))+28;
  w.style.maxHeight=Math.max(220,Math.floor(window.innerHeight-top-below))+'px';
  const ex=document.documentElement.scrollHeight-window.innerHeight; if(ex>0)w.style.maxHeight=Math.max(220,w.offsetHeight-ex)+'px'})}
window.addEventListener('resize',()=>fitStk());
document.addEventListener('toggle',e=>{if(e.target.classList&&e.target.classList.contains('hintd'))fitStk()},true);
function drawGesHead(){const cs=gcols();$('#rh').innerHTML=tblHead(cs,S.gst,S.gfl,'g',tblVals(REG().filter(r=>S.rhid||!r.hide),gget,cs));fitStk()}
const fileOk=r=>{const f=S.rfile;if(!f)return true;const k=f.slice(0,2),has=k==='nt'?ntParse(r.nt).length>0:parseLinks(r[k]).length>0;return f[2]==='1'?has:!has};
function drawGes(){
  const q=norm(S.rq); let all=REG();
  const nk=r=>norm(r.name).replace(/ (maennerschola|schola|frauenschola)$/,'').slice(0,14);
  const cn={},cr={};all.forEach(r=>{if(r.hide)return;const k=nk(r);if(k)cn[k]=(cn[k]||0)+1;if(r.nr)cr[r.nr]=(cr[r.nr]||0)+1});
  const isDup=r=>!r.hide&&((nk(r)&&cn[nk(r)]>1)||(r.nr&&cr[r.nr]>1));
  let base=all.filter(r=>(S.rhid||!r.hide)&&(!S.rart||r.art===S.rart)&&(!q||norm(r.name+' '+r.orig+' '+r.nr+' '+r.po+' '+r.fe.join(' ')).includes(q))&&(!S.rdup||isDup(r))&&fileOk(r));
  const cols=gcols(); let l=tblApply(base,gget,cols,S.gst,S.gfl);
  if(S.rdup&&S.gst.c<0) l=l.slice().sort((a,b)=>(a.nr&&cr[a.nr]>1?a.nr:nk(a)).localeCompare(b.nr&&cr[b.nr]>1?b.nr:nk(b),'de',{numeric:true}));
  const ro=!canEdit(); const show=l.slice(0,400);
  const cellsOf=r=>{
    const LAB={cn:'Choral',yt:'YouTube',on:'Orgel'};
    const f=(k)=>ro?(r[k]?lnkHtml(r[k],'Link'):'<span class="muted">–</span>'):`<div class="lkv small">${lnkHtml(r[k],LAB[k])}</div><button class="btn sm" data-lk="${esc(r.key)}" data-f="${k}" title="Links bearbeiten">${r[k]?'✎ bearbeiten':'＋ Link'}</button>`;
    const chg=r.name!==r.orig||r.nr!==r.onr;
    const ed=(k,v,w)=>ro?esc(v):`<input class="cell-in" style="min-width:${w}px" type="text" data-k="${esc(r.key)}" data-f="${k}" value="${esc(v)}">`;
    const info=`${ntBlock(r)}${ro?'':` <button class="btn sm" data-nt="${esc(r.key)}" title="Notator-Datei aus Google Drive manuell verknüpfen">🔗 Datei</button>`} · ${chg?'urspr.: '+esc(stripCnt(r.orig))+(r.nr!==r.onr?' ('+esc(r.onr||'ohne Nr.')+')':'')+' · ':''}${esc(r.po)}${r.fe.length||r.fx?' · <span title="Feste, an denen der Gesang vorgesehen ist">Feste:</span> '+(r.fe.length?r.fe.map(x=>'<span class="pill">'+esc(x)+'</span>').join(' '):'<span class="muted">keine</span>')+(r.fx?' <span class="pill ok" title="manuell festgelegt – fliesst in neue Pläne ein">angepasst</span>':''):''}${ro?'':` <button class="btn sm" data-fe="${esc(r.key)}" title="Position und Feste bearbeiten">✎ Feste</button>`}`, dele=`${isDup(r)?'<span class="pill warn">ähnlich</span> ':''}<label class="chk"><input type="checkbox" data-k="${esc(r.key)}" data-f="hide" ${r.hide?'checked':''}> ${r.hide?'gelöscht – wiederherstellen':'löschen'}</label>`;
    const cls=(r.hide?'hid':'')+(isDup(r)?' dup':'');
    const tr=`<tr class="${cls}"><td class="small muted">${esc(r.art)}</td><td class="num">${ed('nr',r.nr,70)}</td><td>${ed('nm',r.name,220)}<div class="small muted">${info}</div></td><td>${f('cn')}</td><td>${f('yt')}</td>${canOrgan()?`<td>${f('on')}</td>`:''}<td class="small">${dele}</td><td class="num muted">${esc(r.cnt)}</td><td class="num muted">${esc(r.last)}</td></tr>`;
    const card=`<article class="gc ${cls}"><div class="gct"><span class="gcn">${ed('nr',r.nr,0)}</span><span class="gcm">${ed('nm',r.name,0)}</span></div><div class="small muted gci">${esc(r.art)} · ${info}</div><div class="gcl"><div><span class="gcll">Choral</span>${f('cn')}</div><div><span class="gcll">YouTube</span>${f('yt')}</div>${canOrgan()?`<div><span class="gcll">Orgel</span>${f('on')}</div>`:''}</div><div class="gcf small">${dele}<span class="muted">${esc(r.cnt)}× · zuletzt ${esc(r.last||'–')}</span></div></article>`;
    return {tr,card}};
  $('#rl').innerHTML=show.map(r=>cellsOf(r).tr).join('')||`<tr><td colspan="9" class="muted">Keine Treffer.</td></tr>`;
  $('#rcards').innerHTML=show.map(r=>cellsOf(r).card).join('')||'<p class="muted">Keine Treffer.</p>';
  $('#rc').textContent=l.length+' Einträge'+(l.length>400?' (erste 400)':'');
}



function ntBlock(r){const l=ntParse(r.nt);
  const tip='In Notator öffnen (vorhandene Version aus Drive, sonst GregoBase-Suche)';
  if(l.some(x=>x.l)) return 'Notator: '+l.map(x=>`<a href="${esc(ntLink(r.name,x))}" target="_blank" rel="noopener" title="${tip}">${esc(x.l||'Datei')} ↗</a>`).join(' · ')+` <span class="pill ok" title="verknüpfte Notator-Dateien">${l.length>1?'Dateien':'Datei'} verknüpft</span>`;
  return `<a href="${esc(ntUrl(r.name,r))}" target="_blank" rel="noopener" title="${tip}">Notator ↗</a>`+(l.length?' <span class="pill ok" title="verknüpfte Notator-Datei">Datei verknüpft</span>':'')}
function linkNt(key){editLinks(key,'nt')}

/* Datei aus Google Drive wählen: Suche nach Dateinamen oder Durchblättern der Ordner */
function drivePicker(){
  return new Promise(async res=>{
    try{await GD.token(true)}catch(e){toast(String(e&&e.message||e));res(null);return}
    const o=document.createElement('div');
    o.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10001;display:flex;align-items:center;justify-content:center;padding:16px';
    const b=document.createElement('div');b.style.cssText='background:var(--surface);color:var(--ink);max-width:640px;width:100%;height:min(80vh,640px);display:flex;flex-direction:column;border-radius:10px;padding:16px;box-shadow:0 8px 30px rgba(0,0,0,.35);border:1px solid #8884';
    b.innerHTML=`<h3 style="margin:0 0 8px">Datei aus Google Drive wählen</h3>
     <div style="display:flex;gap:6px;margin-bottom:8px"><input type="text" id="dpq" placeholder="Nach Dateinamen suchen …" style="flex:1"><button class="btn" id="dps">Suchen</button></div>
     <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"><button class="btn sm" data-go="${NT_FOLDER}|Notator-Ordner">Notator-Ordner</button><button class="btn sm" data-go="${PDF_FOLDER}|Choral-/Orgel-PDFs">PDF-Ordner</button><button class="btn sm" data-go="root|Mein Drive">Mein Drive</button><button class="btn sm" data-go="shared|Mit mir geteilt">Mit mir geteilt</button></div>
     <div id="dpb" class="small muted" style="margin-bottom:6px"></div>
     <div id="dpl" style="flex:1;overflow:auto;border:1px solid #8883;border-radius:6px"></div>
     <div style="display:flex;justify-content:flex-end;margin-top:10px"><button class="btn" id="dpc">Abbrechen</button></div>`;
    o.appendChild(b);document.body.appendChild(o);
    const Q=x=>String(x).replace(/\\/g,'\\\\').replace(/'/g,"\\'");
    const FOLDER='application/vnd.google-apps.folder';
    let stack=[{id:NT_FOLDER,name:'Notator-Ordner'}],mode='browse',query='',tok=null,items=[],busyL=false,gen=0;
    const close=v=>{o.remove();res(v)};
    const crumb=()=>{$('#dpb').innerHTML=mode==='search'?'Suche: «'+esc(query)+'»':stack.map((x,i)=>`<a href="#" data-b="${i}">${esc(x.name)}</a>`).join(' › ')};
    const draw=()=>{
      $('#dpl').innerHTML=(items.map((f,i)=>`<div data-i="${i}" tabindex="0" style="display:flex;gap:8px;align-items:center;padding:7px 10px;border-bottom:1px solid #8882;cursor:pointer"><span>${f.mimeType===FOLDER?'📁':'📄'}</span><span style="flex:1;overflow-wrap:anywhere">${esc(f.name)}</span><span class="muted small">${f.mimeType===FOLDER?'':esc((f.modifiedTime||'').slice(0,10))}</span></div>`).join('')||'<p class="muted small" style="padding:10px">Keine Einträge.</p>')+(tok?'<div style="padding:8px"><button class="btn sm" id="dpm">Mehr laden</button></div>':'');
    };
    async function load(more){
      if(busyL)return;busyL=true;const my=++gen;
      if(!more){items=[];tok=null;$('#dpl').innerHTML='<p class="muted small" style="padding:10px">Lade …</p>'}
      let q;
      if(mode==='search'){q="trashed=false and mimeType != '"+FOLDER+"' and "+query.split(/\s+/).filter(Boolean).map(w=>"name contains '"+Q(w)+"'").join(' and ')}
      else{const cur=stack[stack.length-1].id;q=cur==='shared'?'sharedWithMe=true and trashed=false':"'"+Q(cur)+"' in parents and trashed=false"}
      try{
        const u='https://www.googleapis.com/drive/v3/files?'+new URLSearchParams({q,pageSize:'100',fields:'nextPageToken,files(id,name,mimeType,modifiedTime)',orderBy:mode==='search'?'modifiedTime desc':'folder,name',supportsAllDrives:'true',includeItemsFromAllDrives:'true',...(more&&tok?{pageToken:tok}:{})});
        const j=await (await GD.fetch(u,{},true)).json();
        if(my!==gen)return;
        items=items.concat(j.files||[]);tok=j.nextPageToken||null;
        if(mode==='browse'&&stack[stack.length-1].id==='shared')items.sort((a,c)=>(c.mimeType===FOLDER)-(a.mimeType===FOLDER)||a.name.localeCompare(c.name,'de'));
        draw();
      }catch(e){if(my===gen)$('#dpl').innerHTML='<p class="small" style="padding:10px;color:var(--warn)">'+esc(e&&e.message||e)+'</p>'}
      busyL=false;crumb();
    }
    const enter=(id,name)=>{mode='browse';stack.push({id,name});load()};
    b.onclick=e=>{
      const go=e.target.closest('[data-go]');if(go){const [id,name]=go.dataset.go.split('|');mode='browse';stack=[{id,name}];busyL=false;load();return}
      const bc=e.target.closest('[data-b]');if(bc){e.preventDefault();stack=stack.slice(0,+bc.dataset.b+1);mode='browse';busyL=false;load();return}
      if(e.target.id==='dpm'){load(true);return}
      const it=e.target.closest('[data-i]');if(it){const f=items[+it.dataset.i];if(f.mimeType===FOLDER){busyL=false;enter(f.id,f.name)}else close({id:f.id,name:f.name,url:fileUrl(f.id)})}};
    b.onkeydown=e=>{if(e.key==='Enter'&&e.target.dataset&&e.target.dataset.i!=null)e.target.click()};
    const doSearch=()=>{const v=$('#dpq').value.trim();if(!v){mode='browse';busyL=false;load();return}mode='search';query=v;busyL=false;load()};
    $('#dps').onclick=doSearch;$('#dpq').onkeydown=e=>{if(e.key==='Enter')doSearch()};
    $('#dpc').onclick=()=>close(null);o.onclick=e=>{if(e.target===o)close(null)};
    $('#dpq').focus();load();
  });
}
function editLinks(key,f){
  const r=REG().find(x=>x.key===key); if(!r) return;
  const lab={cn:'Choralnoten',yt:'YouTube',on:'Organistennoten',nt:'Notator-Dateien'}[f], dlab={cn:'Choral',yt:'YouTube',on:'Orgel',nt:'Datei'}[f];
  let rows=(f==='nt'?ntParse(r.nt):parseLinks(r[f])).map(x=>({l:x.l,u:x.u})); if(!rows.length) rows=[{l:'',u:''}];
  const o=document.createElement('div');
  o.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
  const b=document.createElement('div');b.style.cssText='background:var(--surface);color:var(--ink);max-width:620px;width:100%;max-height:90vh;display:flex;flex-direction:column;border-radius:10px;padding:18px;box-shadow:0 8px 30px rgba(0,0,0,.3);border:1px solid #8884';
  b.innerHTML=`<h3 style="margin:0 0 4px">${esc(lab)}</h3><p class="small muted" style="margin:0 0 10px">${esc(r.name)}<br>${f==='nt'?'Google-Drive-Link oder Datei-ID der .notator-Datei. Bei Messen pro Teil eine Zeile (Titel z.B. «Kyrie»). ':''}Titel (optional) und Link. Leerer Titel = «${esc(dlab)}».</p><div id="lkr" style="overflow:auto;flex:1"></div>
   <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="btn" id="lka">＋ Weiterer Link</button><span style="flex:1"></span><button class="btn pri" id="lks">Speichern</button><button class="btn" id="lkc">Abbrechen</button></div>`;
  o.appendChild(b);document.body.appendChild(o);
  const draw=()=>{$('#lkr').innerHTML=rows.map((x,i)=>`<div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;align-items:center"><input type="text" data-i="${i}" data-p="l" value="${esc(x.l)}" placeholder="Titel / Bezeichnung" style="flex:1;min-width:130px"><input type="text" data-i="${i}" data-p="u" value="${esc(x.u)}" placeholder="https://…" style="flex:2;min-width:180px">${f==='yt'?'':`<button class="btn sm" data-pk="${i}" title="Datei in Google Drive suchen oder auswählen">📁 Drive</button>`}<button class="btn sm" data-d="${i}" title="Link löschen">🗑</button></div>`).join('')||'<p class="muted small">Keine Links.</p>'};
  draw();
  const first=$('#lkr input[data-p="u"]'); if(first) first.focus();
  $('#lkr').oninput=e=>{const i=e.target.dataset.i;if(i!=null)rows[+i][e.target.dataset.p]=e.target.value};
  $('#lkr').onclick=async e=>{const d=e.target.closest('[data-d]');if(d){rows.splice(+d.dataset.d,1);draw();return}
    const p=e.target.closest('[data-pk]');if(p){const i=+p.dataset.pk;const f=await drivePicker();if(f&&rows[i]){rows[i].u=f.url;draw()}}};
  $('#lka').onclick=()=>{rows.push({l:'',u:''});draw();const ins=document.querySelectorAll('#lkr input[data-p="u"]');ins[ins.length-1].focus()};
  const done=()=>o.remove(); $('#lkc').onclick=done; o.onclick=e=>{if(e.target===o)done()};
  $('#lks').onclick=()=>{
    const out=[]; for(const x of rows){const u=x.u.trim(),l=x.l.trim().replace(/[;|]/g,' ');if(!u&&!l)continue;if(f==='nt'?!ntMid(u):!/^https?:\/\/\S+$/i.test(u)){toast(f==='nt'?'Kein gültiger Drive-Link oder Datei-ID':'Link muss mit http:// oder https:// beginnen');return}out.push((l?l+'|':'')+u.replace(/;/g,'%3B'))}
    const ob=S.reg[key]=S.reg[key]||{}; ob[f]=out.length?out.join(' ; '):(f==='nt'?'':'-'); save();regPut(key);for(const k in AUTO)delete AUTO[k];done();drawGes();toast(out.length?'Links gespeichert':'Links gelöscht')};
}
function editFeste(key){
  const r=REG().find(x=>x.key===key); if(!r) return;
  const sel=new Set(r.fe); const o=document.createElement('div');
  o.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
  const b=document.createElement('div');b.style.cssText='background:var(--surface);color:var(--ink);max-width:560px;width:100%;max-height:90vh;display:flex;flex-direction:column;border-radius:10px;padding:18px;box-shadow:0 8px 30px rgba(0,0,0,.3);border:1px solid #8884';
  b.innerHTML=`<h3 style="margin:0 0 4px">${esc(r.name)}</h3><p class="small muted" style="margin:0 0 10px">Position und Feste festlegen. Der Gesang wird dann bei diesen Festen automatisch in neue Liederpläne eingesetzt (ersetzt dort den Gesang an gleicher Position oder wird ergänzt).</p>
   <label class="small"><span>Position</span><select id="fp">${[...new Set([r.po,...POSS].filter(Boolean))].map(x=>`<option ${x===r.po?'selected':''}>${esc(x)}</option>`).join('')}</select></label>
   <input type="text" id="fq" placeholder="Feste filtern…" style="margin:10px 0 6px">
   <div id="fl" style="overflow:auto;flex:1;min-height:120px;border:1px solid #8883;border-radius:6px;padding:6px"></div>
   <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="btn pri" id="fs">Speichern</button><button class="btn" id="fc">Abbrechen</button>${r.fx?'<button class="btn" id="fr">Auf Archiv-Vorgabe zurücksetzen</button>':''}</div>`;
  o.appendChild(b);document.body.appendChild(o);
  const draw=()=>{const q=norm($('#fq').value);const l=CANONS.filter(c=>!q||norm(c).includes(q)).sort((a,c)=>(sel.has(c)?0:1)-(sel.has(a)?0:1)||0);
    $('#fl').innerHTML=l.map(c=>`<label class="chk" style="display:block;padding:2px 0"><input type="checkbox" data-c="${esc(c)}" ${sel.has(c)?'checked':''}> ${esc(c)}${r.fe0.includes(c)?' <span class="muted small">(Archiv)</span>':''}</label>`).join('')||'<span class="muted">Keine Treffer</span>'};
  draw();
  $('#fq').oninput=draw;
  $('#fl').onchange=e=>{const c=e.target.dataset.c;if(!c)return;e.target.checked?sel.add(c):sel.delete(c)};
  const done=()=>{o.remove()};
  $('#fc').onclick=done; o.onclick=e=>{if(e.target===o)done()};
  $('#fs').onclick=()=>{const ob=S.reg[key]=S.reg[key]||{};ob.fe=CANONS.filter(c=>sel.has(c));const po=$('#fp').value;ob.po=po===r.po0?'':po;save();regPut(key);for(const k in AUTO)delete AUTO[k];done();drawGes();toast('Feste gespeichert – gilt für neue Pläne')};
  const fr=$('#fr'); if(fr) fr.onclick=()=>{const ob=S.reg[key]||{};delete ob.fe;delete ob.po;save();regPut(key);for(const k in AUTO)delete AUTO[k];done();drawGes();toast('Zurückgesetzt')};
}

/* ---------- Abgleich Notator-Dateien (Google Drive) -> Register ---------- */
const NT_FOLDER='144wHwMFQUFhNxcpun6CO9fXtewhFcLe3', PDF_FOLDER='1r8NqXs4D9bS_ZZf3lnwX5lFygIZm3Uhk';
const TYPE_LAB={nt:'Notator',cn:'Choral-PDF',on:'Orgel-PDF'};
const pdfType=t=>{const m=/^(.*?)[\s_(]*(choral|orgel)\)?\s*\.pdf$/i.exec(t||'');return m?{base:m[1].replace(/[\s_]+$/,''),type:/^c/i.test(m[2])?'cn':'on'}:null};
const linksStr=l=>l.map(x=>(x.l?x.l.replace(/[;|]/g,' ')+'|':'')+x.u.replace(/;/g,'%3B')).join(' ; ');
const fileUrl=id=>'https://drive.google.com/file/d/'+id+'/view';
const wordsOf=x=>norm(String(x||'').replace(/\.notator$/i,'').replace(/\(.*?\)/g,' ')).split(' ').filter(Boolean);
const bigrams=s=>{s=' '+s+' ';const m=new Map();for(let i=0;i<s.length-1;i++){const g=s.slice(i,i+2);m.set(g,(m.get(g)||0)+1)}return m};
function simScore(a,b){ /* a,b: normalisierte Wortlisten -> 0..1 */
  const sa=a.join(' '),sb=b.join(' '); if(!sa||!sb) return 0; if(sa===sb) return 1;
  const A=bigrams(sa),B=bigrams(sb); let inter=0,na=0,nb=0;A.forEach((v,k)=>{na+=v;if(B.has(k))inter+=Math.min(v,B.get(k))});B.forEach(v=>nb+=v);
  const dice=2*inter/(na+nb);
  const shared=a.filter(x=>b.includes(x)).length; const cont=shared/Math.min(a.length,b.length), jac=shared/new Set([...a,...b]).size;
  const sub=(a.every(x=>b.includes(x))||b.every(x=>a.includes(x)))?0.9:0;
  return Math.max(dice,sub,(cont+jac)/2*0.95)}
function matchDriveFiles(files){
  const reg=REG().filter(r=>!r.hide);
  return files.map(f=>{
    const fw=wordsOf(f.base!=null?f.base:f.title), ft=fw.join(' '); const sr=/SR\s*(\d+)/i.exec(f.title);
    const pm=/^(.*?)\s+[–-]\s+(.+)$/.exec(f.base!=null?f.base:f.title); f.part=pm?pm[2].trim():'';
    let kind='', c=reg.filter(r=>wordsOf(r.name).join(' ')===ft||wordsOf(r.orig).join(' ')===ft); if(c.length) kind='exakt';
    if(!c.length&&f.part){const bw=wordsOf(pm[1]).join(' ');c=reg.filter(r=>wordsOf(r.name).join(' ')===bw||wordsOf(r.orig).join(' ')===bw);const o=c.filter(r=>/^Ordinarium/.test(r.art));if(o.length)c=o;if(c.length) kind='exakt (Teil)'}
    if(!c.length&&sr){c=reg.filter(r=>r.nr==='SR '+sr[1]);if(c.length) kind='SR-Nr.'}
    c=c.slice(0,8);
    let sim=[];
    if(!c.length&&fw.length){sim=reg.map(r=>({r,s:Math.max(simScore(fw,wordsOf(r.name)),simScore(fw,wordsOf(r.orig)))})).filter(x=>x.s>=0.5).sort((a,b)=>b.s-a.s).slice(0,8)}
    const linked=reg.find(r=>[r.nt,r.cn,r.on].some(v=>v&&String(v).includes(f.id)));
    return {f,c,kind,sim,linked}});
}
function applyDriveLink(r,c){const ob=S.reg[c.key]=S.reg[c.key]||{};const T=r.f.type;
  const cur=REG().find(x=>x.key===c.key), pt=r.f.part||'';
  if(T==='nt'){if(pt){const l=ntParse(cur.nt).filter(x=>x.l);if(!l.some(x=>ntMid(x.u)===r.f.id))l.push({l:pt,u:fileUrl(r.f.id)});ob.nt=ntStr(sortParts(l))}else ob.nt=fileUrl(r.f.id)}
  else{const l=parseLinks(cur[T]||'');if(!l.some(x=>x.u.includes(r.f.id))){l.push({l:pt,u:fileUrl(r.f.id)});ob[T]=lnkStr(sortParts(l))}}
  save();regPut(c.key);for(const k in AUTO)delete AUTO[k]}
async function driveSync(){
  if(!GD.cached()){toast('Bitte zuerst oben mit Google anmelden');return}
  const nfix=persistNorm(); toast((nfix?nfix+' Einträge bereinigt – ':'')+'Lese Notator- und PDF-Ablage in Google Drive …');
  let files=[];
  try{
    for(const [folder,q,type] of [[NT_FOLDER,"name contains '.notator'",'nt'],[PDF_FOLDER,"mimeType = 'application/pdf'",'pdf']]){
      let tok;
      for(let i=0;i<20;i++){
        const u='https://www.googleapis.com/drive/v3/files?'+new URLSearchParams({q:"'"+folder+"' in parents and trashed=false and "+q,pageSize:'100',fields:'nextPageToken,files(id,name)',...(tok?{pageToken:tok}:{})});
        const p=await (await GD.fetch(u,{},true)).json();
        (p.files||[]).forEach(f=>{const T=f.name||'';
          if(type==='nt'){if(/\.notator$/i.test(T))files.push({id:f.id,title:T,base:T.replace(/\.notator$/i,''),type:'nt'})}
          else{const pt=pdfType(T);if(pt)files.push({id:f.id,title:T,base:pt.base,type:pt.type})}});
        tok=p.nextPageToken; if(!tok) break}}
  }catch(e){
    toast('Drive-Abgleich fehlgeschlagen: '+(e&&e.message||e));return}
  let rows=matchDriveFiles(files);
  /* eindeutige exakte Treffer (genau 1 Kandidat) werden automatisch verknüpft */
  let auto=0; rows.forEach(r=>{if(!r.linked&&r.c.length===1){applyDriveLink(r,r.c[0]);auto++}});
  if(auto){drawGes();rows=matchDriveFiles(files)}
  const o=document.createElement('div');
  o.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
  const b=document.createElement('div');b.style.cssText='background:var(--surface);color:var(--ink);max-width:800px;width:100%;max-height:90vh;display:flex;flex-direction:column;border-radius:10px;padding:18px;box-shadow:0 8px 30px rgba(0,0,0,.3);border:1px solid #8884';
  const todo=rows.filter(r=>!r.linked), done=rows.length-todo.length;
  todo.sort((a,b)=>String(a.f.base).replace(/\s+[–-]\s+.*$/,'').localeCompare(String(b.f.base).replace(/\s+[–-]\s+.*$/,''))||partRank(a.f.part)-partRank(b.f.part));
  const exact=todo.filter(r=>r.c.length), simil=todo.filter(r=>!r.c.length);
  const simHit=simil.filter(r=>r.sim.length), simNone=simil.filter(r=>!r.sim.length);
  b.innerHTML=`<h3 style="margin:0 0 4px">Dateien in Google Drive (Notator, Choral-PDF, Orgel-PDF)</h3><p class="small muted" style="margin:0 0 8px">${rows.length} Dateien gefunden${auto?', '+auto+' automatisch verknüpft':''}${done-auto>0?', '+(done-auto)+' bereits verknüpft':''}. Restliche Vorschläge prüfen und übernehmen.</p>
   <div style="display:flex;gap:6px;margin-bottom:8px"><button class="btn pri" id="dst1">Genaue Treffer (${exact.length})</button><button class="btn" id="dst2">Ähnliche Treffer (${simHit.length})</button></div>
   <div id="dsl" style="overflow:auto;flex:1;border:1px solid #8883;border-radius:6px;padding:6px"></div><div id="dsl2" style="overflow:auto;flex:1;border:1px solid #8883;border-radius:6px;padding:6px;display:none"></div>
   <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="btn pri" id="dsok">Ausgewählte verknüpfen</button><button class="btn" id="dsx">Schliessen</button></div>`;
  o.appendChild(b);document.body.appendChild(o);
  const rowH=(r,i,g,opts)=>`<div style="display:flex;gap:8px;align-items:center;padding:4px 0;border-bottom:1px solid #8882;flex-wrap:wrap"><input type="checkbox" data-g="${g}" data-i="${i}" ${opts.pre?'checked':''}><span style="flex:1;min-width:180px">${esc(r.f.title)}</span><select data-g="${g}" data-s="${i}" style="max-width:320px"><option value="">– nicht zuordnen –</option>${opts.items.map((c,j)=>`<option value="${j}" ${j===0?'selected':''}>${esc(c.name)}${c.nr?' ('+esc(c.nr)+')':''}${c.art?' · '+esc(String(c.art).replace(/ \(.*\)$/,'')):''}${c.pct?' · '+c.pct+' %':''}${c.nt?' · hat schon Link':''}</option>`).join('')}</select><span class="small muted">${esc(TYPE_LAB[r.f.type])} · ${esc(opts.tag)}</span></div>`;
  $('#dsl').innerHTML=exact.map((r,i)=>rowH(r,i,'e',{pre:r.c.length===1,items:r.c,tag:r.kind})).join('')||'<p class="muted">Keine genauen Treffer (mehr).</p>';
  $('#dsl2').innerHTML='<p class="small muted" style="margin:0 0 6px">Dateinamen mit leichten Abweichungen – nichts vorangekreuzt, bitte einzeln prüfen.</p>'+(simHit.map((r,i)=>rowH(r,i,'s',{pre:false,items:r.sim.map(x=>Object.assign({},x.r,{pct:Math.round(x.s*100)})),tag:'ähnlich'})).join('')||'<p class="muted">Keine ähnlichen Treffer.</p>')+(simNone.length?`<p class="small muted" style="margin-top:10px">Ohne Vorschlag (manuell verknüpfen: Notator über «🔗 Datei», PDF über «✎ bearbeiten» bei den Links): ${simNone.map(r=>esc(r.f.title)).join(', ')}</p>`:'');
  const tab=n=>{$('#dsl').style.display=n===1?'':'none';$('#dsl2').style.display=n===2?'':'none';$('#dst1').className='btn'+(n===1?' pri':'');$('#dst2').className='btn'+(n===2?' pri':'')};
  $('#dst1').onclick=()=>tab(1);$('#dst2').onclick=()=>tab(2);
  $('#dsx').onclick=()=>o.remove();o.onclick=e=>{if(e.target===o)o.remove()};
  b.onchange=e=>{const s=e.target.dataset.s;if(s!=null){const cb=b.querySelector('input[data-g="'+e.target.dataset.g+'"][data-i="'+s+'"]');if(cb)cb.checked=!!e.target.value}};
  $('#dsok').onclick=()=>{let n=0;
    [['e',exact,r=>r.c],['s',simHit,r=>r.sim.map(x=>x.r)]].forEach(([g,list,get])=>list.forEach((r,i)=>{const cb=b.querySelector('input[data-g="'+g+'"][data-i="'+i+'"]'),sel=b.querySelector('select[data-g="'+g+'"][data-s="'+i+'"]');if(!cb||!cb.checked||!sel.value)return;
      const c=get(r)[+sel.value];applyDriveLink(r,c);n++}));
    o.remove();drawGes();toast(n+' Datei'+(n===1?'':'en')+' verknüpft')};
}
function bindGes(){
  drawGesHead();drawGes();window.scrollTo(0,0);fitStk();
  $('#rfile').onchange=e=>{S.rfile=e.target.value;drawGes()};
  $('#rdup').onchange=e=>{S.rdup=e.target.checked;drawGes()};
  $('#rhid').onchange=e=>{S.rhid=e.target.checked;drawGes()};
  tblBind($('#rh'),S.gst,S.gfl,drawGes,drawGesHead);
  const hI=$('#rl').oninput=e=>{const k=e.target.dataset.k;if(!k||e.target.dataset.f==='hide')return;S.reg[k]=S.reg[k]||{};const f=e.target.dataset.f;S.reg[k][f]=e.target.value.trim();if(f==='nr')S.reg[k].nrs=true;const lv=e.target.parentNode.querySelector('.lkv');if(lv)lv.innerHTML=lnkHtml(e.target.value,lv.dataset.lab);save();regPut(k)};
  const hK=$('#rl').onclick=e=>{const b=e.target.closest('[data-fe]');if(b)editFeste(b.dataset.fe);const n=e.target.closest('[data-nt]');if(n)linkNt(n.dataset.nt);const lk=e.target.closest('[data-lk]');if(lk&&!e.target.closest('a'))editLinks(lk.dataset.lk,lk.dataset.f)};
  const hC=$('#rl').onchange=e=>{const k=e.target.dataset.k;if(!k)return;if(e.target.dataset.f==='hide'){S.reg[k]=S.reg[k]||{};const on=e.target.checked;S.reg[k].hide=on;save();regPut(k);drawGes();if(on)toast('Eintrag gelöscht',()=>{S.reg[k].hide=false;save();regPut(k);drawGes()})}else if(e.target.dataset.f==='nm'||e.target.dataset.f==='nr')drawGes()};
  const gvNow=()=>LS.get('sp.gv',innerWidth<=700?'cards':'table');
  const gvApply=()=>{document.body.dataset.gv=gvNow();const b=$('#rvv');if(b)b.textContent=gvNow()==='cards'?'Tabelle':'Karten';fitStk()};
  {const c=$('#rcards');c.oninput=hI;c.onclick=hK;c.onchange=hC}
  gvApply();$('#rvv').onclick=()=>{LS.set('sp.gv',gvNow()==='cards'?'table':'cards');gvApply()};
  const sy=$('#rsync'); if(sy) sy.onclick=driveSync;
  const a=$('#radd'); if(a) a.onclick=()=>{const name=(prompt('Incipit / Bezeichnung des neuen Eintrags:')||'').trim();if(!name)return;
    {const c={art:S.rart||'Schola-Gesang (Proprium/Choral)',nr:'',name};S.custom.push(c);dbPut('eigene',regKey(c.art,'',c.name),{art:c.art,nr:'',name:c.name})}save();toast('Eintrag angelegt');drawGes()};
}

/* --- Liederbuch --- */
const LCOLS=[{l:'Buch'},{l:'Nr.',num:true},{l:'Titel',nodl:true},{l:'Bereich'},{l:'Einsätze',num:true},{l:'zuletzt',num:true}];
function viewLB(){
  const books=[...new Set(D.hym.map(h=>h[0]))];
  return `<div class="tools"><label>Buch<select id="hbook"><option value="">alle</option>${books.map(b=>`<option ${S.hbook===b?'selected':''} value="${esc(b)}">${esc(b)==='SR'?'SR (Salve Regina)':esc(b)}</option>`).join('')}</select></label>
   <label>Bereich<select id="hber"><option value="">alle</option>${[...new Set(D.hym.filter(h=>h[0]==='SR').map(h=>h[3]))].sort().map(b=>`<option ${S.hber===b?'selected':''}>${esc(b)}</option>`).join('')}</select></label>
   <label>Suche<input type="search" id="hq" value="${esc(S.hq)}" placeholder="Titel oder Nr."></label><span class="count" id="hc"></span></div>
   <div class="tw stk"><table><thead id="hh"></thead><tbody id="hl"></tbody></table></div>
   <details class="hintd"><summary>Hinweise</summary><p class="hint">Standard ist das Salve Regina (SR): Nr. 1–80 Gebete und Andachten, 90–405 Lieder fürs Volk, 410–500 Gregorianische Gesänge (meist Schola, teils Volk bzw. im Wechsel). Spaltenköpfe: Klick = sortieren; Felder darunter = filtern. Keine YouTube-Links im Liederbuch-Register.</p></details>`;
}
function drawLBHead(){$('#hh').innerHTML=tblHead(LCOLS,S.lst,S.lfl,'l',tblVals(D.hym,h=>[h[0],h[1],h[2],h[3],h[4],h[5]],LCOLS));fitStk()}
function drawLB(){
  const q=norm(S.hq);
  const base=D.hym.filter(h=>(!S.hbook||h[0]===S.hbook)&&(!S.hber||h[3]===S.hber)&&(!q||norm(h[1]+' '+h[2]).includes(q)));
  let l=tblApply(base,h=>[h[0],h[1],h[2],h[3],h[4],h[5]],LCOLS,S.lst,S.lfl);
  if(S.lst.c<0) l=l.slice().sort((a,b)=>a[0].localeCompare(b[0])||numKey(a[1])-numKey(b[1]));
  $('#hl').innerHTML=l.slice(0,500).map(h=>`<tr><td><span class="bk">${esc(h[0])}</span></td><td class="num">${esc(h[1])}</td><td>${esc(h[2])}</td><td class="small muted">${esc(h[3])}</td><td class="num">${esc(h[4])}</td><td class="num">${esc(h[5]==='0'?'':h[5])}</td></tr>`).join('')||'<tr><td colspan="6" class="muted">Keine Treffer.</td></tr>';
  $('#hc').textContent=l.length+' Einträge'+(l.length>500?' (erste 500)':'');
}
function bindLB(){drawLBHead();drawLB();tblBind($('#hh'),S.lst,S.lfl,drawLB,drawLBHead);
  $('#hbook').onchange=e=>{S.hbook=e.target.value;const sr=!S.hbook||S.hbook==='SR';if(!sr)S.hber='';$('#hber').value=S.hber;$('#hber').disabled=!sr;drawLB()};$('#hber').disabled=!(!S.hbook||S.hbook==='SR');
  $('#hq').oninput=e=>{S.hq=e.target.value;drawLB()};$('#hber').onchange=e=>{S.hber=e.target.value;drawLB()}}

/* --- Planarchiv --- */
function viewArch(){
  return `<div class="tools"><label>Suche<input type="search" id="aq" value="${esc(S.aq)}" placeholder="Festtyp, Titel, Jahr"></label><span class="count" id="ac"></span></div>
  <div class="tw"><table><thead><tr><th>Festtyp</th><th>Plan</th><th>Jahr</th><th>Schola</th><th>Zeilen</th><th></th></tr></thead><tbody id="al"></tbody></table></div>
  <p class="hint">Alle ausgewerteten Pläne aus dem Archiv. «Als Vorlage» legt den Plan auf den aktuell gewählten Termin.</p>`;
}
function drawArch(){
  const q=norm(S.aq); const l=D.plans.filter(p=>!q||norm(p.c+' '+p.t+' '+p.y+' '+p.v).includes(q)).sort((a,b)=>a.c.localeCompare(b.c,'de')||(b.y||0)-(a.y||0));
  $('#al').innerHTML=l.slice(0,400).map(p=>`<tr><td>${esc(p.c)}</td><td class="small">${esc(p.t)}</td><td class="num">${esc(p.y||'')}</td><td class="small">${esc(p.s)}</td><td class="num">${p.r.length}</td><td><a href="https://drive.google.com/file/d/${p.id}/view" target="_blank" rel="noopener" class="small">Drive</a>${S.sel&&canEdit()?` <button class="btn sm" data-p="${p.id}">Als Vorlage</button>`:''}</td></tr>`).join('');
  $('#ac').textContent=l.length+' Pläne';
}
function bindArch(){drawArch();$('#aq').oninput=e=>{S.aq=e.target.value;drawArch()};
  $('#al').onclick=e=>{const b=e.target.closest('button[data-p]');if(!b)return;const ev=evByKey[S.sel];const t=getTermin(ev);applyTemplate(ev,t,b.dataset.p);setTermin(ev,t);S.tab='termin';render();toast('Vorlage geladen')}}


