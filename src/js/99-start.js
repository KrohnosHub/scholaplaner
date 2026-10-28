/* --- Start --- */
document.addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(b){S.tab=b.dataset.tab;render();scrollTo(0,0)}});
// Beispielstart: nächster Termin ab heute
(function(){const today=new Date().toISOString().slice(0,10);const nx=EV.find(e=>e.d>=today&&e.a==='Sonntag')||EV[0];S.kj=nx.kj;S.sel=nx.key;S.tab='kj'})();
render();
shadowAll();
initDb();