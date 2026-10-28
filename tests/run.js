#!/usr/bin/env node
/* Einfache Tests ohne Abhängigkeiten: node tests/run.js
   Lädt src/js/*.js (ohne 99-start.js) in einen vm-Kontext mit minimalen Browser-Attrappen. */
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.join(__dirname,'..');
const files=fs.readdirSync(path.join(root,'src/js')).filter(f=>f.endsWith('.js')).sort();
let ok=0,fail=0;
const test=(n,f)=>{try{f();ok++;console.log('  ✓',n)}catch(e){fail++;console.log('  ✗',n,'\n    ',e&&e.message)}};

/* Syntaxprüfung des gesamten Skripts */
const all=files.map(f=>fs.readFileSync(path.join(root,'src/js',f),'utf8')).join('');
test('Syntax: gesamtes main.js (Konkatenation)',()=>{new vm.Script(all)});

/* Kontext mit Attrappen */
const stub=()=>new Proxy(function(){},{get:(t,k)=>k===Symbol.toPrimitive?()=>'':k==='length'?0:stub(),set:()=>true,apply:()=>stub()});
function makeCtx(D){
  const store={};
  const ctx={console,Date,Math,JSON,Set,Map,Array,Object,String,Number,RegExp,Promise,Intl,parseInt,parseFloat,isNaN,encodeURIComponent,decodeURIComponent,setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,
    localStorage:{getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]}},
    navigator:{},location:{reload(){}},innerWidth:1000,innerHeight:800,
    document:{addEventListener(){},getElementById:()=>null,querySelector:()=>stub(),querySelectorAll:()=>[],createElement:()=>stub(),body:stub(),documentElement:stub(),activeElement:null},
    window:{addEventListener(){},__D:D},
    GD:{cached:()=>null,token:()=>Promise.reject(new Error('offline')),fetch:()=>Promise.reject(new Error('offline')),find:()=>Promise.resolve(null),readJson:()=>Promise.resolve({}),writeJson:()=>Promise.resolve('x'),list:()=>Promise.resolve([])},
    idbGet:()=>Promise.resolve(undefined),idbSet:()=>Promise.resolve(),
    URL:{createObjectURL:()=>''},Blob:function(){},alert(){},confirm:()=>true,prompt:()=>''};
  ctx.window.window=ctx.window;ctx.__D=D;ctx.window.localStorage=ctx.localStorage;
  vm.createContext(ctx);
  files.filter(f=>!f.startsWith('99-')).forEach(f=>vm.runInContext(fs.readFileSync(path.join(root,'src/js',f),'utf8'),ctx,{filename:f}));
  return ctx;
}
const run=(ctx,code)=>vm.runInContext(code,ctx);

const events=JSON.parse(fs.readFileSync(path.join(__dirname,'events.json'),'utf8'));
const D={events,plans:[],chants:[],hym:[],ft:[],stand:'2026-01-01'};
let ctx;
try{ctx=makeCtx(D)}catch(e){console.log('Kontext konnte nicht aufgebaut werden:',e.stack);process.exit(1)}

console.log('Kirchenjahr-Regeln');
test('Ostertermine',()=>{const e=y=>new Date(run(ctx,`kjEaster(${y})`)).toISOString().slice(0,10);
  assert.equal(e(2026),'2026-04-05');assert.equal(e(2027),'2027-03-28');assert.equal(e(2028),'2028-04-16');assert.equal(e(2029),'2029-04-01')});
const gen=(ref,y)=>{ctx._ref=ref;return run(ctx,`genKJ(_ref,${y})`)};
const known={'2025/26':2025,'2026/27':2026,'2027/28':2027};
/* Sonntags-Sonderfälle der Basisdaten, die sich nicht aus den anderen Jahren ableiten lassen (Heiligenfeste, die am Sonntag weggelassen wurden) */
const EXPECT_DIFF=/Unschuldige Kinder|Kathedra Petri|Maria Königin|Mutterschaft Mariens|Hl\. Johannes, Apostel|2028-12-0[12]\|/;
for(const kj in known){
  test('Rückrechnung '+kj+' aus den beiden anderen Jahren',()=>{
    const real=events.filter(e=>e.kj===kj),g=gen(events.filter(e=>e.kj!==kj),known[kj]).events;
    const R=new Set(real.map(e=>e.d+'|'+e.n)),G=new Set(g.map(e=>e.d+'|'+e.n));
    const diff=[...G].filter(k=>!R.has(k)).map(k=>'+'+k).concat([...R].filter(k=>!G.has(k)).map(k=>'-'+k)).filter(k=>!EXPECT_DIFF.test(k));
    assert.deepEqual(diff,[]);
  })}
