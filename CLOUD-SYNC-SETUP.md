# ☁️ CLOUD-SYNC SETUP - Multi-User Collaboration

## 🎯 Was Sie bekommen

Mit Cloud-Sync können **mehrere Personen gleichzeitig** an der Reiseplanung arbeiten:
- ✅ Gemeinsame Notizen für alle Reisetage
- ✅ Gemeinsame Bearbeitung des Reiseplans
- ✅ Automatische Synchronisation alle 30 Sekunden
- ✅ Jeder sieht die Änderungen der anderen
- ✅ Funktioniert auch offline (lokales Backup)

---

## 📋 Setup in 3 Schritten

### Schritt 1: Google Sheet erstellen

1. Gehen Sie zu https://sheets.google.com
2. Erstellen Sie ein neues Spreadsheet
3. Benennen Sie es: **"Mexiko Reise 2025 - Daten"**
4. Kopieren Sie die **Spreadsheet ID** aus der URL:
   ```
   https://docs.google.com/spreadsheets/d/HIER_IST_DIE_ID/edit
   ```

### Schritt 2: Google Apps Script deployen

1. **Apps Script öffnen:**
   - Gehen Sie zu https://script.google.com
   - Klicken Sie "Neues Projekt"
   - Benennen Sie es: "Mexiko Reise API"

2. **Code einfügen:**
   - Öffnen Sie die Datei `google-apps-script/Code.gs`
   - Kopieren Sie den GESAMTEN Code
   - Fügen Sie ihn in Apps Script ein
   - **WICHTIG:** Ersetzen Sie in Zeile 9:
     ```javascript
     const SHEET_ID = 'IHRE_SPREADSHEET_ID_HIER';
     ```
     Mit Ihrer echten Spreadsheet ID aus Schritt 1

3. **Deployen:**
   - Klicken Sie "Bereitstellen" → "Neue Bereitstellung"
   - Typ: "Web-App"
   - Ausführen als: "Ich"
   - Zugriff: "Jeder" (wichtig!)
   - Klicken Sie "Bereitstellen"
   - **Autorisieren** Sie die App (Google fragt nach Berechtigungen)
   - **KOPIEREN SIE DIE WEB-APP URL!**
     ```
     https://script.google.com/macros/s/IHRE_DEPLOYMENT_ID/exec
     ```

### Schritt 3: Frontend konfigurieren

1. Öffnen Sie `src/cloudAPI.js`
2. Ersetzen Sie in Zeile 7:
   ```javascript
   const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/IHRE_DEPLOYMENT_ID/exec';
   ```
   Mit Ihrer echten URL aus Schritt 2

3. Speichern und deployen:
   ```bash
   git add .
   git commit -m "Cloud-Sync aktiviert"
   git push
   ```

---

## ✅ Fertig!

Nach dem Deployment auf Netlify:

1. **Erste Person** öffnet die Webseite
2. Beim ersten Start wird nach dem **Namen** gefragt
3. Oben rechts erscheint: **☁️ Cloud** + **🟢 Online**
4. Alle können jetzt zusammen arbeiten!

---

## 🔄 So funktioniert die Sync

### Automatisch
- Alle **30 Sekunden** werden Änderungen synchronisiert
- **Notizen** werden sofort beim Tippen gespeichert
- **Dokument** muss manuell gespeichert werden (Button "☁️ In Cloud speichern")

### Manuell
- Klicken Sie **"🔄 Jetzt sync"** für sofortigen Sync
- Bei Problemen: Seite neu laden

### Online/Offline
- **☁️ Cloud + 🟢 Online** = Alles funktioniert
- **☁️ Cloud + 🔴 Offline** = Nur lokale Speicherung
- **💻 Lokal** = Keine Cloud-Sync (Button zum Umschalten)

---

## 👥 Multi-User Features

### Wer hat was geändert?
Im Google Sheet sehen Sie:
- **Spalte "Benutzer"**: Wer hat die Änderung gemacht
- **Spalte "Zeitstempel"**: Wann wurde geändert

### Konflikte vermeiden
- **Notizen**: Jeder Tag separat → keine Konflikte
- **Dokument**: "Last write wins" → Koordinieren Sie sich!
- **Tipp**: Teilen Sie auf - Person A macht Mexiko-Stadt, Person B macht Karibik

---

## 🛠️ Troubleshooting

### "🔴 Offline" obwohl Internet funktioniert?
→ Prüfen Sie die Apps Script URL in `src/cloudAPI.js`
→ Prüfen Sie ob Apps Script als "Jeder" berechtigt ist

### Änderungen werden nicht synchronisiert?
→ Klicken Sie "🔄 Jetzt sync"
→ Prüfen Sie Google Sheet - sind neue Zeilen da?
→ Browser-Konsole öffnen (F12) → Fehler prüfen

### "Autorisierung erforderlich"
→ Apps Script neu deployen
→ Berechtigungen erneut erteilen

### Nach Apps Script Änderungen: **IMMER NEU DEPLOYEN!**
1. "Bereitstellen" → "Bereitstellungen verwalten"
2. Bei Ihrer Bereitstellung auf "✏️ Bearbeiten"
3. Neue Version → "Bereitstellen"
4. **NEUE URL kopieren** und in `cloudAPI.js` eintragen

---

## 🔒 Sicherheit & Zugriff

### Wer kann zugreifen?
- Jeder mit der **Netlify URL** kann lesen
- Apps Script läuft mit **Ihren** Google-Berechtigungen
- **Sheet-Zugriff:** Nur Sie können das Sheet direkt öffnen

### Privatsphäre
- Alle Daten liegen in **Ihrem** Google Account
- **Kein externer Server** beteiligt
- Sie kontrollieren alle Daten

### Zugriff entziehen
- Apps Script Deployment löschen → API funktioniert nicht mehr
- Google Sheet löschen → Alle Daten weg
- Netlify Site löschen → Webseite offline

---

## 💡 Tipps für Teams

1. **Kommunizieren Sie!**
   - Sagen Sie Bescheid bevor Sie Dokument speichern
   - Nutzen Sie Notizen für Fragen/Kommentare

2. **Aufgaben verteilen:**
   - Person A: Mexiko-Stadt (Tag 1-12)
   - Person B: Karibik (Tag 13-22)
   - Person C: Restaurants & Buchungen

3. **Regelmäßig syncen:**
   - Vor größeren Änderungen "🔄 Jetzt sync" klicken
   - Nach Arbeit "☁️ In Cloud speichern" nicht vergessen

---

Viel Erfolg mit der gemeinsamen Reiseplanung! 🇲🇽🌮🏖️
