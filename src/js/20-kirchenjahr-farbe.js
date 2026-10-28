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

