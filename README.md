# Schola-Planer St. Pelagiberg

Liederpläne und Scholaplanung als Web-App (GitHub Pages: https://krohnoshub.github.io/scholaplaner/).

- **Code** liegt in diesem (öffentlichen) Repo. **Daten** (Termine, Pläne, Register) liegen nicht hier, sondern in Google Drive (Notator-Ordner):
  - `Schola-Planer-Basis.json` – Kirchenjahr, Pläne-Archiv, Register-Grundlage (nur lesen, wird bei Bedarf neu erzeugt)
  - `Schola-Planer-Zustand.json` – Änderungen (Termine, Register-Links, eigene Einträge); neuester Stand pro Eintrag gewinnt
- Anmeldung: Google, gleiche Client-ID und gleicher Token wie Notator (gleicher Ursprung krohnoshub.github.io).
- Offline: Service Worker für die App-Hülle, Basisdaten in IndexedDB, Änderungen lokal bis zur nächsten Anmeldung.

## Entwicklung
`src/` enthält die Quellen (shell.html, style.css, body.html, boot.js, main.js). `python3 build.py` erzeugt `index.html` und setzt die Cache-Version in `sw.js` (Nummer in `VERSION` erhöhen).
Updates über Pull Requests (wie bei Notator).
