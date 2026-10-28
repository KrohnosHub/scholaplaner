const D = window.__D;
const $ = (s,r=document)=>r.querySelector(s);
const esc = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const WD=['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
const MON=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
const fmtD = iso => { const [y,m,d]=iso.split('-').map(Number); return `${String(d).padStart(2,'0')}.${String(m).padStart(2,'0')}.${y}`; };
const wdOf = iso => WD[new Date(iso+'T12:00:00').getDay()];
const norm = s => String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim();

/* ---------- Zustand ---------- */
const LS={get(k,def){try{const v=localStorage.getItem(k);return v?JSON.parse(v):def}catch(e){return def}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const S={tab:'kj',kj:'2026/27',q:'',art:'',status:'',unsure:false,sel:null,role:'org',
  termine:LS.get('sp.termine',{}),reg:LS.get('sp.reg',{}),custom:LS.get('sp.custom',[]),
  month:String(new Date().getMonth()+1),prev:'schola',organ:LS.get('sp.organ',true),nver:LS.get('sp.nver',null),rq:'',rart:'',rfile:'',hq:'',hbook:'SR',hber:'',gst:{c:-1,d:1},gfl:[],lst:{c:-1,d:1},lfl:[],rhid:false,rdup:false,aq:'',aart:''};
const save=()=>{LS.set('sp.termine',S.termine);LS.set('sp.reg',S.reg);LS.set('sp.custom',S.custom)};
let READONLY=LS.get('sp.ro',false);
const showNt=()=>S.nver===null?!READONLY:!!S.nver;
const canEdit=()=>!READONLY,canSchola=()=>true,canOrgan=()=>true;
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

/* ---------- Liturgische Farbe (Heuristik, bitte prüfen) ---------- */
function lcolor(ev){
  const n=ev.n, a=ev.a;
  if(/Advent|Fastensonntag|Septuagesima|Sexagesima|Quinquagesima|Quatember|Passion|Aschermittwoch|Karwoche|Karsamstag|Vigil|Allerseelen|Requiem/.test(n)&&!/Gaudete|Laetare/.test(n)) return 'var(--lv)';
  if(/Gaudete|Laetare/.test(n)) return 'var(--lrose)';
  if(/Pfingstsonntag|Pfingstmontag|Palmsonntag|Karfreitag|Kreuz|Apostel|Petrus|Märtyrer|Stephanus|Unschuldige|Blut|Herz-Jesu-Fest|Urs|Lorenz|Sebastian|Agatha|Cäcilia|Johannes der T|Pfingst/.test(n)&&!/n\. Pfingsten/.test(n)) return 'var(--lr)';
  if(/So\. n\. Pfingsten|n\. Epiphanie|Sühnenacht|Sonntag$/.test(n)&&!/Oster|Weihnacht|Dreifaltigkeit|Christkönig/.test(n)&&a==='Sonntag') return 'var(--lg)';
  if(a==='Quatember'||/Herz-Jesu-Freitag/.test(n)) return a==='Quatember'?'var(--lv)':'var(--lw)';
  if(/Sühnenacht/.test(n)) return 'var(--lw)';
  return 'var(--lw)';
}

/* ---------- Kirchenjahr fortschreiben: Regeln aus den vorhandenen Jahren ableiten und auf weitere Jahre anwenden ---------- */
const KJ_DAY=864e5,kjU=(y,m,d)=>Date.UTC(y,m-1,d),kjIso=t=>new Date(t).toISOString().slice(0,10),kjT=s=>Date.parse(s+'T00:00:00Z'),kjWd=t=>new Date(t).getUTCDay();
const kjOn=(t,w)=>t+((w-kjWd(t)+7)%7)*KJ_DAY;
function kjEaster(y){const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),mo=Math.floor((h+l-7*m+114)/31),da=(h+l-7*m+114)%31+1;return kjU(y,mo,da)}
const kjLabel=y=>y+'/'+String(y+1).slice(2);
/* Feste Wurzeln, deren Regel sich aus 2–3 Beispieljahren nicht eindeutig ableiten lässt (kirchenrechtlich bekannte Regeln) */
const KJ_ROOT={
 '1. Advent':c=>c.adv1,
 'Sonntag in der Weihnachtsoktav':c=>{const t=kjOn(kjU(c.y0,12,26),0);return t<=kjU(c.y0,12,31)?{t}:{t:kjU(c.y0,12,30),u:'kein Sonntag zwischen 26. und 31.12.'}},
 'Namen-Jesu-Fest':c=>{const t=kjOn(kjU(c.y0+1,1,2),0);return t<=kjU(c.y0+1,1,5)?t:kjU(c.y0+1,1,2)},
 'Hl. Familie (1. So. n. Epiphanie)':c=>kjOn(kjU(c.y0+1,1,7),0),
 'Rosenkranzsonntag':c=>kjOn(kjU(c.y0+1,10,1),0),
 'Christkönig':c=>kjOn(kjU(c.y0+1,10,25),0),
 'Kirchweihe (Kirchweihsonntag)':c=>kjOn(kjU(c.y0+1,7,18),0),
 'Hl. Pelagius – Patroziniumssonntag':c=>({t:kjOn(kjU(c.y0+1,8,23),0),u:'Regel unklar (Sonntag ab 23.8. provisorisch)'}),
 'Eidg. Dank-, Buss- und Bettag':c=>kjOn(kjU(c.y0+1,9,15),0),
 'Hl. Josef':c=>kjMove(c,kjU(c.y0+1,3,19)),
 'Mariä Verkündigung':c=>kjMove(c,kjU(c.y0+1,3,25))
};
/* Fest im Karwochen-/Osteroktav-Zeitraum → Montag nach dem Weissen Sonntag; auf Sonntag → Montag */
function kjMove(c,t){if(t>=c.E-7*KJ_DAY&&t<=c.E+7*KJ_DAY)return c.E+8*KJ_DAY;if(kjWd(t)===0)return t+KJ_DAY;return t}
const KJ_SPECIAL=/^(\d+)\. So\. n\. (Pfingsten|Epiphanie)$|^Nachgeholter |^Letzter So\. /;
function kjRules(ref){
  const by={};ref.forEach(e=>(by[e.n]=by[e.n]||[]).push(e));
  const rules={},smp={};
  for(const n in by){const s=by[n].map(e=>({y:parseInt(e.kj,10),t:kjT(e.d)}));smp[n]=s;
    if(KJ_SPECIAL.test(n))continue;
    if(KJ_ROOT[n]){rules[n]={k:'root'};continue}
    if(s.length<2)continue;
    const md=new Set(s.map(x=>new Date(x.t).getUTCMonth()*100+new Date(x.t).getUTCDate()));
    if(md.size===1){rules[n]={k:'fix',m:new Date(s[0].t).getUTCMonth()+1,d:new Date(s[0].t).getUTCDate()};continue}
    const of=new Set(s.map(x=>Math.round((x.t-kjEaster(x.y+1))/KJ_DAY)));
    if(of.size===1&&s.every(x=>kjWd(x.t)===kjWd(s[0].t))){rules[n]={k:'eas',o:[...of][0]};continue}
    if(s.length>=3&&by[n].length>s.length-1&&/^(Herz-Jesu-Freitag|Sühnenacht)/.test(n)){const w=kjWd(s[0].t);if(s.every(x=>kjWd(x.t)===w&&new Date(x.t).getUTCDate()<=7)){rules[n]={k:'mon',w};continue}}}
  /* relative Regeln: konstanter Abstand zu einer bereits bekannten Regel */
  const done=()=>Object.keys(rules);
  for(let pass=0;pass<4;pass++){
    for(const n in by){if(rules[n]||KJ_SPECIAL.test(n))continue;const s=smp[n];if(s.length<2)continue;
      for(const r of done()){if(rules[r].k==='mon'||rules[r].k==='rel')continue;
        const o=new Set();let ok=true;
        for(const x of s){const q=smp[r].find(z=>z.y===x.y);if(!q){ok=false;break}o.add(Math.round((x.t-q.t)/KJ_DAY))}
        if(ok&&o.size===1&&s.length>=2){rules[n]={k:'rel',to:r,o:[...o][0]};break}}}}
  return {rules,by,smp}}
/* Regel für ein Kirchenjahr auswerten → Zeitpunkt (ms) oder null */
function kjEval(R,n,c,memo){
  if(memo[n]!==undefined)return memo[n];
  const r=R.rules[n];let v=null;
  if(!r)v=null;
  else if(r.k==='root'){const x=KJ_ROOT[n](c);v=typeof x==='object'&&x?x:{t:x}}
  else if(r.k==='fix'){const a=kjU(c.y0,r.m,r.d),b=kjU(c.y0+1,r.m,r.d);const t=(a>=c.adv1&&a<c.advN)?a:(b>=c.adv1&&b<c.advN)?b:null;v=t===null?null:{t}}
  else if(r.k==='eas')v={t:c.E+r.o*KJ_DAY};
  else if(r.k==='rel'){const b=kjEval(R,r.to,c,memo);v=b?{t:b.t+r.o*KJ_DAY,u:b.u}:null}
  memo[n]=v;return v}
function genKJ(ref,y0,all){
  const R=kjRules(ref),E=kjEaster(y0+1),adv1=kjOn(kjU(y0,11,27),0),advN=kjOn(kjU(y0+1,11,27),0);
  const lab=kjLabel(y0),c={y0,E,adv1,advN},L=advN-7*KJ_DAY,memo={},out=[],miss=[];
  const prev=(all||ref).filter(e=>e.kj===kjLabel(y0-1)).map(e=>kjT(e.d));
  const start=prev.length?Math.min(adv1,Math.max(...prev)+KJ_DAY):adv1;
  const inK=t=>t>=start&&t<advN;
  c.start=start;
  const latest=n=>R.by[n].slice().sort((a,b)=>b.kj.localeCompare(a.kj))[0];
  const stable=n=>{const l=R.by[n];return l.every(e=>e.note===l[0].note)?l[0].note:''};
  const SUN=['Sonntag','Sonntag (CH)'];
  /* Feste, die in den Beispieljahren auf einem Sonntag den Sonntag verdrängt haben */
  const sunDays=new Set(ref.filter(e=>SUN.includes(e.a)).map(e=>e.d));
  const disp=new Set(ref.filter(e=>!SUN.includes(e.a)&&kjWd(kjT(e.d))===0&&!sunDays.has(e.d)&&['Hochfest','Fest','Marienfest'].includes(e.a)).map(e=>e.n));
  ['Christkönig','Allerheiligen','Mariä Himmelfahrt','Verklärung des Herrn'].forEach(n=>disp.add(n));
  const add=(n,t,src,note,u)=>{const e={d:kjIso(t),n,a:src.a,c:src.c===undefined?null:src.c,note:note===undefined?'':note,kj:lab,pid:src.pid||null,gen:1};if(u)e.note='UNSICHER: '+u+(e.note?' · '+e.note:'');out.push(e);return e};
  const hfv=kjEval(R,'Hl. Familie (1. So. n. Epiphanie)',c,memo),hf=hfv?hfv.t:kjOn(kjU(y0+1,1,7),0);
  const sept=E-63*KJ_DAY;
  /* Verdränger bestimmen */
  const blocked=new Set();
  for(const n in R.rules){if(!disp.has(n))continue;const v=kjEval(R,n,c,memo);if(v)blocked.add(v.t)}
  /* regelbasierte Termine */
  for(const n in R.rules){const r=R.rules[n];if(r.k==='mon')continue;
    const v=kjEval(R,n,c,memo);if(!v){miss.push(n);continue}
    if(!inK(v.t))continue;
    const l=latest(n),e=add(n,v.t,l,stable(n),v.u);
    if(r.k==='fix'&&['Heiligenfest','Marienfest','Fest'].includes(l.a)&&kjWd(v.t)===0&&!disp.has(n)&&!/^UNSICHER/.test(e.note))
      e.note='UNSICHER: fällt auf einen Sonntag – nur Gedächtnis? (Sonntag hat Vorrang)'+(e.note?' · '+e.note:'')}
  /* Sonntage nach Pfingsten: 2.–23. nach Formel, durch Hochfeste/Christkönig verdrängte entfallen */
  const cls=n=>R.by[n]?latest(n):{a:'Sonntag',c:n,pid:null};
  for(let n=2;n<=23;n++){const nm=n+'. So. n. Pfingsten',d=E+(49+7*n)*KJ_DAY;
    if(d>=L||blocked.has(d)||!inK(d))continue;
    const s=cls(nm);add(nm,d,s,stable(nm)||'')}
  /* Sonntage nach Epiphanie */
  for(let n=2;n<=6;n++){const t=hf+7*(n-1)*KJ_DAY,nm=n+'. So. n. Epiphanie';if(t<sept&&inK(t)){const s=R.by[nm]?latest(nm):{a:'Sonntag',c:nm,pid:null};add(nm,t,s,'')}}
  let nEpi=1;while(hf+7*nEpi*KJ_DAY<sept)nEpi++;
  for(let j=1;j<=6-nEpi;j++){const t=L-7*j*KJ_DAY,k=7-j;if(t<=E+210*KJ_DAY||blocked.has(t))continue;
    const src=R.by[k+'. So. n. Epiphanie']?latest(k+'. So. n. Epiphanie'):{a:'Sonntag',c:k+'. So. n. Epiphanie',pid:null};
    add('Nachgeholter '+k+'. So. n. Epiphanie',t,src,'Messformular Epiphanie-Sonntag (nachgeholt)')}
  if(R.by['Letzter So. n. Pfingsten'])add('Letzter So. n. Pfingsten',L,latest('Letzter So. n. Pfingsten'),stable('Letzter So. n. Pfingsten'));
  /* monatlich: 1. Freitag / 1. Samstag */
  const easD=new Set(out.filter(e=>R.rules[e.n]&&R.rules[e.n].k==='eas').map(e=>e.d));
  for(const n in R.rules){const r=R.rules[n];if(r.k!=='mon')continue;
    for(let m=0;m<14;m++){const t=kjOn(kjU(y0,11+m,1),r.w);if(!inK(t))continue;
      if(r.w===5&&easD.has(kjIso(t)))continue;add(n,t,latest(n),stable(n))}}
  out.sort((a,b)=>a.d.localeCompare(b.d)||a.n.localeCompare(b.n,'de'));
  return {events:out,miss}}
/* Weitere Kirchenjahre automatisch anhängen: so viele, dass etwa 14 Monate im Voraus Termine existieren (oder manuell vorausberechnet) */
const KJX={kjs:[],miss:[]};
function kjAppend(events){
  const real=events.slice(),starts=[...new Set(real.map(e=>parseInt(e.kj,10)))].sort();
  if(!starts.length)return events;
  let y0=starts[starts.length-1]+1,all=real.slice(),extra=LS.get('sp.kjx',0);
  const horizon=Date.now()+425*KJ_DAY;
  for(let n=0;n<6;n++,y0++){
    const adv=kjOn(kjU(y0,11,27),0);
    if(adv>horizon&&n>=extra)break;
    try{const g=genKJ(real,y0,all);all=all.concat(g.events);KJX.kjs.push(kjLabel(y0));g.miss.forEach(m=>{if(!KJX.miss.includes(m))KJX.miss.push(m)})}catch(e){console.warn('kjAppend',e);break}}
  return all}

/* ---------- Termine ---------- */
const EV=kjAppend(D.events).map((e,i)=>({...e,key:e.d+'|'+e.n,i}));
const evByKey=Object.fromEntries(EV.map(e=>[e.key,e]));
const plansByCanon={}; D.plans.forEach(p=>{(plansByCanon[p.c]=plansByCanon[p.c]||[]).push(p)});
const planById=Object.fromEntries(D.plans.map(p=>[p.id,p]));
const CANONS=[...new Set(D.plans.map(p=>p.c))].sort((a,b)=>a.localeCompare(b,'de'));
function planScore(p,sch){sch=(sch==='Frauen')?'Frauen':'Männer';let s=0;if(p.s!==sch)s+=5;if(/ohne|Kratzer|Corona|Kurhaus/.test(p.v||''))s+=3;if(/Standard/.test(p.v||''))s-=1;return [s,-(+p.y||0),-(+(p.m||'0').slice(0,4))]}
function bestPlans(can,sch){const l=(plansByCanon[can]||[]).slice();l.sort((a,b)=>{const x=planScore(a,sch),y=planScore(b,sch);return x[0]-y[0]||x[1]-y[1]||x[2]-y[2]});return l}
const planLabel=p=>`${p.t}${p.s!=='Männer'?' · '+p.s:''}${p.y?' · '+p.y:''}${p.m?' · geändert '+p.m.slice(0,7):''}`;
const rowFromArr=a=>({p:a[0]||'',b:a[1]||'',n:a[2]||'',v:a[3]||'',t:a[4]||'',k:a[5]||'L',o:''});
/* Messen: «Ite missa est» steht nach dem Danklied, sonst direkt vor dem Schlussevangelium (nur künftige Termine) */
const TODAY=new Date().toISOString().slice(0,10);
function addIte(rows,ev){
  if(!ev||ev.act||!ev.d||ev.d<TODAY||!Array.isArray(rows)) return rows;
  const ag=rows.find(r=>/^Agnus/i.test(r.p||'')&&/^Messe/i.test(r.t||'')); if(!ag) return rows;
  const old=rows.find(r=>/^Ite\b/i.test(r.p||''));
  const ite=old||{p:'Ite missa est',b:ag.b,n:ag.n,v:'',t:ag.t,k:ag.k||'L',o:''};
  const rest=rows.filter(r=>r!==old);
  let i=-1;
  for(let j=rest.length-1;j>=0;j--){if(/^Dankl|^Dank/i.test(rest[j].p||'')){i=j+1;break}}
  if(i<0){const j=rest.findIndex(r=>/schlussev/i.test(r.p||''));if(j>=0)i=j}
  if(i<0){const j=rest.findIndex(r=>/^Auszug/i.test(r.p||''));i=j>=0?j:rest.length}
  const out=rest.slice();out.splice(i,0,ite);
  return out.length===rows.length&&out.every((r,k)=>r===rows[k])?rows:out}
const AUTO={};
function defaultTermin(ev){
  if(AUTO[ev.key]) return AUTO[ev.key];
  const pid=ev.act||ev.pid, p=pid&&planById[pid];
  const t={sch:'Männer',tpl:pid||'',rows:p?addIte(p.r.map(rowFromArr),ev):[],note:'',status:p?(ev.act?'fertig':'Vorschlag'):'offen',src:ev.act?'archiv':'vorschlag'};
  if(p){const a=applyReg(ev,t.rows);t.rows=a.rows;t.regInfo=a.info}
  return AUTO[ev.key]=t;
}
function getTermin(ev){const t=S.termine[ev.key];if(!t)return defaultTermin(ev);const r=addIte(t.rows,ev);if(r!==t.rows)t.rows=r;return t}
/* ---------- Zuordnung Gesang <-> Fest (aus dem Register) ---------- */
const stripCnt=x=>String(x||'').replace(/\s*\(\d+\)/g,'');
const posClass=p=>{p=norm(p);return /introit|lntroit|int?roitus/.test(p)?'int':/gradual|allelu|tractus/.test(p)?'gra':/offert|opfer/.test(p)?'off':/commun|kommun/.test(p)?'com':p};
const cleanName=n=>norm(String(n||'').replace(/\(.*?\)/g,' ').replace(/\b(Männerschola|Frauenschola|Schola)\b/gi,' '));
const sameT=(t,n)=>{const a=cleanName(t),b=cleanName(n);return a.length>=5&&b.length>=5&&(a===b||a.startsWith(b)||b.startsWith(a))};
const chantPos=r=>String(r.po||'').split(/\s*[\/,]\s*/)[0]||'Communio';
/* Reihenfolge nach Messordnung */
const MESS=[/einzug/,/introit|int?roitus/,/kyrie/,/gloria/,/gradual|allelu|tractus|sequenz/,/credo/,/predigt/,/offert|opfer/,/sanctus/,/agnus/,/commun|kommun/,/dank/,/ite missa|schluss/,/auszug/];
const messRank=p=>{p=String(p||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();const i=MESS.findIndex(x=>x.test(p));return i<0?4.5:i};
const byMess=(a,b)=>messRank(chantPos(a))-messRank(chantPos(b));
const assignedTo=c=>c?REG().filter(r=>!r.hide&&r.fx&&r.fe.includes(c)).sort(byMess):[];
const dropped=c=>c?REG().filter(r=>!r.hide&&r.fx&&r.fe0.includes(c)&&!r.fe.includes(c)):[];
function insertChant(rows,r){
  const cls=posClass(chantPos(r)); const title=r.name;
  if(rows.some(x=>x.k==='G'&&(sameT(x.t,title)||sameT(x.t,r.orig)))) return 'vorhanden';
  const i=rows.findIndex(x=>x.k==='G'&&posClass(x.p)===cls&&!REG().some(y=>y.fx&&y.key!==r.key&&sameT(x.t,y.name)));
  if(i>=0){rows[i]={...rows[i],t:title,n:'',v:'',b:'',o:''};return 'ersetzt'}
  let j=rows.findIndex(x=>/auszug|schluss|stille/i.test(x.p||'')); if(j<0) j=rows.length;
  rows.splice(j,0,{p:chantPos(r),b:'',n:'',v:'',t:title,k:'G',o:''});return 'ergänzt'}
function applyReg(ev,rows){
  const info={add:[],del:[]}; if(!ev||!ev.c||ev.act) return {rows,info};
  rows=rows.slice();
  dropped(ev.c).forEach(r=>{const n0=rows.length;rows=rows.filter(x=>!(x.k==='G'&&(sameT(x.t,r.name)||sameT(x.t,r.orig))));if(rows.length<n0)info.del.push(r.name)});
  assignedTo(ev.c).forEach(r=>{const a=insertChant(rows,r);if(a!=='vorhanden')info.add.push(r.name)});
  return {rows,info}}

function setTermin(ev,t){delete t.src;delete t.regInfo;S.termine[ev.key]=t;save();dbPut('termine',ev.key,{sch:t.sch,tpl:t.tpl||'',rows:JSON.stringify(t.rows),note:t.note||'',status:t.status,vars:JSON.stringify(t.vars||{})})}
function applyTemplate(ev,t,pid){
  const p=planById[pid]; if(!p) return;
  t.tpl=pid; {const a=applyReg(ev,addIte(p.r.map(rowFromArr),ev));t.rows=a.rows;t.regInfo=a.info}
  if(p.s&&p.s!=='Männer'&&!t.schaSet) t.sch='Männer';
  if(t.status==='offen'||t.status==='Vorschlag') t.status='Entwurf';
}
function statusOf(ev){return getTermin(ev).status}

/* ---------- Register-Zugriff ---------- */
const regKey=(a,nr,name)=>a+'|'+nr+'|'+name;
const REG=()=>{
  const base=D.chants.map(c=>({art:c[0],nr:c[1],name:c[2],use:c[3],cnt:c[4],last:c[5],hint:c[6],yt:c[7]||'',cn:c[8]||'',on:c[9]||'',fe0:c[10]||[],po0:c[11]!=null?c[11]:(c[3]||''),key:regKey(c[0],c[1],c[2]),base:true}));
  const cu=S.custom.map(c=>({art:c.art,nr:c.nr||'',name:c.name,use:'',cnt:'',last:'',hint:'',yt:'',fe0:[],po0:'',key:regKey(c.art,c.nr||'',c.name),base:false}));
  return base.concat(cu).map(r=>{const o=S.reg[r.key]||{};const x={...r,orig:r.name,onr:r.nr,hide:!!o.hide};
    ['cn','yt','on'].forEach(k=>{if(o[k]==='-')x[k]='';else if(o[k])x[k]=o[k]});if(o.nt)x.nt=o.nt;x.fx=Array.isArray(o.fe);x.fe=x.fx?o.fe:x.fe0;x.po=o.po!=null&&o.po!==''?o.po:x.po0;if(o.nm)x.name=o.nm;if(o.nrs)x.nr=o.nr||'';x.raw={cn:x.cn||'',on:x.on||'',nt:x.nt||''};const nl=normLinks(x);x.cn=nl.cn;x.on=nl.on;x.nt=nl.nt;return x});
};
/* Links: «Bezeichnung|URL ; Bezeichnung|URL» oder nur URLs */
const parseLinks=s=>String(s||'').split(/\s*;\s*/).map(x=>x.trim()).filter(Boolean).map(x=>{const i=x.indexOf('|');return i>0&&/^https?:/.test(x.slice(i+1))?{l:x.slice(0,i).replace(/^Choralnoten\b/i,'Choral').replace(/^Organistennoten\b/i,'Orgel'),u:x.slice(i+1)}:/^https?:/.test(x)?{l:'',u:x}:null}).filter(Boolean);
const partOf=p=>{const m=/(?:^|[^A-Za-z])(Kyrie|Gloria|Sanctus|Agnus|Ite\b)/i.exec(String(p||'').trim());return m?m[1].toLowerCase():''};
const lnkStr=l=>l.map(x=>(x.l?x.l+'|':'')+x.u).join(' ; ');
/* Links eines Gesangs; bei Messteilen (Kyrie, Gloria …) nur die Links mit passender Teil-Bezeichnung */
const linksFor=(s,pos)=>{const l=parseLinks(s),pp=partOf(pos);if(!pp)return l;if(!l.some(x=>partOf(x.l)))return l;return l.filter(x=>!partOf(x.l)||partOf(x.l)===pp)};

/* ---- Notator-Dateien (nt) und Link-Bereinigung ---- */
const ntMid=u=>{const m=/\/d\/([\w-]{15,})|[?&]id=([\w-]{15,})|^([\w-]{25,})$/.exec(String(u||'').trim());return m&&(m[1]||m[2]||m[3])};
/* nt: eine Datei (URL/ID) oder «Teil|URL ; Teil|URL» (z. B. Kyrie, Gloria …) */
const ntParse=s=>String(s||'').split(/\s*;\s*/).map(x=>x.trim()).filter(Boolean).map(x=>{const i=x.indexOf('|');const l=i>0&&!/^https?:/.test(x.slice(0,i))?x.slice(0,i).trim():'';const u=(l?x.slice(i+1):x).trim();return ntMid(u)?{l,u}:null}).filter(Boolean);
const ntStr=l=>l.map(x=>(x.l?x.l+'|':'')+x.u).join(' ; ');
const PART_RANK=[/introit/i,/kyrie/i,/gloria/i,/graduale|tractus|absolve|alleluia/i,/sequenz|dies irae/i,/credo/i,/offert/i,/sanctus/i,/agnus/i,/communio|kommunion/i,/^ite\b/i];
const partRank=l=>{const i=PART_RANK.findIndex(r=>r.test(l||''));return i};
const sortParts=a=>a.map((x,i)=>({x,i,r:partRank(x.l)})).sort((p,q)=>p.r-q.r||p.i-q.i).map(p=>p.x);
const NT_LAB=/\.notator|Notator-Datei/i;
/* Bezeichnung bereinigen: «Choral»/«Orgel»/«(Notator-PDF)» sind überflüssig; Messteil bleibt */
const cleanLab=l=>{let s=String(l||'').trim();
  s=s.replace(/^.*_(Kyrie|Gloria|Sanctus|Agnus Dei|Ite missa est)$/i,'$1');
  s=s.replace(/\s*[–-]?\s*Notator-Datei.*$/i,'').replace(/\s*\(\.notator\)\s*$/i,'');
  s=s.replace(/\s*\((?:Choral|Orgel)[^)]*\)\s*$/i,'').replace(/\s*[–-]\s*(?:Choral|Orgel)\s*$/i,'');
  if(/^(Choral|Orgel|Choralnoten|Organistennoten)(\b.*)?$/i.test(s)) s='';
  return s.trim()};
const dedupL=a=>{const seen=new Set();return a.filter(x=>{const k=ntMid(x.u)||x.u;if(seen.has(k))return false;seen.add(k);return true})};
function normLinks(x){
  let nts=ntParse(x.nt); const out={};
  for(const k of ['cn','on']){const keep=[];
    for(const l of parseLinks(x[k])){
      if(NT_LAB.test(l.l||'')){const lab=cleanLab(l.l);if(!nts.some(n=>ntMid(n.u)===ntMid(l.u)))nts.push({l:lab,u:l.u});continue}
      keep.push({l:cleanLab(l.l),u:l.u})}
    out[k]=lnkStr(sortParts(dedupL(keep)))}
  nts=sortParts(dedupL(nts.map(n=>({l:cleanLab(n.l),u:n.u}))));
  return {cn:out.cn,on:out.on,nt:ntStr(nts)}}
/* bereinigte Links dauerhaft im Register speichern (nur Bearbeiter) */
function persistNorm(){let n=0;
  REG().forEach(r=>{const w=r.raw;if(!w||(w.cn===r.cn&&w.on===r.on&&w.nt===r.nt))return;
    const ob=S.reg[r.key]=S.reg[r.key]||{};ob.cn=r.cn||(w.cn?'-':'');ob.on=r.on||(w.on?'-':'');ob.nt=r.nt||'';save();regPut(r.key);n++});
  return n}
const lnkHtml=(s,lab)=>parseLinks(s).map((x,i,a)=>`<a class="l1" href="${esc(x.u)}" target="_blank" rel="noopener">${esc(x.l||(a.length>1?lab+' '+(i+1):lab))}</a>`).join('');
const ntTitle=n=>String(n||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\(.*?\)/g,' ').replace(/\b(Männerschola|Maennerschola|Frauenschola|Männerchor|Chörli|Chor|Schola)\b/gi,' ').replace(/\bSR\s*\d+/gi,' ').replace(/[….:;*]+/g,' ').replace(/\s+/g,' ').trim().split(/\s+/).slice(0,6).join(' ');
const ntLink=(n,x)=>'https://krohnoshub.github.io/notator/#drive='+ntMid(x.u)+'&song='+encodeURIComponent(ntTitle(n));
const ntUrl=(n,c,pos)=>{const t=encodeURIComponent(ntTitle(n));
  if(c&&c.nt){const l=ntParse(c.nt),pp=partOf(pos);
    const x=(pp&&l.find(y=>partOf(y.l)===pp))||l.find(y=>!y.l)||(!pp&&l[0]);
    if(x)return ntLink(n,x)}
  return 'https://krohnoshub.github.io/notator/#song='+t};
const regPut=k=>{const o=S.reg[k]||{};dbPut('register',k,{cn:o.cn||'',yt:o.yt||'',on:o.on||'',nm:o.nm||'',nr:o.nr||'',nrs:!!o.nrs,hide:!!o.hide,fe:Array.isArray(o.fe)?JSON.stringify(o.fe):'',po:o.po||'',nt:o.nt||''})};
/* ---------- Tabellen: Sortieren + Filtern je Spalte ---------- */
const numKey=v=>{const m=String(v??'').match(/\d+/);return m?parseInt(m[0],10):1e9};
function tblApply(rows,get,cols,st,fl){
  let l=rows.filter(r=>{const v=get(r);return cols.every((c,i)=>{const f=fl[i];if(!f)return true;const x=String(v[i]??'');if(f==='(leer)')return !x.trim();if(f==='(vorhanden)')return !!x.trim();return norm(x).includes(norm(f))})});
  if(st.c>=0){const c=st.c,num=cols[c].num;l=l.map(r=>[r,get(r)[c]]).sort((a,b)=>{let x=a[1],y=b[1];
    if(num){const d=numKey(x)-numKey(y);if(d)return d*st.d}
    return String(x??'').localeCompare(String(y??''),'de',{numeric:true})*st.d}).map(z=>z[0])}
  return l;
}
function tblVals(rows,get,cols){return cols.map((c,i)=>{if(c.nofilter||c.nodl)return null;const set=new Set();rows.forEach(r=>{const x=String(get(r)[i]??'').trim();if(x&&x.length<=60)set.add(x)});if(set.size>150)return null;const a=[...set].sort((x,y)=>x.localeCompare(y,'de',{numeric:true}));return c.link?['(vorhanden)','(leer)']:a})}
function tblHead(cols,st,fl,pre,vals){
  return '<tr>'+cols.map((c,i)=>c.nosort?`<th>${c.l}</th>`:`<th class="sortable" data-c="${i}" role="button" tabindex="0" title="Sortieren">${c.l}<span class="ar">${st.c===i?(st.d>0?' ▲':' ▼'):''}</span></th>`).join('')+'</tr>'
   +'<tr class="fr">'+cols.map((c,i)=>c.nofilter?'<th></th>':`<th><input class="cf" data-c="${i}" type="search" list="dl-${pre||'t'}-${i}" placeholder="wählen / tippen" value="${esc(fl[i]||'')}" aria-label="Filter ${esc(c.l)}">${(vals&&vals[i]&&vals[i].length)?`<datalist id="dl-${pre||'t'}-${i}">${vals[i].map(v=>`<option value="${esc(v)}">`).join('')}</datalist>`:''}</th>`).join('')+'</tr>';
}
function tblBind(root,st,fl,redraw,rehead){
  root.onclick=e=>{const th=e.target.closest('th.sortable');if(!th)return;const c=+th.dataset.c;if(st.c===c)st.d=-st.d;else{st.c=c;st.d=1}rehead();redraw()};
  root.onkeydown=e=>{if(e.key==='Enter'){const th=e.target.closest('th.sortable');if(th)th.click()}};
  root.oninput=e=>{const i=e.target.closest('.cf');if(!i)return;fl[+i.dataset.c]=i.value;redraw()};
}
const isChant=r=>r.k==='G'||(r.b==='SR'&&/^\d+/.test(r.n||'')&&parseInt(r.n,10)>=410&&parseInt(r.n,10)<=500);
function lookupChant(row,reg){
  const t=norm(row.t); if(!t&&!row.n) return null;
  if(row.b==='SR'&&row.n){const x=reg.find(r=>!r.hide&&r.nr==='SR '+row.n)||reg.find(r=>r.nr==='SR '+row.n);if(x) return x}
  if(!t) return null;
  const hit=(n)=>{const m=norm(n);return m&&(m===t||(t.length>=8&&m.startsWith(t.slice(0,Math.min(t.length,24))))||(m.length>=8&&t.startsWith(m.slice(0,24))))};
  return reg.find(r=>!r.hide&&(hit(r.name)||hit(r.orig)))||reg.find(r=>hit(r.name)||hit(r.orig))||null;
}

/* ---------- Plan-Text ---------- */
function rowNr(r){
  if(r.k==='G') return '';
  if(r.k==='O') return '';
  const bk=r.b&&r.b!=='SR'?r.b+' ':'';
  return (bk+(r.n||'')+(r.v?', '+r.v:'')).trim();
}
function rowTitle(r){
  if(r.k==='O') return r.t||'Orgel';
  if(r.k==='G') return (r.t||'')+(r.t?' (Schola)':'');
  return r.t||'';
}
function planText(ev,t){
  const lines=[`${ev.n}`,`${wdOf(ev.d)}, ${fmtD(ev.d)}`,''];
  t.rows.forEach(r=>{const n=rowNr(r);lines.push(`${r.p}: ${n?n+'  ':''}${rowTitle(r)}`.trim())});
  return lines.join('\n');
}

/* ---------- Ansichten ---------- */
const TABS=[['kj','Kirchenjahr'],['termin','Termin'],['ges','Gesänge (Choral)'],['lb','Liederbuch'],['arch','Planarchiv'],['abg','Abgleich 2025/26'],['chk','Prüfen'],['daten','Daten & Hilfe']];
function renderTabs(){
  $('#tabs').innerHTML=TABS.map(([k,l])=>`<button role="tab" data-tab="${k}" aria-selected="${S.tab===k}">${l}</button>`).join('');
}
function render(){
  renderTabs();
  const v=$('#view');v.onclick=null;
  if(S.tab==='kj') v.innerHTML=viewKJ(), bindKJ();
  else if(S.tab==='termin') v.innerHTML=viewTermin(), bindTermin();
  else if(S.tab==='ges') v.innerHTML=viewGes(), bindGes();
  else if(S.tab==='lb') v.innerHTML=viewLB(), bindLB();
  else if(S.tab==='arch') v.innerHTML=viewArch(), bindArch();
  else if(S.tab==='abg') v.innerHTML=viewAbg(), bindAbg();
  else if(S.tab==='chk') v.innerHTML=viewChk(), bindChk();
  else v.innerHTML=viewDaten(), bindDaten();
}

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
    if(!G.has(r.name))G.set(r.name,{t:r.name,lab:String(r.art||'').split('(')[0].trim()+(r.nr?' · '+r.nr:'')})});
  D.hym.forEach(h=>{const num=h[0]==='SR'&&/^\d+/.test(h[1]);const v=num?'SR '+h[1]+' · '+h[2]:h[2];
    if(!L.has(v))L.set(v,num?{b:'SR',n:h[1],t:h[2],lab:h[3]||''}:{b:'',n:'',t:h[2],lab:h[0]!==h[2]?h[0]:''})});
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
     <td class="c-t"><input type="text" data-f="t" value="${esc(r.t)}" ${r.k==='O'?'':'list="cat'+(r.k==='G'?'G':'L')+'" placeholder="Katalog durchsuchen oder frei eintippen"'} ${d}></td>
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
  window._rsCtx={commit,pv};
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


