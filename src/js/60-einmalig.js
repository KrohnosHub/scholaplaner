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

