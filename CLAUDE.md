# Schola-Planer – Hinweise für Claude

Web-App (GitHub Pages: https://krohnoshub.github.io/scholaplaner/) für Liederpläne und Scholaplanung. Daten liegen in Google Drive (Notator-Ordner), nicht im Repo.

## Kommunikation
- Deutsch (Schweizer Schreibweise: «ss» statt «ß»), kurz und konkret. Unsicherheiten offen benennen.
- Vor grösseren Umbauten Vorgehen kurz vorschlagen und bestätigen lassen.

## Code bearbeiten
- **Nie `index.html` direkt bearbeiten.** Quellen liegen in `src/` (`shell.html`, `style.css`, `body.html`, `gd-core.js`, `boot.js`, `js/NN-*.js` – Reihenfolge = Dateiname). `python3 build.py` erzeugt `index.html` und setzt die Cache-Version in `sw.js`.
- `src/gd-core.js` (Google-Anmeldung/Token/Drive-Fehler) ist eine **Kopie** von `shared/gd-core.js` aus dem Notator-Repo: nur dort ändern, dann hierher kopieren. Token-Schlüssel (`notatorGdToken`, `notatorGdHint`) und Meldungstexte («abgelaufen», «Nicht bei Google», «Drive-Fehler <Status>») werden in beiden Apps ausgewertet.

## Jede Änderung = neuer Build
1. **Vorher `git fetch origin main`** und auf dem neuesten Stand aufsetzen.
2. Nummer in `VERSION` erhöhen (höher als auf `origin/main`, nie doppelt).
3. `python3 build.py`, dann `node tests/run.js` (ohne Abhängigkeiten).
4. `python3 tools/check-version.py` prüft die Build-Nummer gegen `origin/main`.
5. Commit-Titel: `Build NN: Kurzbeschreibung`. Updates über Pull Requests.
Die GitHub Action «Tests» prüft bei jedem PR: Build aktuell, Tests grün, Build-Nummer höher als auf dem Ziel-Branch.

## Sicherheit
- Content-Security-Policy in `src/shell.html`: Inline-Skripte nur per Hash (trägt `build.py` ein). **Keine Inline-Event-Handler** (`onclick="…"` in HTML-Strings) – sie werden blockiert; `addEventListener` verwenden (Test prüft das).
- Neue externe Skripte/Hosts nur bewusst in der CSP ergänzen (`script-src`, `connect-src`, …).
- Daten aus Drive/Freigaben immer mit `esc()` einsetzen, nie roh per `innerHTML`.
- Das Google-Token hat Vollzugriff auf Drive (`auth/drive`, für Ordner-Freigaben nötig) und liegt im localStorage von `krohnoshub.github.io` (gemeinsam mit Notator und Gesangs-App): Eine Script-Injection in irgendeiner dieser Apps gefährdet das ganze Drive.