/* ---------- Einmalig: Sammel-PDFs in Einzel-PDFs aufteilen, in Drive ablegen, im Register verlinken ---------- */
const SPL_ART='Schola-Gesang (Proprium/Choral)', SPL_FOLDER='1na4i6KGlePisA8ENF0tQU6mOdrBnd_PO', AH_CUT=0.5103;
/* part: file (Drive-Name), pages (0-basiert), y (optionaler vertikaler Ausschnitt 0..1), key (Registereintrag, Anfang des Incipits), entry (Name, falls neu), label (Linkname) */
const SPLITS=[
 {name:'Allerheiligen',src:'14u80_mC95i_qz-Ff85zwTri_i-1IcGE3',n:5,parts:[
  {file:'Gaudeamus... sanctorum omnium (aus Sammel-PDF) – Choral.pdf',old:['Introitus Gaudeamus (Allerheiligen).pdf','Gaudeamus omnes in Domino (Allerheiligen, Introitus) – Choral.pdf','Gaudeamus omnes in Domino (Allerheiligen) – Choral.pdf'],pos:'Introitus',fest:'Allerheiligen (1.11.)',pages:[0],key:'Gaudeamus',label:'Introitus Allerheiligen'},
  {file:'Timete Dominum – Choral.pdf',old:['Graduale Timete Dominum (Allerheiligen).pdf','Timete Dominum (Allerheiligen, Graduale) – Choral.pdf','Timete Dominum omnes sancti eius (Allerheiligen, Graduale) – Choral.pdf'],pos:'Graduale / Alleluia / Sequenz',fest:'Allerheiligen (1.11.)',pages:[1],y:[0,AH_CUT],key:'Timete Dominum',entry:'Timete Dominum…',label:'Graduale Allerheiligen'},
  {file:'Venite ad me – Choral.pdf',old:['Alleluia Venite ad me (Allerheiligen).pdf','Venite ad me (Allerheiligen, Alleluia) – Choral.pdf','Venite ad me omnes (Allerheiligen, Alleluia) – Choral.pdf'],pos:'Graduale / Alleluia / Sequenz',fest:'Allerheiligen (1.11.)',pages:[1],y:[AH_CUT,1],key:'Timete Dominum',entry:'Timete Dominum…',label:'Alleluia Allerheiligen'},
  {file:'Justorum animae – Choral.pdf',old:['Offertorium Justorum animae (Allerheiligen).pdf','Justorum animae (Allerheiligen, Offertorium) – Choral.pdf'],pos:'Offertorium',fest:'Allerheiligen (1.11.)',pages:[2],key:'Justorum animae',label:'Offertorium Allerheiligen'},
  {file:'Beati mundo corde – Choral.pdf',old:['Communio Beati mundo corde (Allerheiligen).pdf','Beati mundo corde (Allerheiligen, Communio) – Choral.pdf'],pos:'Communio',fest:'Allerheiligen (1.11.)',pages:[3],key:'Beati mundo corde',label:'Communio Allerheiligen'},
  {file:'Beati mundo corde (Psalmton) – Choral.pdf',old:['Communio Beati mundo corde – Psalmton (Allerheiligen).pdf','Beati mundo corde (Allerheiligen, Communio Psalmton) – Choral.pdf'],pos:'Communio',fest:'Allerheiligen (1.11.)',pages:[4],key:'Beati mundo corde',label:'Communio Psalmton Allerheiligen'}]},
 {name:'Weihnachten (Tagesmesse)',src:'1xH5_bUPGZfKuZs5Tg9moIvGfhXgWuXkU',n:7,parts:[
  {file:'Puer natus est nobis – Choral.pdf',old:['Puer natus est nobis (Weihnachten Tagesmesse, Introitus) – Choral.pdf'],pos:'Introitus',fest:'Weihnachten – Tagesmesse',pages:[0],key:'Puer natus est nobis',label:'Introitus Weihnachten Tagesmesse'},
  {file:'Puer natus est nobis – Orgel.pdf',old:['Puer natus est nobis (Weihnachten Tagesmesse, Introitus) – Orgel.pdf'],pos:'Introitus',fest:'Weihnachten – Tagesmesse',pages:[1,2],key:'Puer natus est nobis',label:'Orgel Introitus Weihnachten Tagesmesse'},
  {file:'Viderunt omnes (Graduale) – Choral.pdf',old:['Viderunt omnes (Weihnachten Tagesmesse, Graduale) – Choral.pdf','Viderunt omnes fines terrae (Weihnachten Tagesmesse, Graduale) – Choral.pdf'],pos:'Graduale / Alleluia / Sequenz',fest:'Weihnachten – Tagesmesse',pages:[3],key:'Viderunt omnes (Graduale)',label:'Graduale Weihnachten Tagesmesse'},
  {file:'Dies sanctificatus – Choral.pdf',old:['Dies sanctificatus (Weihnachten Tagesmesse, Alleluia) – Choral.pdf','Dies sanctificatus illuxit nobis (Weihnachten Tagesmesse, Alleluia) – Choral.pdf'],pos:'Graduale / Alleluia / Sequenz',fest:'Weihnachten – Tagesmesse',pages:[4],key:'Dies sanctificatus (Alleluia)',label:'Alleluia Weihnachten Tagesmesse'},
  {file:'Tui sunt caeli – Choral.pdf',old:['Tui sunt caeli (Weihnachten Tagesmesse, Offertorium) – Choral.pdf'],pos:'Offertorium',fest:'Weihnachten – Tagesmesse',pages:[5],key:'Tui sunt caeli',label:'Offertorium Weihnachten Tagesmesse'},
  {file:'Viderunt omnes (Communio) – Choral.pdf',old:['Viderunt omnes (Weihnachten Tagesmesse, Communio) – Choral.pdf','Viderunt omnes fines terrae (Weihnachten Tagesmesse, Communio) – Choral.pdf'],pos:'Communio',fest:'Weihnachten – Tagesmesse',pages:[6],key:'Viderunt omnes (Communio)',label:'Communio Weihnachten Tagesmesse'}]},
 {name:'Gründonnerstag',src:'1evG3ruL8DFI3sbIT_NZmacHs156wJWb5',n:6,parts:[
  {file:'Nos autem gloriari – Choral.pdf',old:['Nos autem gloriari (Gründonnerstag, Introitus) – Choral.pdf','Nos autem gloriari oportet (Gründonnerstag, Introitus) – Choral.pdf'],pos:'Introitus',fest:'Gründonnerstag',pages:[0],key:'Nos autem gloriari',label:'Introitus Gründonnerstag'},
  {file:'Nos autem gloriari – Orgel.pdf',old:['Nos autem gloriari (Gründonnerstag, Introitus) – Orgel.pdf','Nos autem gloriari oportet (Gründonnerstag, Introitus) – Orgel.pdf'],pos:'Introitus',fest:'Gründonnerstag',pages:[1,2],key:'Nos autem gloriari',label:'Orgel Introitus Gründonnerstag'},
  {file:'Christus factus est – Choral.pdf',old:['Christus factus est (Gründonnerstag, Graduale) – Choral.pdf','Christus factus est pro nobis (Gründonnerstag, Graduale) – Choral.pdf'],pos:'Graduale / Alleluia / Sequenz',fest:'Gründonnerstag',pages:[3,4],key:'Christus factus est',label:'Graduale Gründonnerstag'},
  {file:'Dextera Domini (Gründonnerstag) – Choral.pdf',old:['Dextera Domini (Gründonnerstag, Offertorium) – Choral.pdf','Dextera Domini fecit virtutem (Gründonnerstag, Offertorium) – Choral.pdf'],pos:'Offertorium',fest:'Gründonnerstag',pages:[5],key:'Dextera Domini',label:'Offertorium Gründonnerstag'}]},
 {name:'Osternacht',src:'1KzjRHltKasJv1p7dHnWxu508CUFwaD1x',n:5,parts:[
  {file:'Cantemus Domino – Choral.pdf',old:['Cantemus Domino (Osternacht, Cantica) – Choral.pdf'],pos:'Sonstiges',fest:'Osternacht',pages:[0],key:'Cantemus Domino (Osternacht)',label:'Cantica Osternacht'},
  {file:'Alleluia (Osternacht) – Choral.pdf',old:['Alleluia (Osternacht, Zwischengesang) – Choral.pdf'],pos:'Graduale / Alleluia / Sequenz',fest:'Osternacht',pages:[1],key:'Alleluia Osternacht',label:'Alleluia Osternacht'},
  {file:'Et valde mane – Choral.pdf',old:['Et valde mane (Osternacht, Benedictus-Antiphon) – Choral.pdf','Et valde mane una sabbatorum (Osternacht, Benedictus-Antiphon) – Choral.pdf'],pos:'Sonstiges',fest:'Osternacht',pages:[4],key:'Et valde mane',label:'Benedictus Osternacht'}]},
 {name:'Ostersonntag',src:'1VMcqgRFTQfOSKttA_Dqhi71ko4Mdo3TL',n:5,parts:[
  {file:'Haec dies – Choral.pdf',old:['Haec dies (Ostersonntag, Graduale) – Choral.pdf','Haec dies quam fecit Dominus (Ostersonntag, Graduale) – Choral.pdf'],pos:'Graduale / Alleluia / Sequenz',fest:'Ostersonntag',pages:[1],key:'Haec dies',label:'Graduale Ostersonntag'},
  {file:'Pascha nostrum (Alleluia) – Choral.pdf',old:['Pascha nostrum (Ostersonntag, Alleluia) – Choral.pdf','Pascha nostrum immolatus est Christus (Ostersonntag, Alleluia) – Choral.pdf'],pos:'Graduale / Alleluia / Sequenz',fest:'Ostersonntag',pages:[2],key:'Alleluia Pascha nostrum',label:'Alleluia Ostersonntag'},
  {file:'Terra tremuit – Choral.pdf',old:['Terra tremuit (Ostersonntag, Offertorium) – Choral.pdf','Terra tremuit et quievit (Ostersonntag, Offertorium) – Choral.pdf'],pos:'Offertorium',fest:'Ostersonntag',pages:[3],key:'Terra tremuit',label:'Offertorium Ostersonntag'},
  {file:'Pascha nostrum (Communio) – Choral.pdf',old:['Pascha nostrum (Ostersonntag, Communio) – Choral.pdf','Pascha nostrum immolatus est Christus (Ostersonntag, Communio) – Choral.pdf'],pos:'Communio',fest:'Ostersonntag',pages:[4],key:'Communio Pascha nostrum',label:'Communio Ostersonntag'}]},
 {name:'1. Advent',src:'1hyXN2BBdoilYR5jjP5NLuN_Y1cRg1p4M',n:5,parts:[
  {file:'Ad te levavi – Choral.pdf',old:['Ad te levavi (1. Advent, Introitus) – Choral.pdf','Ad te levavi animam meam (1. Advent, Introitus) – Choral.pdf'],pos:'Introitus',fest:'1. Advent',pages:[0],key:'Ad te levavi animam meam',label:'Introitus 1. Advent'},
  {file:'Universi qui te exspectant – Choral.pdf',old:['Universi qui te exspectant (1. Advent, Graduale + Alleluia) – Choral.pdf'],pos:'Graduale / Alleluia / Sequenz',fest:'1. Advent',pages:[1,2],key:'Universi qui te exspectant',label:'Graduale + Alleluia 1. Advent'},
  {file:'Ad te Domine levavi – Choral.pdf',old:['Ad te Domine levavi (1. Advent, Offertorium) – Choral.pdf','Ad te Domine levavi animam meam (1. Advent, Offertorium) – Choral.pdf'],pos:'Offertorium',fest:'1. Advent',pages:[3],key:'Ad te Domine levavi',label:'Offertorium 1. Advent'},
  {file:'Dominus dabit – Choral.pdf',old:['Dominus dabit (1. Advent, Communio) – Choral.pdf','Dominus dabit benignitatem (1. Advent, Communio) – Choral.pdf'],pos:'Communio',fest:'1. Advent',pages:[4],key:'Dominus dabit benignitatem',label:'Communio 1. Advent'}]},
 {name:'4. Advent (Rorate)',src:'11HetNqn0K0KG4ud8PwZS7jMdYbNSgjM-',n:5,parts:[
  {file:'Rorate caeli – Choral.pdf',old:['Rorate caeli (4. Advent, Introitus) – Choral.pdf','Rorate caeli desuper (4. Advent, Introitus) – Choral.pdf'],pos:'Introitus',fest:'4. Advent',pages:[0],key:'Rorate caeli',label:'Introitus 4. Advent'},
  {file:'Rorate caeli (Gloria Patri) – Choral.pdf',old:['Rorate caeli (4. Advent, Gloria Patri Introitus) – Choral.pdf','Rorate caeli desuper (4. Advent, Gloria Patri Introitus) – Choral.pdf'],pos:'Introitus',fest:'4. Advent',pages:[1],key:'Rorate caeli',label:'Gloria Patri Introitus 4. Advent'},
  {file:'Prope est Dominus – Choral.pdf',old:['Prope est Dominus (4. Advent, Graduale + Alleluia) – Choral.pdf','Prope est Dominus omnibus invocantibus eum (4. Advent, Graduale + Alleluia) – Choral.pdf'],pos:'Graduale / Alleluia / Sequenz',fest:'4. Advent',pages:[2],key:'Prope est Dominus',label:'Graduale + Alleluia 4. Advent'},
  {file:'Ave Maria – Choral.pdf',old:['Ave Maria (4. Advent, Offertorium) – Choral.pdf','Ave Maria gratia plena (4. Advent, Offertorium) – Choral.pdf'],pos:'Offertorium',fest:'4. Advent',pages:[3],key:'Ave Maria',label:'Offertorium 4. Advent'},
  {file:'Ecce virgo concipiet – Choral.pdf',old:['Ecce virgo concipiet (4. Advent, Communio) – Choral.pdf'],pos:'Communio',fest:'4. Advent',pages:[4],key:'Ecce virgo concipiet',label:'Communio 4. Advent'}]},
 {name:'Reminiscere (Datei «Advent_2»)',src:'11nWU02NBL90XSW7Yoa9qJt3aIvxLGa1Q',n:5,parts:[
  {file:'Reminiscere – Orgel.pdf',old:['Reminiscere (2. Fastensonntag, Introitus) – Orgel.pdf','Reminiscere miserationum tuarum (2. Fastensonntag, Introitus) – Orgel.pdf'],pos:'Introitus',fest:'2. Fastensonntag (Reminiscere)',pages:[0,1],key:'Reminiscere miserationum tuarum',label:'Orgel Introitus 2. Fastensonntag'},
  {file:'Meditabor – Orgel.pdf',old:['Meditabor (2. Fastensonntag, Offertorium) – Orgel.pdf','Meditabor in mandatis tuis (2. Fastensonntag, Offertorium) – Orgel.pdf'],pos:'Offertorium',fest:'2. Fastensonntag (Reminiscere)',pages:[2],key:'Meditabor in mandatis tuis',label:'Orgel Offertorium 2. Fastensonntag'},
  {file:'Intellige clamorem – Orgel.pdf',old:['Intellige clamorem (2. Fastensonntag, Communio) – Orgel.pdf','Intellige clamorem meum (2. Fastensonntag, Communio) – Orgel.pdf'],pos:'Communio',fest:'2. Fastensonntag (Reminiscere)',pages:[3],key:'Intellige clamorem meum',label:'Orgel Communio 2. Fastensonntag'},
  {file:'Intellige clamorem – Choral.pdf',old:['Intellige clamorem (2. Fastensonntag, Communio) – Choral.pdf','Intellige clamorem meum (2. Fastensonntag, Communio) – Choral.pdf'],pos:'Communio',fest:'2. Fastensonntag (Reminiscere)',pages:[4],key:'Intellige clamorem meum',label:'Communio 2. Fastensonntag'}]},
 {name:'3. Sonntag nach Erscheinung',src:'1RUhNbAIEm0RA7MCfQYkHDvMeDWFje9r-',n:7,parts:[
  {file:'Adorate Deum – Choral.pdf',old:['Adorate Deum (3. So. n. Epiphanie, Introitus) – Choral.pdf','Adorate Deum omnes angeli eius (3. So. n. Epiphanie, Introitus) – Choral.pdf'],pos:'Introitus',fest:'3. So. n. Epiphanie',pages:[0],key:'Adorate Deum',label:'Introitus 3. So. n. Epiphanie'},
  {file:'Adorate Deum – Orgel.pdf',old:['Adorate Deum (3. So. n. Epiphanie, Introitus) – Orgel.pdf','Adorate Deum omnes angeli eius (3. So. n. Epiphanie, Introitus) – Orgel.pdf'],pos:'Introitus',fest:'3. So. n. Epiphanie',pages:[1,2],key:'Adorate Deum',label:'Orgel Introitus 3. So. n. Epiphanie'},
  {file:'Timebunt gentes – Choral.pdf',old:['Timuerunt gentes (3. So. n. Epiphanie, Graduale + Alleluia) – Choral.pdf','Timebunt gentes nomen tuum (3. So. n. Epiphanie, Graduale + Alleluia) – Choral.pdf'],pos:'Graduale / Alleluia / Sequenz',fest:'3. So. n. Epiphanie',pages:[3],key:'Timuerunt gentes',label:'Graduale + Alleluia 3. So. n. Epiphanie'},
  {file:'Dextera Domini (3. So. n. Epiphanie) – Choral.pdf',old:['Dextera Domini (3. So. n. Epiphanie, Offertorium) – Choral.pdf','Dextera Domini fecit virtutem (3. So. n. Epiphanie, Offertorium) – Choral.pdf'],pos:'Offertorium',fest:'3. So. n. Epiphanie',pages:[4],key:'Dextera Domini',label:'Offertorium 3. So. n. Epiphanie'},
  {file:'Mirabantur omnes – Choral.pdf',old:['Mirabantur omnes (3. So. n. Epiphanie, Communio) – Choral.pdf'],pos:'Communio',fest:'3. So. n. Epiphanie',pages:[5],key:'Mirabantur omnes',label:'Communio 3. So. n. Epiphanie'},
  {file:'Mirabantur omnes – Orgel.pdf',old:['Mirabantur omnes (3. So. n. Epiphanie, Communio) – Orgel.pdf'],pos:'Communio',fest:'3. So. n. Epiphanie',pages:[6],key:'Mirabantur omnes',label:'Orgel Communio 3. So. n. Epiphanie'}]},
 {name:'Rosenkranzsonntag',src:'1Rht5rrptUh33HCz_y2At05-sMwG3FY8T',n:5,parts:[
  {file:'Gaudeamus... Mariae... solemnitate (aus Sammel-PDF) – Choral.pdf',old:['Gaudeamus (Rosenkranzsonntag, Introitus) – Choral.pdf','Gaudeamus omnes in Domino (Rosenkranzsonntag, Introitus) – Choral.pdf','Gaudeamus omnes in Domino (Rosenkranzsonntag) – Choral.pdf'],pos:'Introitus',fest:'Rosenkranzsonntag',pages:[0],key:'Gaudeamus... Mariae... solemnitate',entry:'Gaudeamus... Mariae... solemnitate',label:'Introitus Rosenkranzsonntag'},
  {file:'Propter veritatem – Choral.pdf',old:['Propter veritatem (Rosenkranzsonntag, Graduale) – Choral.pdf','Propter veritatem et mansuetudinem (Rosenkranzsonntag, Graduale) – Choral.pdf'],pos:'Graduale / Alleluia / Sequenz',fest:'Rosenkranzsonntag',pages:[1],key:'Propter veritatem',label:'Graduale Rosenkranzsonntag'},
  {file:'Solemnitas gloriosae Virginis – Choral.pdf',old:['Solemnitas gloriosae Virginis (Rosenkranzsonntag, Alleluia) – Choral.pdf','Solemnitas gloriosae Virginis Mariae (Rosenkranzsonntag, Alleluia) – Choral.pdf'],pos:'Graduale / Alleluia / Sequenz',fest:'Rosenkranzsonntag',pages:[2],key:'Solemnitas gloriosae Virginis',label:'Alleluia Rosenkranzsonntag'},
  {file:'In me gratia – Choral.pdf',old:['In me gratia (Rosenkranzsonntag, Offertorium) – Choral.pdf','In me gratia omnis viae (Rosenkranzsonntag, Offertorium) – Choral.pdf'],pos:'Offertorium',fest:'Rosenkranzsonntag',pages:[3],key:'In me gratia',label:'Offertorium Rosenkranzsonntag'},
  {file:'Florete flores – Choral.pdf',old:['Florete flores (Rosenkranzsonntag, Communio) – Choral.pdf','Florete flores quasi lilium (Rosenkranzsonntag, Communio) – Choral.pdf'],pos:'Communio',fest:'Rosenkranzsonntag',pages:[4],key:'Florete flores',label:'Communio Rosenkranzsonntag'}]}];
