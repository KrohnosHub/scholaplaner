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
