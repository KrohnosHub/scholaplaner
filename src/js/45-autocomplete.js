/* ---------- Eigene Vorschlagsliste für das Titel-Feld im Ablauf (statt datalist; mit Hinweisen, durchsucht auch Nr., Feste, Datei-Namen) ---------- */
let _acBox=null,_acInp=null;
function acHide(){if(_acBox){_acBox.remove();_acBox=null}_acInp=null}
function acMatches(kind,val){
  const m=CAT[kind];if(!m)return [];
  const q=norm(val.trim()).split(/\s+/).filter(Boolean);
  if(!q.length){
    if(kind!=='G')return [];
    const C=window._rsCtx,ev=C&&C.ev;
    const as=ev&&ev.c?assignedTo(ev.c).map(r=>r.name):[];
    return as.filter(n=>m.has(n)).map(n=>[n,m.get(n)]).slice(0,8);
  }
  const out=[];
  for(const [v,x] of m){
    const hay=x.s||norm(v);
    if(q.every(w=>hay.includes(w))){
      const t=norm(v);out.push([v,x,t.startsWith(q[0])?0:t.includes(q[0])?1:2]);if(out.length>200)break}}
  out.sort((a,b)=>a[2]-b[2]||a[0].localeCompare(b[0],'de'));
  return out.slice(0,8);
}
function acShow(inp){
  const tr=inp.closest('tr');if(!tr)return acHide();
  const ksel=tr.querySelector('[data-f="k"]'),kind=ksel?ksel.value:'L';
  if(kind==='O')return acHide();
  const list=acMatches(kind==='G'?'G':'L',inp.value);
  if(!list.length)return acHide();
  if(!_acBox){_acBox=document.createElement('div');_acBox.className='acbox';document.body.appendChild(_acBox);
    _acBox.addEventListener('pointerdown',e=>{e.preventDefault()});
    _acBox.addEventListener('click',e=>{const b=e.target.closest('[data-v]');if(!b||!_acInp)return;
      const i=_acInp;i.value=b.dataset.v;acHide();i.dispatchEvent(new Event('change',{bubbles:true}))})}
  _acInp=inp;
  _acBox.innerHTML=list.map(([v,x])=>`<button type="button" class="aci" data-v="${esc(v)}"><b>${esc(x.t||v)}</b>${x.lab?`<small>${esc(x.lab)}</small>`:''}</button>`).join('');
  const r=inp.getBoundingClientRect(),vv=window.visualViewport,vh=vv?vv.height:innerHeight,off=vv?vv.offsetTop:0;
  const below=vh-(r.bottom-off)-8,above=r.top-off-8;
  _acBox.style.left=Math.max(4,r.left)+'px';_acBox.style.width=Math.min(r.width,innerWidth-8)+'px';
  if(below>=150||below>=above){_acBox.style.top=(r.bottom+2)+'px';_acBox.style.bottom='auto';_acBox.style.maxHeight=Math.max(110,below)+'px'}
  else{_acBox.style.bottom=(innerHeight-r.top+2)+'px';_acBox.style.top='auto';_acBox.style.maxHeight=Math.max(110,above)+'px'}
}
document.addEventListener('input',e=>{const t=e.target;if(t&&t.dataset&&t.dataset.f==='t'&&t.closest('#edb,#rsheet'))acShow(t)});
document.addEventListener('focusin',e=>{const t=e.target;if(t&&t.dataset&&t.dataset.f==='t'&&t.closest('#edb,#rsheet')){if(!t.value.trim())acShow(t)}else if(!(e.target.closest&&e.target.closest('.acbox')))acHide()});
document.addEventListener('focusout',e=>{if(e.target===_acInp)setTimeout(()=>{if(document.activeElement!==_acInp)acHide()},150)});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&_acBox){acHide();e.stopPropagation()}},true);
