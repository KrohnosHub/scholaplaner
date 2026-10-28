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