test('2028/29: Eckdaten',()=>{
  const g=gen(events,2028).events,by=n=>g.filter(e=>e.n===n).map(e=>e.d);
  assert.deepEqual(by('1. Advent'),['2028-12-03']);
  assert.deepEqual(by('Ostersonntag'),['2029-04-01']);
  assert.deepEqual(by('Pfingstsonntag'),['2029-05-20']);
  assert.deepEqual(by('Christkönig'),['2029-10-28']);
  assert.deepEqual(by('Letzter So. n. Pfingsten'),['2029-11-25']);
  assert.deepEqual(by('Mariä Verkündigung'),['2029-04-09'],'Verkündigung fällt auf Palmsonntag → Montag nach dem Weissen Sonntag');
  assert.deepEqual(g.filter(e=>/^Nachgeholter/.test(e.n)).map(e=>e.d),['2029-11-04','2029-11-11','2029-11-18']);
  assert.ok(g.every(e=>e.gen===1&&e.kj==='2028/29'));
});
test('Keine doppelten Termine (Datum+Name)',()=>{const g=gen(events,2028).events,k=g.map(e=>e.d+'|'+e.n);assert.equal(new Set(k).size,k.length)});

console.log('Register-Hilfsfunktionen');
test('norm: Akzente/Grossschreibung',()=>{assert.equal(run(ctx,"norm('Ecce vírgo Concípiet')"),run(ctx,"norm('ecce virgo concipiet')"))});
test('parseLinks/lnkStr: Rundlauf',()=>{const s='Choral|https://drive.google.com/file/d/AAA/view ; https://x.y/z';const o=run(ctx,`JSON.stringify(parseLinks(${JSON.stringify(s)}))`);const a=JSON.parse(o);assert.equal(a.length,2);assert.equal(a[0].l,'Choral');assert.equal(a[1].u,'https://x.y/z')});
test('posClass',()=>{assert.equal(run(ctx,"posClass('Introitus')"),'int');assert.equal(run(ctx,"posClass('Graduale/Alleluia')"),'gra');assert.equal(run(ctx,"posClass('Offertorium')"),'off');assert.equal(run(ctx,"posClass('Communio')"),'com')});
test('driveId',()=>{assert.equal(run(ctx,"driveId('https://drive.google.com/file/d/1AbC_-x/view?usp=sharing')"),'1AbC_-x');assert.equal(run(ctx,"driveId('https://example.com/a')"),null)});

console.log('Sync / Verlauf');
test('mergeIn: neuerer Stand gewinnt, lokal geänderte (dirty) bleiben',()=>{
  run(ctx,`S.termine={a:{upd:'2026-01-01',x:1},b:{upd:'2026-03-01',x:1}};S.reg={};S.custom=[];dirty.clear();dirty.add('termine\\tb');`);
  run(ctx,`mergeIn({termine:{a:{upd:'2026-02-01',x:2},b:{upd:'2026-04-01',x:2},c:{upd:'2026-01-01',x:3}},reg:{},custom:[]})`);
  assert.equal(run(ctx,'S.termine.a.x'),2,'remote neuer → übernommen');
  assert.equal(run(ctx,'S.termine.b.x'),1,'dirty → lokal behalten');
  assert.equal(run(ctx,'S.termine.c.x'),3,'neu → ergänzt');
});
test('mergeIn: älterer Remote-Stand überschreibt nicht',()=>{
  run(ctx,`S.reg={k:{upd:'2026-05-01',cn:'neu'}};dirty.clear();mergeIn({termine:{},reg:{k:{upd:'2026-01-01',cn:'alt'}},custom:[]})`);
  assert.equal(run(ctx,'S.reg.k.cn'),'neu')});
test('mergeIn: eigene Gesänge ohne Duplikate',()=>{
  run(ctx,`S.custom=[{art:'A',name:'N',nr:''}];mergeIn({termine:{},reg:{},custom:[{art:'A',name:'N'},{art:'A',name:'M'}]})`);
  assert.equal(run(ctx,'S.custom.length'),2)});
test('Änderungsverlauf: Zurücksetzen stellt vorherigen Stand her',()=>{
  run(ctx,`READONLY=false;localStorage.setItem('sp.hist','[]');S.reg={k1:{cn:'eins'}};shadowAll();`);
  run(ctx,`S.reg.k1={cn:'zwei'};dbPut('register','k1');`);
  assert.equal(run(ctx,`JSON.parse(localStorage.getItem('sp.hist')).length`),1);
  assert.equal(run(ctx,'histUndo(0)'),true);
  assert.equal(run(ctx,'S.reg.k1.cn'),'eins')});
test('Änderungsverlauf: Änderungen am selben Eintrag werden zusammengefasst',()=>{
  run(ctx,`localStorage.setItem('sp.hist','[]');S.reg={k2:{cn:'a'}};shadowAll();S.reg.k2={cn:'b'};dbPut('register','k2');S.reg.k2={cn:'c'};dbPut('register','k2');`);
  const h=JSON.parse(run(ctx,`localStorage.getItem('sp.hist')`));assert.equal(h.length,1);assert.equal(JSON.parse(h[0].b).cn,'a')});

console.log(`\n${ok} bestanden, ${fail} fehlgeschlagen`);
process.exit(fail?1:0);
