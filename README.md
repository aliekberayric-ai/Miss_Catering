# Miss Catering

Mehrsprachige Catering-Website (DE / EN / TR) mit separaten Seiten, Paket-Planer, Preisberechnung, Rechnungs-Download, Galerie, Kontaktformular und Admin-Bereich.

## Kostenlos wie möglich

- **Frontend:** GitHub Pages
- **Datenbank / Login / Galerie / Archiv:** optional **Supabase Free**
- **Ohne Supabase:** Seite läuft trotzdem als Demo mit JSON + LocalStorage

## Seiten

- Startseite
- Über uns
- Mitarbeiter
- Preislisten
- Pakete
- Menü
- Galerie
- Kontakt
- Impressum
- Login
- Admin

## Schnellstart lokal

1. Ordner in VS Code öffnen
2. Erweiterung **Live Server** installieren
3. `index.html` starten

Alternativ im Projektordner:

```bash
python3 -m http.server 5500
```

Dann im Browser öffnen:

```text
http://localhost:5500
```

## Deployment auf GitHub Pages

1. Neues GitHub-Repository anlegen
2. Alle Dateien hochladen
3. In GitHub: **Settings > Pages**
4. Source: **Deploy from a branch**
5. Branch: **main** / Folder: **/(root)**
6. Speichern

## Optional: Supabase aktivieren

1. Supabase Projekt erstellen
2. SQL aus `sql/schema.sql` ausführen
3. In `assets/js/config.js` URL + Key eintragen
4. In Supabase Authentication Email/Password aktivieren
5. Admin-Benutzer registrieren
6. In Tabelle `profiles` die Rolle auf `admin` setzen

## Wichtiger Hinweis

- **Echte automatische E-Mail-Zustellung ohne Backend** ist auf GitHub Pages nicht sicher möglich.
- In diesem Projekt sind deshalb enthalten:
  - **mailto-Versand** für Angebots-/Bestellzusammenfassung
  - **lokales Rechnungsarchiv**
  - **optionales Speichern in Supabase**

Wenn du willst, kann man das im nächsten Schritt noch erweitern auf:
- PDF-Rechnung mit schönerem Layout
- echte Formularzustellung per Supabase Edge Function
- Sveltia/Decap CMS statt Supabase
