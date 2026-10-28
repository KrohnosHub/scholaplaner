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
