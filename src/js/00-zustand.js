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