function loadPdfLib(){return window.PDFLib?Promise.resolve():new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js';s.onload=res;s.onerror=()=>rej(new Error('PDF-Bibliothek (pdf-lib) nicht ladbar'));document.head.appendChild(s)})}
const splNrm=t=>String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
function splFind(key){const k=splNrm(key),c=REG().filter(x=>x.art===SPL_ART&&!x.hide);
  return c.find(x=>splNrm(x.orig)===k)||c.find(x=>splNrm(x.orig).startsWith(k))||c.find(x=>{const o=splNrm(x.orig);return o.length>=7&&k.startsWith(o)})||null}
async function splitSammel(out){
  const say=t=>{out.innerHTML+=esc(t)+'<br>'};
  out.innerHTML='';
  if(!GD.cached()){toast('Bitte zuerst oben mit Google anmelden');return}
  regFixes(say);
  await GD.token(true); await loadPdfLib();
  let files=0,linked=0,made=0,fails=0;
  for(const job of SPLITS){
   try{
    say('— '+job.name+': lade Sammel-PDF …');
    let bytes=null,lastE=null;
    for(let t=0;t<4&&!bytes;t++){try{if(t){say('  neuer Versuch ('+(t+1)+'/4) …');await new Promise(r=>setTimeout(r,1500*t))}
      const rs=await GD.fetch('https://www.googleapis.com/drive/v3/files/'+job.src+'?alt=media',{},true);
      if(!rs.ok)throw new Error('Drive-Antwort '+rs.status+(rs.status===404?' (Datei nicht gefunden/kein Zugriff)':''));
      bytes=new Uint8Array(await (await rs.blob()).arrayBuffer())}catch(e){lastE=e}}
    if(!bytes)throw new Error('Download fehlgeschlagen: '+(lastE&&lastE.message||lastE));
    const src=await PDFLib.PDFDocument.load(bytes);
    if(src.getPageCount()<job.n) throw new Error('Quelle hat '+src.getPageCount()+' statt mind. '+job.n+' Seiten – übersprungen');
    const mkRes=[];
    for(const p of job.parts){
      const d=await PDFLib.PDFDocument.create(); const pgs=await d.copyPages(src,p.pages); pgs.forEach(pg=>d.addPage(pg));
      if(p.y){const pg=pgs[0];const {width:w,height:h}=pg.getSize();const top=h*(1-p.y[0]),bot=h*(1-p.y[1]);pg.setMediaBox(0,bot,w,top-bot);pg.setCropBox(0,bot,w,top-bot)}
      const data=await d.save();
      const q=new URLSearchParams({q:"name='"+p.file.replace(/'/g,"\\'")+"' and '"+SPL_FOLDER+"' in parents and trashed=false",fields:'files(id)',pageSize:'1'});
      let ex=((await (await GD.fetch('https://www.googleapis.com/drive/v3/files?'+q,{},true)).json()).files||[])[0],ren=false;
      if(!ex&&p.old){for(const on of p.old){const q2=new URLSearchParams({q:"name='"+on.replace(/'/g,"\\'")+"' and '"+SPL_FOLDER+"' in parents and trashed=false",fields:'files(id)',pageSize:'1'});ex=((await (await GD.fetch('https://www.googleapis.com/drive/v3/files?'+q2,{},true)).json()).files||[])[0];if(ex){await GD.fetch('https://www.googleapis.com/drive/v3/files/'+ex.id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:p.file})},true);ren=true;break}}}
      let id;
      if(ex){await GD.fetch('https://www.googleapis.com/upload/drive/v3/files/'+ex.id+'?uploadType=media',{method:'PATCH',headers:{'Content-Type':'application/pdf'},body:new Blob([data],{type:'application/pdf'})},true);id=ex.id}
      else{const b='spb'+Date.now();
        const body=new Blob(['--'+b+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify({name:p.file,parents:[SPL_FOLDER],mimeType:'application/pdf'})+'\r\n--'+b+'\r\nContent-Type: application/pdf\r\n\r\n',data,'\r\n--'+b+'--'],{type:'multipart/related; boundary='+b});
        id=(await (await GD.fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',{method:'POST',headers:{'Content-Type':'multipart/related; boundary='+b},body},true)).json()).id}
      say((ren?'umbenannt: ':ex?'aktualisiert: ':'gespeichert: ')+p.file); files++;
      mkRes.push({p,id})}
    for(const {p,id} of mkRes){
      let r=splFind(p.key);const lab=((mm)=>mm[3]+(mm[2]?' ('+mm[2]+')':''))(/^(.*?)(?: \((.*)\))? – (Choral|Orgel)\.pdf$/.exec(p.file));
      if(!r){const nm=p.entry||p.key;S.custom.push({art:SPL_ART,nr:'',name:nm});dbPut('eigene',regKey(SPL_ART,'',nm),{art:SPL_ART,nr:'',name:nm});r=REG().find(x=>x.art===SPL_ART&&x.orig===nm);made++;say('Neuer Eintrag im Register: '+nm)}
      if(!r){say('! Kein Registereintrag für '+p.key);continue}
      const ob=S.reg[r.key]=S.reg[r.key]||{}; const l=parseLinks(r.cn||'');
      if(r.name==='Timuerunt gentes'&&!ob.nm){ob.nm='Timebunt gentes';save();regPut(r.key)}
      if(!l.some(x=>x.u.includes(id))){l.push({l:lab,u:fileUrl(id)});ob.cn=lnkStr(l);save();regPut(r.key);linked++}
      else{const x=l.find(y=>y.u.includes(id));if(x&&x.l!==lab){x.l=lab;ob.cn=lnkStr(l);save();regPut(r.key)}}
      if(!r.po&&p.pos&&!ob.po){ob.po=p.pos;save();regPut(r.key)}
      {const fk=splNrm(p.fest.replace(/ \(.*\)/,''));if(p.fest&&!r.fe.some(x=>splNrm(x).includes(fk))){ob.fe=r.fe.concat(p.fest);save();regPut(r.key)}}
      say('verlinkt: '+lab+' → '+r.name)}
   }catch(e){fails++;say('! '+job.name+': '+(e&&e.message||e))}
  }
  for(const k in AUTO)delete AUTO[k];
  toast(files+' Dateien gespeichert, '+linked+' Links ergänzt'+(made?', '+made+' Eintrag neu':'')+(fails?', '+fails+' Fehler':''));
}



/* ---------- Register-Korrekturen (idempotent): Gaudeamus trennen, Libera me ---------- */
function regFixes(say){
  say=say||(()=>{});
  const A=SPL_ART, id=(u)=>(/\/d\/([\w-]+)/.exec(u)||[])[1]||'';
  const mk=(name)=>{let r=REG().find(x=>x.art===A&&x.orig===name);
    if(!r){S.custom.push({art:A,nr:'',name});dbPut('eigene',regKey(A,'',name),{art:A,nr:'',name});r=REG().find(x=>x.art===A&&x.orig===name);say('Neuer Eintrag im Register: '+name)}return r};
  const ob=r=>S.reg[r.key]=S.reg[r.key]||{};
  const put=r=>{save();regPut(r.key)};
  const cur=r=>REG().find(x=>x.key===r.key)||r;
  const addL=(r,f,fid,label)=>{r=cur(r);const o=ob(r),l=parseLinks(r[f]||'');
    if(l.some(x=>x.u.includes(fid))){const x=l.find(y=>y.u.includes(fid));if(cleanLab(x.l)!==cleanLab(label)){x.l=label;o[f]=lnkStr(l);put(r)}return}
    l.push({l:label,u:fileUrl(fid)});o[f]=lnkStr(l);put(r);say('verlinkt: '+label+' → '+r.name)};
  const delL=(r,f,fid)=>{r=cur(r);const l=parseLinks(r[f]||'');if(!l.some(x=>x.u.includes(fid)))return;const o=ob(r);
    const n=l.filter(x=>!x.u.includes(fid));o[f]=n.length?lnkStr(n):'-';put(r)};
  const setNm=(r,nm)=>{r=cur(r);const o=ob(r);if(r.name!==nm){o.nm=nm;put(r)}};
  const setTags=(r,po,fe)=>{r=cur(r);const o=ob(r);if(!r.po){o.po=po;put(r)}if(!r.fx&&!r.fe.length){o.fe=fe;put(r)}};
  /* Gaudeamus: Allerheiligen (Basis-Zeile) und Rosenkranzsonntag (Mariae solemnitate) getrennt */
  const g=REG().find(x=>x.art===A&&x.orig==='Gaudeamus'&&x.base);
  const m=mk('Gaudeamus... Mariae... solemnitate');
  if(m){setTags(m,'Introitus',['Rosenkranzsonntag']);
    addL(m,'cn','1epAsdtbJGpQuS8GLdGq40IyPrj6my4vW','Choral');
    addL(m,'cn','1-WXaDFV4AWr2WmiuZt1PleRtkihx1ikV','Choral (aus Sammel-PDF)');
    addL(m,'on','1dQH7eRFzMv_Gor6gorulTrBelcyAXjDX','Orgel');
    if(!cur(m).nt&&!ob(m).nt){ob(m).nt=fileUrl('1ADz1Zq_pOOXVWF2bwYE9rjloxmAYqkUO');put(m)}}
  if(g&&m){
    delL(g,'cn','1-WXaDFV4AWr2WmiuZt1PleRtkihx1ikV'); delL(g,'on','1dQH7eRFzMv_Gor6gorulTrBelcyAXjDX'); delL(g,'on','1stgZVmFNNHo6GTNyMMWzEPXd_D3QnE-p');
    {const gc=cur(g),bad=['Rosenkranzsonntag','Herz-Jesu-Freitag'];if(gc.fe.some(x=>bad.includes(x))){ob(g).fe=gc.fe.filter(x=>!bad.includes(x));put(g)}}
    setNm(g,'Gaudeamus... sanctorum omnium');
    const lc=parseLinks(cur(g).cn||''),x=lc.find(y=>y.u.includes('18KCl-rAaPXHV46nr7TL6U2DAJFSx-2iy'));if(x&&cleanLab(x.l)!==cleanLab('Choral')){x.l='Choral';ob(g).cn=lnkStr(lc);put(g)}
    const y=lc.find(z=>z.u.includes('16sshn07UU6ZXIb0vWdD9A0aN6cJ-Synn'));if(y&&cleanLab(y.l)!==cleanLab('Choral (aus Sammel-PDF)')){y.l='Choral (aus Sammel-PDF)';ob(g).cn=lnkStr(lc);put(g)}}
  /* Allerheiligen: nur dort getaggte Gesänge als feste Zuordnung (Override) führen, damit sie im Schola-Reiter / bei neuen Plänen erscheinen */
  REG().filter(x=>x.art===A&&!x.hide&&!x.fx&&x.fe.length===1&&x.fe[0]==='Allerheiligen (1.11.)').forEach(x=>{ob(x).fe=['Allerheiligen (1.11.)'];put(x);say('Allerheiligen zugeordnet: '+x.name)});
  /* gespeicherte Pläne: alter Gaudeamus-Titel */
  for(const k in S.termine){const t=S.termine[k];if(!t||!Array.isArray(t.rows))continue;let ch=false;
    t.rows.forEach(r=>{if(r&&r.t&&/^Gaudeamus\.\.\. (omnium sanctorum|Sanctorum omnium)$/.test(r.t.trim())){r.t='Gaudeamus... sanctorum omnium';ch=true}});
    if(ch){save();dbPut('termine',k)}}
  /* Orgel-PDFs, die im Choral-Feld standen: ins Orgel-Feld verschieben */
  ['1gr0A5-sbBiYzgqaTCp657IoGYs1UwphN','1q1b7nQ6Z8Duba0zPFmQb6P-K5IoihLss','1p1QpYrtOqvRo1mV-p5uxEh8-JRXxePdW','1aqWwntpr32L7bMszONJ8MRyDS5vk-lba','1vgX0Mny7bs4sXFEjZFUh_-Y7fa2IeIfo','1gmpKzaK0Iegx3Jl__Io5ua7y4GE5COUd','13rUw1k2BzXiFc79bqbPPb2bGVi19PesN'].forEach(fid=>{
    REG().filter(x=>x.art===A&&(x.cn||'').includes(fid)).forEach(x=>{delL(x,'cn',fid);addL(x,'on',fid,'Orgel');say('Orgel-PDF ins Orgel-Feld verschoben: '+x.name)})});
  /* Ecce virgo: doppelte Einträge zusammenführen */
  {const eb=REG().find(x=>x.art===A&&x.orig==='Ecce vírgo concípient'&&x.base), ed=REG().find(x=>x.art===A&&x.orig==='Ecce virgo concipiet'&&!x.base&&!x.hide);
   if(eb&&ed){addL(eb,'cn','1n82bo3MgZhCL0A1981kPcRHGGFfEjLjP','Choral');setNm(eb,'Ecce vírgo concípiet');ob(ed).hide=true;put(ed);say('Zusammengeführt: Ecce virgo concipiet → '+eb.name)}}
  /* Notator-Dateien, die noch nirgends verlinkt waren */
  [['Tantum ergo X (SR 469)',AG,'1QC8Rp3vskQay8HKOz_4TxfFqBMhJ9972'],['Libera me',A,'1wj5g4qO3N1ppeFinEVMl5LAEXjSlJR3q'],['Alleluia Pfingsten',A,'1Eth6CyzkJU1OWCHYfoApd_SaH2NSYOQf']].forEach(([key,art,fid])=>{
    const k=splNrm(key),c=REG().filter(x=>x.art===art&&!x.hide);const r=c.find(x=>splNrm(x.orig)===k)||c.find(x=>splNrm(x.orig).startsWith(k));
    if(r&&!cur(r).nt&&!ob(r).nt){ob(r).nt=fileUrl(fid);put(r);say('Notator-Datei verlinkt: '+r.name)}});
  /* Adorémus in aetérnum: Allerheiligen-Tag war falsch (steht in keinem Allerheiligen-Plan) */
  REG().filter(x=>x.art===A&&/^Adorémus in aetérnum/i.test(x.orig)&&x.fe.includes('Allerheiligen (1.11.)')).forEach(x=>{ob(x).fe=x.fe.filter(f=>f!=='Allerheiligen (1.11.)');put(x);say('Allerheiligen-Tag entfernt: '+x.name)});
  /* Libera me (Requiem, Absolutio) */
  let lm=REG().find(x=>x.art===A&&x.orig==='Libera me')||REG().find(x=>x.art===A&&x.orig==='Libera me, Domine, de morte aeterna');
  if(!lm)lm=mk('Libera me');
  if(lm){setNm(lm,'Libera me');setTags(lm,'Responsorium',['Requiem','Allerseelen (2.11.)'])}
}

/* ---------- Einmalig: bisher unverlinkte Dateien des Hauptordners im Register verlinken / Einträge anlegen ---------- */
const AS='Schola-Gesang (Proprium/Choral)', AO='Ordinarium / Credo / Asperges', AG='Gregorianische Gesänge (SR 410–500)';
const FLINKS=[
 ['1cFMp_1Mkf69_KMQPwS37RC8tJhH8MCfu',AS,'Ave maris stella','','cn','Choral'],
 ['1VGHrf785jtJxu22GUrC1GsRueDNJrULh',AS,'Ave maris stella','','cn','Choral (feierlich)'],
 ['1o-bVptz3AZDm8uDA6zYrPUY4cKdjKXWv',AS,'Ave maris stella','','cn','Choral (per annum, einfach)'],
 ['1i-MFalF77e3671SJqX8NLgDWKxff1iJP',AS,'Dies irae','','cn','Choral'],
 ['1mGQx9QCHW9DSsvU5ZT_y0Hl4auFWer30',AS,'Gloria et honore','','cn','Choral'],
 ['1aXEKTR07a47G-mtalfQMPwODLi8tKJox',AS,'Jubilate Deo','','cn','Choral','','Introitus','3. So. n. Ostern'],
 ['1X6eKdvsj2qY5veUGqzuBrpCNYuV1OZn0',AS,'Modicum','','cn','Choral','','Communio','3. So. n. Ostern'],
 ['1WVZoaFrcmRxjrjB54wrTvs1hCzVJdog4',AS,'Laetentur caeli','','cn','Choral','','Offertorium','Weihnachten – Mitternachtsmesse'],
 ['1dbjGAAJNfCjDbHa7iS_Ls2Gi6ljq8Sft',AS,'Magnificat','','cn','Choral'],
 ['1wnupCKLrZhoZmNR9yaFjlAoBpxGiOTsF',AS,'Te Deum (simplex)','','cn','Choral'],
 ['1kx2uS3LxA3QICEUeajklVpGzEEAeahud',AS,'Tota pulchra','','cn','Choral'],
 ['1hCGXh-WTxYEmwa6xzTmLv2eU25kqmVtY',AS,'Veni, veni Emmanuel','','cn','Choral'],
 ['1f9HG1aFRuDc8YaDY2XVguLYvgql9a1Kw',AS,'Taufgesang – Die ihr auf Christus seid getauft','','cn','Choral'],
 ['18Mwx-bmk3jifx9J0C1eKKXf6MW5KFpUY',AS,'Johannes-Passion (Karfreitag, deutsch)','','cn','Choral'],
 ['15XNBkwzT1KC1b7QYpCuHlJVheFYXQ1tA',AS,'Scapulis suis','','cn','Choral'],
 ['18CxRqX6MQDyP_KCg-X53E-IPQa0FW8bx',AS,'Sedebit','','cn','Choral','','Communio','Christkönig'],
 ['1HXB9Qy_pvWTLUalJYXn60A9M-88SJI7-',AS,'Unus militum','','cn','Choral','','Communio','Herz-Jesu-Freitag'],
 ['1bXIaeRWkkSipklNoYRtqw9MjoJVGs3HK',AS,'Cibavit eos','','cn','Choral'],
 ['1YBp7ntrZDt2jDq6aSiEDqa9aiNY4VFIE',AS,'Inimicitias','','cn','Choral','','Offertorium','Mariä Himmelfahrt (15.8.)'],
 ['11eb1GiN__82MW1Nbqioqr4Vw5ZNQZ81v',AS,'Dicite pusillanimes','','cn','Choral','','Communio','3. Advent'],
 ['1zergqcS1WGhviGb_IX3sZxa1csz4v_cR',AS,'Cogitationes','','cn','Choral','','Introitus','Herz-Jesu-Freitag'],
 ['1akxrWUrGJGOuByTPnjLsoSd-sfvtgpCv',AS,'Christus vincit','','cn','Choral'],
 ['1o1kT68IVNAnHfnbXxLaJ8o4HqOTRttJI',AS,'Hodie sci','Hodie sciétis','cn','Choral'],
 ['1TpfnrNKtSwjkJljx4LdT7dRtOrA_J7OF',AS,'Audi filia','Audi filia et vide','cn','Choral (Mariä Himmelfahrt)'],
 ['197VhDhLo5JXB_Ej92OfYzhg0F9FBT_aX',AS,'Alleluia Pfingsten','','cn','Choral'],
 ['1K1bqRmou69XjhRsj20MW_518TmLrsEf1',AS,'Alleluia Pfingsten','','cn','Choral (mit Satz vor Sequenz)'],
 ['1LE54OPjpm6MOv2VkjvabAHRiEIAG6iDV',AS,'Alleluia Pfingsten','','on','Orgel (mit Satz vor Sequenz)'],
 ['1za094brElVp7PzO2VIcYk_ZOTKecZcdx',AS,'Rorate caeli','','on','Orgel Introitus'],
 ['1lmmwSwhV75bwsLBH6KVDRzEODkE97apw',AS,'Ecce virgo concip','','on','Orgel Communio'],
 ['1V5O1VPYyHD8l6eOiVH354pfrlS8TK6MQ',AS,'Prope est Dominus','','on','Orgel Alleluia'],
 ['1s4Q15Lk4vrxC16fUccEqz0EVNR-ytC_o',AS,'Prope est Dominus','','on','Orgel Zwischengesänge'],
 ['1dddUZ7xJmbXu9aztz75OhBJgRNrbbP1s',AO,'Ite missa est, alleluja','','cn','Choral'],
 ['1gsxQEaLGuZ0Ui42tsCXn1z8O8ixAhFUX',AO,'Benedictus qui venit','','cn','Choral'],
 ['1W4XhaQX1ssLV7U3Pe4WSrCQEBotKwrm8',AO,'Credo IV','','on','Orgel','SR 428'],
 ['1pNg5OY8cV6yVxR5TycY17lYbJ0Ix-s1J',AG,'Salve Regina 1 (solemnis)','','cn','Choral','SR 480'],
 ['1tUGNEJ7bCKqosThnAYvS_DbWeIf43vfL',AG,'Tantum ergo V (SR 464)','Tantum ergo V','on','Orgel','SR 464'],
 ['1li597MceuUcO8UYCFsXFSBAuoz5cpNQF',AG,'Tantum ergo IX (SR 468)','Tantum ergo IX','on','Orgel','SR 468'],
 ['1kEHh--ELs-71TP84CkrFtuxsZzoZJrUx',AG,'Tantum ergo X (SR 469)','Tantum ergo X','on','Orgel','SR 469'],
 ['15C05enKcdTcgkFN1rM7s3fBYjkFktfZd',AS,'Libera me','Libera me','on','Orgel'],
 ['1fruVcmm_XdAa_JnQrZu0Gsaur4K50Z-F',AS,'Libera me','Libera me','cn','Choral'],
 ['1ND_fiSvz1BjvuwqzH63CwyN0yBcfnFGv',AS,'Mittit ad virginem','','on','Orgel'],
 ['1kGCIrC1w5spe4g0rKt_nD2LIeI6XPY4G',AG,'Tantum ergo V (SR 464)','Tantum ergo V','cn','Choral','SR 464'],
 ['1BvTnEcF2oULtJljaRwknf4VfAvNdjMHt',AG,'Tantum ergo IX (SR 468)','Tantum ergo IX','cn','Choral','SR 468'],
 ['12fn01s09v_Ccl5LQ8QScrcvDOoIYTZp1',AG,'Tantum ergo X (SR 469)','Tantum ergo X','cn','Choral','SR 469']];
function folderLinks(say){
  let made=0,linked=0;
  for(const [id,art,key,entry,f,label,nr,pos,fest] of FLINKS){
    const k=splNrm(key),c=REG().filter(x=>x.art===art&&!x.hide);
    let r=c.find(x=>splNrm(x.orig)===k)||c.find(x=>splNrm(x.orig).startsWith(k))||c.find(x=>{const o=splNrm(x.orig);return o.length>=7&&k.startsWith(o)});
    if(!r){const nm=entry||key;S.custom.push({art,nr:nr||'',name:nm});dbPut('eigene',regKey(art,nr||'',nm),{art,nr:nr||'',name:nm});r=REG().find(x=>x.art===art&&x.orig===nm);made++;say('Neuer Eintrag im Register: '+nm)}
    if(!r){say('! Kein Eintrag für '+key);continue}
    const ob=S.reg[r.key]=S.reg[r.key]||{}; const l=parseLinks(r[f]||'');
    if(pos&&!r.po&&!ob.po){ob.po=pos;save();regPut(r.key)}
    if(fest&&!r.fe.length&&!Array.isArray(ob.fe)){ob.fe=[fest];save();regPut(r.key)}
    if(l.some(x=>x.u.includes(id))){continue}
    l.push({l:label,u:fileUrl(id)}); ob[f]=lnkStr(l); save(); regPut(r.key); linked++;
    say('verlinkt: '+label+' → '+r.name)}
  for(const k in AUTO)delete AUTO[k];
  return {made,linked}}
async function linkFolderFiles(out){
  const say=t=>{out.innerHTML+=esc(t)+'<br>'};
  out.innerHTML='';
  regFixes(say);
  const {made,linked}=folderLinks(say);
  say(linked+' Links ergänzt, '+made+' Einträge neu.'); toast(linked+' Links ergänzt'+(made?', '+made+' Einträge neu':''));
}

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

/* --- Start --- */
document.addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(b){S.tab=b.dataset.tab;render();scrollTo(0,0)}});
// Beispielstart: nächster Termin ab heute
(function(){const today=new Date().toISOString().slice(0,10);const nx=EV.find(e=>e.d>=today&&e.a==='Sonntag')||EV[0];S.kj=nx.kj;S.sel=nx.key;S.tab='kj'})();
render();
shadowAll();
initDb();