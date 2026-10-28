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

